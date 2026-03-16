from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
from models.models import User
from auth_utils import verify_password, get_password_hash, create_access_token, get_current_user, create_refresh_token, verify_refresh_token
import uuid

router = APIRouter()


class RegisterRequest(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    bio: str = ""


class LoginRequest(BaseModel):
    username: str  # username or email
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: dict


def user_to_dict(user: User) -> dict:
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "fullName": user.full_name,
        "bio": user.bio,
        "avatar": user.avatar,
        "status": user.status,
        "isAdmin": user.is_admin,
        "isActive": user.is_active,
        "lastSeen": user.last_seen.isoformat() + "Z" if user.last_seen else None,
        "lastLogin": user.last_login.isoformat() + "Z" if user.last_login else None,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
    }


@router.post("/register", response_model=TokenResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    # Check existing
    if db.query(User).filter(
        (User.username == data.username) | (User.email == data.email)
    ).first():
        raise HTTPException(status_code=400, detail="Username or email already exists")

    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    from datetime import datetime
    user = User(
        id=str(uuid.uuid4()),
        username=data.username.lower().strip(),
        email=data.email.lower().strip(),
        full_name=data.full_name.strip(),
        password_hash=get_password_hash(data.password),
        bio=data.bio,
        avatar=f"https://ui-avatars.com/api/?name={data.full_name.replace(' ', '+')}&background=random&color=fff",
        status="online",
        last_login=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})
    return {"access_token": token, "refresh_token": refresh_token, "token_type": "bearer", "user": user_to_dict(user)}


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.username == data.username.lower()) | (User.email == data.username.lower())
    ).first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Access denied. Your account has been banned.")

    from datetime import datetime
    
    # Update status to online only if currently offline or none. Keep custom statuses like busy/dnd/appear offline.
    if not user.status or user.status == "offline":
        user.status = "online"
    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})
    return {"access_token": token, "refresh_token": refresh_token, "token_type": "bearer", "user": user_to_dict(user)}

class RefreshRequest(BaseModel):
    refresh_token: str

class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: dict

@router.post("/refresh", response_model=RefreshResponse)
def refresh_token_endpoint(data: RefreshRequest, db: Session = Depends(get_db)):
    user_id = verify_refresh_token(data.refresh_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Access denied. Your account has been banned.")
        
    new_access_token = create_access_token({"sub": user.id})
    new_refresh_token = create_refresh_token({"sub": user.id})
    
    return {"access_token": new_access_token, "refresh_token": new_refresh_token, "token_type": "bearer", "user": user_to_dict(user)}


@router.post("/logout")
async def logout(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime
    
    # Update the DB synchronously so other components see them offline immediately
    current_user.status = "offline"
    current_user.last_seen = datetime.utcnow()
    db.commit()
    # If the app has the active websocket manager, broadcast their offline status proactively
    ws_manager = getattr(request.app.state, "ws_manager", None)
    if ws_manager:
        last_seen_str = datetime.utcnow().isoformat() + "Z"
        await ws_manager.broadcast_to_users(
            list(ws_manager.online_users()),
            {"type": "presence", "userId": current_user.id, "status": "offline", "lastSeen": last_seen_str}
        )
        # We can also proactively drop their sockets directly from the server
        for ws in list(ws_manager.active.get(current_user.id, [])):
            try:
                await ws.close()
            except Exception:
                pass
        if current_user.id in ws_manager.active:
            del ws_manager.active[current_user.id]

    return {"message": "Logged out successfully"}