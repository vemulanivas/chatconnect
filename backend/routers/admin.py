from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from database import get_db
from models.models import User, Conversation, Message, Notification, CallHistory
from auth_utils import get_current_user
import uuid


router = APIRouter()
ADMIN_USERNAME = "nivas"  # Only this user can be admin

def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.post("/setup-first-admin")
def setup_first_admin(db: Session = Depends(get_db)):
    """Promotes the 'nivas' account to admin. Only works if NO admins exist yet."""
    # Safety: only allow if there are zero admins in the system
    existing_admin = db.query(User).filter(User.is_admin == True).first()
    if existing_admin:
        raise HTTPException(status_code=403, detail="An admin already exists. Use the admin panel to promote users.")
    user = db.query(User).filter(User.username == ADMIN_USERNAME).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User '{ADMIN_USERNAME}' not found. Create that account first.")
    user.is_admin = True
    db.commit()
    return {"message": f"{user.full_name} is now admin"}


@router.post("/make-admin/{username}")
def make_admin_by_username(username: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """Promote a user to admin by username (requires admin auth)."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = True
    db.commit()
    return {"message": f"{user.full_name} promoted to admin"}



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


# ── Stats ──────────────────────────────────────────────────────────────────────
@router.get("/stats")
def get_stats(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_messages = db.query(Message).filter(Message.is_deleted == False).count()
    total_conversations = db.query(Conversation).count()
    flagged_messages = db.query(Message).filter(Message.is_flagged == True, Message.is_deleted == False).count()
    return {
        "totalUsers": total_users,
        "activeUsers": active_users,
        "totalMessages": total_messages,
        "totalConversations": total_conversations,
        "flaggedMessages": flagged_messages,
    }


# ── Users ──────────────────────────────────────────────────────────────────────
@router.get("/users")
def get_all_users(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [user_to_dict(u) for u in users]


@router.post("/users/{user_id}/ban")
def ban_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_admin:
        raise HTTPException(status_code=400, detail="Cannot ban an admin")
    user.is_active = False
    db.commit()
    return {"message": f"{user.full_name} banned"}


@router.post("/users/{user_id}/unban")
def unban_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.commit()
    return {"message": f"{user.full_name} unbanned"}


@router.post("/users/{user_id}/make-admin")
def make_admin(user_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = True
    db.commit()
    return {"message": f"{user.full_name} is now admin"}


@router.post("/users/{user_id}/revoke-admin")
def revoke_admin(user_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot revoke your own admin access")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.username == "nivas" and admin.username != "nivas":
        raise HTTPException(status_code=403, detail="Only nivas can revoke nivas admin")
    user.is_admin = False
    db.commit()
    return {"message": f"{user.full_name} admin access revoked"}


@router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    from models.models import Reaction, ReadReceipt, BlockedUser as BU, Notification as Notif

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    try:
        # Delete reactions by this user
        db.query(Reaction).filter(Reaction.user_id == user_id).delete(synchronize_session=False)
        # Delete read receipts by this user
        db.query(ReadReceipt).filter(ReadReceipt.user_id == user_id).delete(synchronize_session=False)
        # Delete notifications for this user
        db.query(Notif).filter(Notif.user_id == user_id).delete(synchronize_session=False)
        # Delete block records (both directions)
        db.query(BU).filter((BU.blocker_id == user_id) | (BU.blocked_id == user_id)).delete(synchronize_session=False)
        # Remove from all conversations
        db.execute(text("DELETE FROM conversation_participants WHERE user_id = :uid"), {"uid": user_id})
        # Soft-delete messages sent by this user
        db.query(Message).filter(Message.sender_id == user_id).update({"is_deleted": True}, synchronize_session=False)
        # Delete the user
        db.delete(user)
        db.commit()
        return {"message": f"{user.full_name} deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


@router.get("/users/{user_id}/calls")
def get_user_calls(user_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    calls = db.query(CallHistory).filter(
        CallHistory.caller_id == user_id
    ).order_by(CallHistory.started_at.desc()).limit(100).all()
    
    # We will build a simple dict representation for the admin
    res = []
    for c in calls:
        res.append({
            "id": c.id,
            "callType": c.call_type,
            "status": c.status,
            "duration": c.duration,
            "startedAt": c.started_at.isoformat() + "Z" if c.started_at else None,
            "endedAt": c.ended_at.isoformat() + "Z" if c.ended_at else None,
            "conversationId": c.conversation_id,
        })
    return res


@router.get("/conversations/{conv_id}/messages")
def get_conversation_messages(conv_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    messages = db.query(Message).filter(Message.conversation_id == conv_id).order_by(Message.created_at.desc()).limit(200).all()
    
    res = []
    for m in messages:
        sender_name = m.sender.full_name if m.sender else "Unknown"
        res.append({
            "id": m.id,
            "content": m.content,
            "type": m.type,
            "senderId": m.sender_id,
            "senderName": sender_name,
            "createdAt": m.created_at.isoformat() + "Z" if m.created_at else None,
            "isDeleted": m.is_deleted,
            "isFlagged": m.is_flagged
        })
    return res


# ── Messages (moderation) ──────────────────────────────────────────────────────
@router.get("/flagged-messages")
def get_flagged(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    msgs = db.query(Message).filter(
        Message.is_flagged == True,
        Message.is_deleted == False
    ).order_by(Message.created_at.desc()).all()
    return [
        {
            "id": m.id,
            "content": m.content,
            "senderId": m.sender_id,
            "senderName": m.sender.full_name if m.sender else "Unknown",
            "conversationId": m.conversation_id,
            "timestamp": (m.created_at.isoformat() + "Z") if m.created_at else None,
        }
        for m in msgs
    ]


@router.delete("/messages/{message_id}")
def admin_delete_message(message_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.is_deleted = True
    msg.content = "[Removed by admin]"
    msg.is_flagged = False
    db.commit()
    return {"message": "Message removed"}


@router.post("/messages/{message_id}/unflag")
def unflag_message(message_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.is_flagged = False
    db.commit()
    return {"message": "Message unflagged"}


# ── Conversations ──────────────────────────────────────────────────────────────
@router.get("/conversations")
def get_all_conversations(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    convs = db.query(Conversation).order_by(Conversation.created_at.desc()).all()
    return [
        {
            "id": c.id,
            "type": c.type,
            "name": c.name or "Direct Message",
            "participantCount": len(c.participants),
            "messageCount": db.query(Message).filter(
                Message.conversation_id == c.id,
                Message.is_deleted == False
            ).count(),
            "createdAt": c.created_at.isoformat() if c.created_at else None,
        }
        for c in convs
    ]


# ── Broadcast system message ────────────────────────────────────────────────────
class BroadcastRequest(BaseModel):
    message: str


@router.post("/broadcast")
async def broadcast_message(request: Request, data: BroadcastRequest, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    from models.models import conversation_participants
    from sqlalchemy import text as sql_text

    all_users = db.query(User).filter(User.is_active == True, User.id != admin.id).all()
    sent_count = 0
    ws_manager = getattr(request.app.state, "ws_manager", None)

    for user in all_users:
        try:
            # Find existing DM between admin and this user
            existing = db.query(Conversation).filter(
                Conversation.type == "dm",
                Conversation.participants.any(User.id == admin.id),
                Conversation.participants.any(User.id == user.id),
            ).first()

            if not existing:
                # Create new DM
                existing = Conversation(
                    id=str(uuid.uuid4()),
                    type="dm",
                    created_by=admin.id,
                )
                existing.participants.append(admin)
                existing.participants.append(user)
                db.add(existing)
                db.flush()  # get the ID without full commit

            # Send message in that DM
            from models.models import Message as Msg
            msg = Msg(
                id=str(uuid.uuid4()),
                conversation_id=existing.id,
                sender_id=admin.id,
                content=f"📢 {data.message}",
                type="text",
            )
            db.add(msg)

            # Push via WebSocket so the user sees it instantly in their chat
            if ws_manager:
                msg_dict = {
                    "id": msg.id,
                    "conversationId": existing.id,
                    "senderId": admin.id,
                    "senderName": admin.full_name,
                    "senderAvatar": admin.avatar or "",
                    "content": f"📢 {data.message}",
                    "type": "text",
                    "timestamp": msg.created_at.isoformat() + "Z" if msg.created_at else None,
                    "reactions": [],
                    "isDeleted": False,
                }
                try:
                    await ws_manager.send_to_user(user.id, {"type": "message", "message": msg_dict})
                except Exception:
                    pass

            sent_count += 1
        except Exception as e:
            print(f"[BROADCAST] Failed for user {user.id}: {e}")
            continue

    db.commit()
    return {"message": f"Broadcast sent to {sent_count} users as personal DM messages"}