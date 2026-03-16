from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models.models import User, Conversation, Message, Reaction, Notification, conversation_participants
from auth_utils import get_current_user
import uuid
from datetime import datetime

router = APIRouter()


def is_participant(db: Session, conversation_id: str, user_id: str) -> bool:
    result = db.execute(
        text("SELECT 1 FROM conversation_participants WHERE conversation_id=:cid AND user_id=:uid"),
        {"cid": conversation_id, "uid": user_id}
    ).first()
    return result is not None


def conv_exists(db: Session, conversation_id: str) -> bool:
    result = db.execute(
        text("SELECT 1 FROM conversations WHERE id=:cid"),
        {"cid": conversation_id}
    ).first()
    return result is not None


def msg_to_dict(msg: Message) -> dict:
    return {
        "id": msg.id,
        "conversationId": msg.conversation_id,
        "senderId": msg.sender_id,
        "senderName": msg.sender.full_name if msg.sender else "",
        "senderAvatar": msg.sender.avatar if msg.sender else "",
        "content": "[Message deleted]" if msg.is_deleted else msg.content,
        "type": msg.type,
        "fileUrl": msg.file_url,
        "fileName": msg.file_name,
        "fileSize": msg.file_size,
        "duration": msg.duration,
        "replyToId": msg.reply_to_id,
        "isEdited": msg.is_edited,
        "isDeleted": msg.is_deleted,
        "isPinned": msg.is_pinned,
        "isBookmarked": msg.is_bookmarked,
        "reactions": [
            {"id": r.id, "emoji": r.emoji, "userId": r.user_id}
            for r in (msg.reactions or [])
        ],
        "readBy": [
            rr.user_id for rr in (msg.read_receipts or [])
        ],
        "timestamp": (msg.created_at.isoformat() + "Z") if msg.created_at else None,
        "updatedAt": (msg.updated_at.isoformat() + "Z") if msg.updated_at else None,
    }


@router.get("/{conversation_id}")
def get_messages(
    conversation_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not conv_exists(db, conversation_id):
        raise HTTPException(status_code=404, detail=f"Conversation not found: {conversation_id}")

    if not is_participant(db, conversation_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a participant")

    msgs = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at.desc()).limit(limit).all()
    msgs.reverse()

    return [msg_to_dict(m) for m in msgs]


class SendMessageRequest(BaseModel):
    conversation_id: str
    content: Optional[str] = None
    type: str = "text"
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    duration: Optional[int] = None
    reply_to_id: Optional[str] = None


@router.post("/")
def send_message(
    data: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # Check conversation exists
    if not conv_exists(db, data.conversation_id):
        raise HTTPException(
            status_code=404,
            detail=f"Conversation '{data.conversation_id}' not found. Please start a new conversation."
        )

    # Check participant
    if not is_participant(db, data.conversation_id, current_user.id):
        raise HTTPException(status_code=403, detail="You are not a participant in this conversation")

    msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=data.conversation_id,
        sender_id=current_user.id,
        content=data.content,
        type=data.type,
        file_url=data.file_url,
        file_name=data.file_name,
        file_size=data.file_size,
        duration=data.duration,
        reply_to_id=data.reply_to_id,
    )
    db.add(msg)

    # Update conversation timestamp
    conv = db.query(Conversation).filter(Conversation.id == data.conversation_id).first()
    if conv:
        conv.updated_at = datetime.utcnow()

    # Notify other participants
    participants = db.execute(
        text("SELECT user_id FROM conversation_participants WHERE conversation_id=:cid"),
        {"cid": data.conversation_id}
    ).fetchall()

    for p in participants:
        if p[0] != current_user.id:
            notif = Notification(
                id=str(uuid.uuid4()),
                user_id=p[0],
                type="message",
                title=f"New message from {current_user.full_name}",
                body=data.content[:100] if data.content else f"Sent a {data.type}",
                conversation_id=data.conversation_id,
            )
            db.add(notif)

    db.commit()
    return msg_to_dict(msg)


class EditMessageRequest(BaseModel):
    content: str


@router.put("/{message_id}")
def edit_message(message_id: str, data: EditMessageRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot edit others' messages")
    msg.content = data.content
    msg.is_edited = True
    db.commit()
    db.refresh(msg)
    return msg_to_dict(msg)


@router.delete("/{message_id}")
def delete_message(message_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete others' messages")
    msg.is_deleted = True
    msg.content = None
    db.commit()
    return {"message": "Message deleted"}


class ReactionRequest(BaseModel):
    emoji: str


@router.post("/{message_id}/react")
async def react_to_message(
    message_id: str, 
    data: ReactionRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    existing = db.query(Reaction).filter(
        Reaction.message_id == message_id,
        Reaction.user_id == current_user.id,
        Reaction.emoji == data.emoji
    ).first()
    
    action = "added"
    if existing:
        db.delete(existing)
        db.commit()
        action = "removed"
    else:
        reaction = Reaction(id=str(uuid.uuid4()), message_id=message_id, user_id=current_user.id, emoji=data.emoji)
        db.add(reaction)
        db.commit()

    # Broadcast reaction to all conversation participants
    # Find participants
    participants = db.execute(
        text("SELECT user_id FROM conversation_participants WHERE conversation_id=:cid"),
        {"cid": msg.conversation_id}
    ).fetchall()
    
    participant_ids = [p[0] for p in participants]
    
    # We use a global helper or import manager. For now, we'll try to get it from app state
    # But since we don't have request object here, let's see how main exposes it.
    # Actually, we can just import the manager instance from main if it's defined globally.
    try:
        from main import manager
        await manager.broadcast_to_users(participant_ids, {
            "type": "reaction",
            "messageId": message_id,
            "conversationId": msg.conversation_id,
            "userId": current_user.id,
            "emoji": data.emoji,
            "action": action
        })
    except Exception as e:
        print(f"Failed to broadcast reaction: {e}")

    return {"action": action}


@router.post("/{message_id}/pin")
def toggle_pin(message_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.is_pinned = not msg.is_pinned
    db.commit()
    return {"pinned": msg.is_pinned}


@router.post("/{message_id}/bookmark")
def toggle_bookmark(message_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.is_bookmarked = not msg.is_bookmarked
    db.commit()
    return {"bookmarked": msg.is_bookmarked}


@router.get("/search/{conversation_id}")
def search_messages(
    conversation_id: str,
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not is_participant(db, conversation_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a participant")
    msgs = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.content.ilike(f"%{q}%"),
        Message.is_deleted == False
    ).order_by(Message.created_at.desc()).limit(30).all()
    return [msg_to_dict(m) for m in msgs]


@router.post("/{message_id}/flag")
def flag_message(message_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.is_flagged = True
    db.commit()
    return {"message": "Message flagged for review"}


@router.post("/{message_id}/read")
def mark_read(message_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models.models import ReadReceipt
    exists = db.query(ReadReceipt).filter(
        ReadReceipt.message_id == message_id,
        ReadReceipt.user_id == current_user.id
    ).first()
    if not exists:
        receipt = ReadReceipt(
            id=str(uuid.uuid4()),
            message_id=message_id,
            user_id=current_user.id
        )
        db.add(receipt)
        db.commit()
    return {"read": True}