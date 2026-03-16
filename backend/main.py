from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, get_db
from routers import auth, users, chats, messages, calls, notifications, admin
from models.models import User
from auth_utils import get_current_user
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import os, json
from datetime import datetime, timezone
from collections import defaultdict

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ChatConnect API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://chatconnect-b5c9amhye7gpdfeb.southeastasia-01.azurewebsites.net"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(chats.router, prefix="/api/chats", tags=["chats"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
app.include_router(calls.router, prefix="/api/calls", tags=["calls"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

class ConnectionManager:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active:
            if websocket in self.active[user_id]:
                self.active[user_id].remove(websocket)
            if not self.active[user_id]:
                del self.active[user_id]

    def online_users(self):
        return list(self.active.keys())

    async def send_to_user(self, user_id: str, data: dict):
        for ws in self.active.get(user_id, []):
            try:
                await ws.send_json(data)
            except Exception:
                pass

    async def broadcast_to_users(self, user_ids: list, data: dict):
        for uid in user_ids:
            await self.send_to_user(uid, data)

manager = ConnectionManager()
SECRET_KEY = os.getenv("SECRET_KEY", "chatconnect-super-secret-key-change-in-production")

def get_user_from_token(token: str, db: Session) -> User | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == user_id).first()
    except JWTError:
        return None

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    user = get_user_from_token(token, db)
    if not user:
        await websocket.close(code=4001)
        return

    user_id = user.id
    await manager.connect(websocket, user_id)

    if not user.status or user.status == "offline":
        user.status = "online"

    user.last_seen = datetime.now(timezone.utc)
    db.commit()

    await manager.broadcast_to_users(
        [uid for uid in manager.online_users() if uid != user_id],
        {"type": "presence", "userId": user_id, "status": user.status, "lastSeen": user.last_seen.isoformat() + "Z"}
    )

    try:
        while True:
            data = await websocket.receive_json()
            event = data.get("type")

            if event == "ping":
                await websocket.send_json({"type": "pong"})

            elif event == "typing":
                conv_id = data.get("conversationId")
                target_ids = data.get("targetUserIds", [])
                await manager.broadcast_to_users(target_ids, {
                    "type": "typing",
                    "userId": user_id,
                    "conversationId": conv_id,
                    "isTyping": data.get("isTyping", True)
                })

            elif event == "message":
                target_ids = data.get("targetUserIds", [])
                await manager.broadcast_to_users(target_ids, {
                    "type": "message",
                    "message": data.get("message"),
                })

            elif event == "read":
                target_ids = data.get("targetUserIds", [])
                await manager.broadcast_to_users(target_ids, {
                    "type": "read",
                    "userId": user_id,
                    "conversationId": data.get("conversationId"),
                    "messageId": data.get("messageId"),
                })

            elif event in ["call-offer", "call-answer", "call-ice-candidate", "call-end"]:
                target_ids = data.get("targetUserIds", [])
                payload = dict(data)
                payload["type"] = event
                payload["callerId"] = user_id
                await manager.broadcast_to_users(target_ids, payload)

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        if user_id not in manager.active:
            try:
                from database import SessionLocal
                with SessionLocal() as fresh_db:
                    u = fresh_db.query(User).filter(User.id == user_id).first()
                    if u:
                        u.status = "offline"
                        u.last_seen = datetime.now(timezone.utc)
                        fresh_db.commit()
            except Exception:
                pass

            last_seen_str = datetime.now(timezone.utc).isoformat() + "Z"
            await manager.broadcast_to_users(
                list(manager.online_users()),
                {"type": "presence", "userId": user_id, "status": "offline", "lastSeen": last_seen_str}
            )

app.state.ws_manager = manager

@app.get("/health")
@app.get("/api/health")
def health(debug: str = None):
    return {"status": "ok", "online_users": len(manager.online_users())}

@app.get("/api/online-users")
def online_users():
    return {"onlineUsers": manager.online_users()}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_BUILD_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "build"))
STATIC_DIR = os.path.join(FRONTEND_BUILD_DIR, "static")

try:
    if os.path.exists(STATIC_DIR):
        app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
except RuntimeError:
    pass

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    if not full_path or full_path.startswith("api/") or full_path in ["docs", "redoc", "openapi.json"] or full_path.startswith("docs/"):
        if not full_path:
            index_path = os.path.join(FRONTEND_BUILD_DIR, "index.html")
            if os.path.isfile(index_path):
                return FileResponse(index_path)
            return {"message": "ChatConnect API v2 is running on Azure, but the frontend build is missing."}
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not Found")

    requested_file = os.path.join(FRONTEND_BUILD_DIR, full_path)
    if os.path.isfile(requested_file):
        return FileResponse(requested_file)

    index_path = os.path.join(FRONTEND_BUILD_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
        
    return {"message": "ChatConnect API v2 is running on Azure, but the frontend build is missing."}
