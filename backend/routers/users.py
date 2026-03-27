from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from database import get_db
from models.models import User, BlockedUser
from auth_utils import get_current_user
import uuid

router = APIRouter()


def user_to_dict(user: User, blocked_ids: List[str] = None) -> dict:
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


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return user_to_dict(current_user)


@router.post("/refresh-me")
def refresh_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Force fresh read of current user from DB - call after admin promotion"""
    db.refresh(current_user)
    return user_to_dict(current_user)


@router.get("/")
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Get IDs that the current user has blocked (only outgoing blocks)
    blocked = db.query(BlockedUser).filter(
        BlockedUser.blocker_id == current_user.id
    ).all()
    blocked_ids = set(b.blocked_id for b in blocked)

    users = db.query(User).filter(User.id != current_user.id).all()
    return [
        {**user_to_dict(u), "isBlocked": u.id in blocked_ids}
        for u in users
    ]


@router.get("/search")
def search_users(q: str = "", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Search users by full name for starting new conversations."""
    if not q or len(q.strip()) < 1:
        return []
    
    blocked = db.query(BlockedUser).filter(
        BlockedUser.blocker_id == current_user.id
    ).all()
    blocked_ids = set(b.blocked_id for b in blocked)
    
    from sqlalchemy import func, or_
    search_q = f"%{q.strip().lower()}%"
    users = db.query(User).filter(
        User.id != current_user.id,
        or_(
            func.lower(func.coalesce(User.full_name, '')).like(search_q),
            func.lower(func.coalesce(User.username, '')).like(search_q)
        )
    ).limit(20).all()
    
    return [
        {**user_to_dict(u), "isBlocked": u.id in blocked_ids}
        for u in users
        if u.id not in blocked_ids
    ]


class UpdateProfileRequest(BaseModel):
    full_name: str = None
    bio: str = None
    status: str = None
    avatar: str = None


@router.put("/me")
async def update_profile(data: UpdateProfileRequest, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.full_name is not None:
        current_user.full_name = data.full_name
    if data.bio is not None:
        current_user.bio = data.bio
    
    status_changed = False
    if data.status is not None and data.status != current_user.status:
        current_user.status = data.status
        status_changed = True
        
    if data.avatar is not None:
        current_user.avatar = data.avatar
    
    db.commit()
    db.refresh(current_user)
    
    if status_changed:
        ws_manager = getattr(request.app.state, "ws_manager", None)
        if ws_manager:
            last_seen_str = current_user.last_seen.isoformat() + "Z" if current_user.last_seen else None
            # Broadcast the new presence status to all online users
            await ws_manager.broadcast_to_users(
                list(ws_manager.online_users()),
                {"type": "presence", "userId": current_user.id, "status": current_user.status, "lastSeen": last_seen_str}
            )
            
    return user_to_dict(current_user)


class BlockRequest(BaseModel):
    user_id: str


@router.post("/block")
def block_user(data: BlockRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")

    existing = db.query(BlockedUser).filter(
        BlockedUser.blocker_id == current_user.id,
        BlockedUser.blocked_id == data.user_id
    ).first()

    if existing:
        return {"message": "User already blocked"}

    block = BlockedUser(
        id=str(uuid.uuid4()),
        blocker_id=current_user.id,
        blocked_id=data.user_id
    )
    db.add(block)
    db.commit()
    return {"message": "User blocked successfully"}


@router.post("/unblock")
def unblock_user(data: BlockRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    block = db.query(BlockedUser).filter(
        BlockedUser.blocker_id == current_user.id,
        BlockedUser.blocked_id == data.user_id
    ).first()

    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    db.delete(block)
    db.commit()
    return {"message": "User unblocked successfully"}


@router.get("/blocked")
def get_blocked_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    blocks = db.query(BlockedUser).filter(BlockedUser.blocker_id == current_user.id).all()
    blocked_ids = [b.blocked_id for b in blocks]
    blocked_users = db.query(User).filter(User.id.in_(blocked_ids)).all()
    return [user_to_dict(u) for u in blocked_users]