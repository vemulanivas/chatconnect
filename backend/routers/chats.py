from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models.models import User, Conversation, Message, conversation_participants, BlockedUser
from auth_utils import get_current_user
import uuid

router = APIRouter()


def conv_to_dict(conv: Conversation, current_user_id: str, db: Session) -> dict:
    participants = [
        {
            "id": p.id,
            "username": p.username,
            "fullName": p.full_name,
            "avatar": p.avatar,
            "status": p.status,
            "lastSeen": p.last_seen.isoformat() + "Z" if p.last_seen else None,
            "lastLogin": p.last_login.isoformat() + "Z" if p.last_login else None,
        }
        for p in conv.participants
    ]
    # Last message
    last_msg = db.query(Message).filter(
        Message.conversation_id == conv.id,
        Message.is_deleted == False
    ).order_by(Message.created_at.desc()).first()

    last_message = None
    if last_msg:
        last_message = {
            "content": last_msg.content if not last_msg.is_deleted else "Message deleted",
            "type": last_msg.type,
            "senderId": last_msg.sender_id,
            "timestamp": last_msg.created_at.isoformat() + "Z",
        }

    # Unread count: messages not sent by current user with no read receipt from them
    from models.models import ReadReceipt
    unread_count = db.query(Message).filter(
        Message.conversation_id == conv.id,
        Message.sender_id != current_user_id,
        Message.is_deleted == False,
        ~Message.read_receipts.any(ReadReceipt.user_id == current_user_id)
    ).count()

    return {
        "id": conv.id,
        "type": conv.type,
        "name": conv.name,
        "description": conv.description,
        "avatar": conv.avatar,
        "createdBy": conv.created_by,
        "createdAt": conv.created_at.isoformat() if conv.created_at else None,
        "updatedAt": conv.updated_at.isoformat() if conv.updated_at else None,
        "participants": participants,
        "lastMessage": last_message,
        "unreadCount": unread_count,
    }


@router.get("/")
def get_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    convs = db.query(Conversation).filter(
        Conversation.participants.any(User.id == current_user.id)
    ).order_by(Conversation.updated_at.desc()).all()
    return [conv_to_dict(c, current_user.id, db) for c in convs]


class CreateDMRequest(BaseModel):
    user_id: str


@router.post("/dm")
def create_or_get_dm(data: CreateDMRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot create DM with yourself")

    other_user = db.query(User).filter(User.id == data.user_id).first()
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if DM already exists
    existing = db.query(Conversation).filter(
        Conversation.type == "dm",
        Conversation.participants.any(User.id == current_user.id),
        Conversation.participants.any(User.id == data.user_id),
    ).first()

    if existing:
        return conv_to_dict(existing, current_user.id, db)

    # Create new DM
    conv = Conversation(
        id=str(uuid.uuid4()),
        type="dm",
        created_by=current_user.id,
    )
    conv.participants.append(current_user)
    conv.participants.append(other_user)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv_to_dict(conv, current_user.id, db)


class CreateGroupRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    participant_ids: List[str]
    type: str = "group"  # group or channel


@router.post("/")
def create_conversation(data: CreateGroupRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = Conversation(
        id=str(uuid.uuid4()),
        type=data.type,
        name=data.name,
        description=data.description,
        created_by=current_user.id,
        avatar=f"https://ui-avatars.com/api/?name={data.name.replace(' ', '+')}&background=random&color=fff",
    )
    conv.participants.append(current_user)

    for uid in data.participant_ids:
        if uid != current_user.id:
            user = db.query(User).filter(User.id == uid).first()
            if user:
                conv.participants.append(user)

    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv_to_dict(conv, current_user.id, db)


@router.get("/{conv_id}")
def get_conversation(conv_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if current_user not in conv.participants:
        raise HTTPException(status_code=403, detail="Not a participant")

    return conv_to_dict(conv, current_user.id, db)


@router.delete("/{conv_id}")
async def delete_conversation(conv_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models.models import Reaction, ReadReceipt, Notification, CallHistory

    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Allow any participant or creator to delete
    participant_ids = [p.id for p in conv.participants]
    if current_user.id not in participant_ids and conv.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this conversation")

    try:
        # 1. Delete notifications referencing this conversation
        db.query(Notification).filter(Notification.conversation_id == conv_id).delete(synchronize_session=False)

        # 2. Clear conversation_id from call history (keep logs but unlink)
        db.query(CallHistory).filter(CallHistory.conversation_id == conv_id).update({"conversation_id": None}, synchronize_session=False)

        # 3. Get all message IDs to clean up reactions/receipts
        msg_ids = [m[0] for m in db.query(Message.id).filter(Message.conversation_id == conv_id).all()]

        if msg_ids:
            # 4. Delete read receipts for these messages
            db.query(ReadReceipt).filter(ReadReceipt.message_id.in_(msg_ids)).delete(synchronize_session=False)
            # 5. Delete reactions for these messages
            db.query(Reaction).filter(Reaction.message_id.in_(msg_ids)).delete(synchronize_session=False)
            # 6. Delete all messages
            db.query(Message).filter(Message.conversation_id == conv_id).delete(synchronize_session=False)

        # 7. Remove participants from association table
        # (Handled automatically by SQLAlchemy since the participants are loaded in memory)
        conv.participants.clear()

        # 8. Finally delete the conversation
        db.delete(conv)
        db.commit()
        return {"success": True, "message": "Conversation deleted successfully"}
    except Exception as e:
        db.rollback()
        print(f"Delete failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")


class MemberRequest(BaseModel):
    user_id: str


@router.post("/{conv_id}/add-member")
def add_member(conv_id: str, data: MemberRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Group not found")
    if conv.type == "dm":
        raise HTTPException(status_code=400, detail="Cannot add members to a DM")
    # Only group creator can add
    if conv.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the group creator can add members")
    new_user = db.query(User).filter(User.id == data.user_id).first()
    if not new_user:
        raise HTTPException(status_code=404, detail="User not found")
    # Check if already a member
    already = db.execute(
        text("SELECT 1 FROM conversation_participants WHERE conversation_id=:cid AND user_id=:uid"),
        {"cid": conv_id, "uid": data.user_id}
    ).first()
    if already:
        raise HTTPException(status_code=400, detail="User is already a member")
    db.execute(
        text("INSERT INTO conversation_participants (conversation_id, user_id) VALUES (:cid, :uid)"),
        {"cid": conv_id, "uid": data.user_id}
    )
    db.commit()
    # Expire ALL cached ORM objects so fresh DB state is loaded
    db.expire_all()
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    return conv_to_dict(conv, current_user.id, db)


@router.delete("/{conv_id}/remove-member/{user_id}")
def remove_member(conv_id: str, user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Group not found")
    if conv.created_by != current_user.id and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the group creator can remove members")
    db.execute(
        text("DELETE FROM conversation_participants WHERE conversation_id=:cid AND user_id=:uid"),
        {"cid": conv_id, "uid": user_id}
    )
    db.commit()
    db.expire_all()
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    return conv_to_dict(conv, current_user.id, db) if conv else {"message": "Member removed"}


class MarkReadRequest(BaseModel):
    conversation_id: str

@router.post("/mark-read")
def mark_conversation_read(data: MarkReadRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Mark all messages in a conversation as read for current user."""
    from models.models import ReadReceipt
    # Get all unread messages in this conversation not sent by current user
    unread_msgs = db.query(Message).filter(
        Message.conversation_id == data.conversation_id,
        Message.sender_id != current_user.id,
        Message.is_deleted == False,
        ~Message.read_receipts.any(ReadReceipt.user_id == current_user.id)
    ).all()

    for msg in unread_msgs:
        receipt = ReadReceipt(
            id=str(uuid.uuid4()),
            message_id=msg.id,
            user_id=current_user.id,
        )
        db.add(receipt)

    db.commit()
    return {"marked": len(unread_msgs)}
