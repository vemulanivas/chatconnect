from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from models.models import User, Conversation, Message, Reaction, Notification, conversation_participants, Poll, PollVote
from auth_utils import get_current_user
import uuid
import json
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


def msg_to_dict(msg: Message, db: Session = None) -> dict:
    # Count replies (thread count)
    reply_count = 0
    if db:
        reply_count = db.query(Message).filter(
            Message.reply_to_id == msg.id,
            Message.is_deleted == False
        ).count()
    
    # Parse mentions JSON
    mentions_list = []
    if msg.mentions:
        try:
            mentions_list = json.loads(msg.mentions)
        except (json.JSONDecodeError, TypeError):
            pass
    
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
        "replyCount": reply_count,
        "isEdited": msg.is_edited,
        "isDeleted": msg.is_deleted,
        "isPinned": msg.is_pinned,
        "isBookmarked": msg.is_bookmarked,
        "priority": getattr(msg, 'priority', 'normal') or 'normal',
        "mentions": mentions_list,
        "reactions": [
            {"id": r.id, "emoji": r.emoji, "userId": r.user_id}
            for r in (msg.reactions or [])
        ],
        "readBy": [
            rr.user_id for rr in (msg.read_receipts or [])
        ],
        "timestamp": (msg.created_at.isoformat() + "Z") if msg.created_at else None,
        "updatedAt": (msg.updated_at.isoformat() + "Z") if msg.updated_at else None,
        **({"poll": poll_to_dict(
            db.query(Poll).filter(Poll.message_id == msg.id).first(), db
        )} if db and msg.type == "poll" and db.query(Poll).filter(Poll.message_id == msg.id).first() else {}),
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

    return [msg_to_dict(m, db) for m in msgs]


class SendMessageRequest(BaseModel):
    conversation_id: str
    content: Optional[str] = None
    type: str = "text"
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    duration: Optional[int] = None
    reply_to_id: Optional[str] = None
    priority: Optional[str] = "normal"
    mentions: Optional[list] = []


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
        priority=data.priority or "normal",
        mentions=json.dumps(data.mentions) if data.mentions else None,
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

    mention_ids = set(data.mentions or [])
    
    for p in participants:
        if p[0] != current_user.id:
            # Create mention notification if user was mentioned
            if p[0] in mention_ids:
                notif = Notification(
                    id=str(uuid.uuid4()),
                    user_id=p[0],
                    type="mention",
                    title=f"{current_user.full_name} mentioned you",
                    body=data.content[:100] if data.content else "Mentioned you in a message",
                    conversation_id=data.conversation_id,
                )
                db.add(notif)
            else:
                # Regular message notification
                notif_title = f"New message from {current_user.full_name}"
                if data.priority == "urgent":
                    notif_title = f"🔴 URGENT from {current_user.full_name}"
                elif data.priority == "important":
                    notif_title = f"❗ Important from {current_user.full_name}"
                    
                notif = Notification(
                    id=str(uuid.uuid4()),
                    user_id=p[0],
                    type="message",
                    title=notif_title,
                    body=data.content[:100] if data.content else f"Sent a {data.type}",
                    conversation_id=data.conversation_id,
                )
                db.add(notif)

    db.commit()
    return msg_to_dict(msg, db)


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
    return msg_to_dict(msg, db)


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
    return [msg_to_dict(m, db) for m in msgs]


@router.get("/{message_id}/thread")
def get_thread(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all replies to a specific message (thread)."""
    parent_msg = db.query(Message).filter(Message.id == message_id).first()
    if not parent_msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if not is_participant(db, parent_msg.conversation_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a participant")
    
    replies = db.query(Message).filter(
        Message.reply_to_id == message_id,
        Message.is_deleted == False
    ).order_by(Message.created_at.asc()).all()
    
    return {
        "parent": msg_to_dict(parent_msg, db),
        "replies": [msg_to_dict(r, db) for r in replies]
    }


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


# ── POLLS ──
class CreatePollRequest(BaseModel):
    conversation_id: str
    question: str
    options: List[str]
    is_anonymous: bool = False
    allow_multiple: bool = False


@router.post("/poll")
def create_poll(
    data: CreatePollRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not conv_exists(db, data.conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    if not is_participant(db, data.conversation_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a participant")
    if len(data.options) < 2:
        raise HTTPException(status_code=400, detail="Poll must have at least 2 options")
    if len(data.options) > 10:
        raise HTTPException(status_code=400, detail="Poll can have at most 10 options")

    # Create a message of type 'poll'
    msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=data.conversation_id,
        sender_id=current_user.id,
        content=f"📊 Poll: {data.question}",
        type="poll",
        priority="normal",
    )
    db.add(msg)
    db.flush()  # Get the message ID

    poll = Poll(
        id=str(uuid.uuid4()),
        message_id=msg.id,
        question=data.question,
        options=json.dumps(data.options),
        is_anonymous=data.is_anonymous,
        allow_multiple=data.allow_multiple,
        created_by=current_user.id,
    )
    db.add(poll)

    # Update conversation timestamp
    conv = db.query(Conversation).filter(Conversation.id == data.conversation_id).first()
    if conv:
        conv.updated_at = datetime.utcnow()

    db.commit()
    
    return {
        **msg_to_dict(msg, db),
        "poll": poll_to_dict(poll, db)
    }


def poll_to_dict(poll: Poll, db: Session = None) -> dict:
    options = json.loads(poll.options)
    votes = poll.votes or []
    
    # Count votes per option
    vote_counts = {}
    voters_per_option = {}
    for v in votes:
        vote_counts[v.option_index] = vote_counts.get(v.option_index, 0) + 1
        if v.option_index not in voters_per_option:
            voters_per_option[v.option_index] = []
        if not poll.is_anonymous:
            voter_user = db.query(User).filter(User.id == v.user_id).first() if db else None
            voters_per_option[v.option_index].append({
                "userId": v.user_id,
                "fullName": voter_user.full_name if voter_user else "Unknown"
            })
    
    total_votes = sum(vote_counts.values())
    
    return {
        "id": poll.id,
        "messageId": poll.message_id,
        "question": poll.question,
        "options": [
            {
                "index": i,
                "text": opt,
                "votes": vote_counts.get(i, 0),
                "percentage": round((vote_counts.get(i, 0) / total_votes * 100) if total_votes > 0 else 0, 1),
                "voters": voters_per_option.get(i, []) if not poll.is_anonymous else []
            }
            for i, opt in enumerate(options)
        ],
        "totalVotes": total_votes,
        "isAnonymous": poll.is_anonymous,
        "allowMultiple": poll.allow_multiple,
        "createdBy": poll.created_by,
        "createdAt": poll.created_at.isoformat() + "Z" if poll.created_at else None,
    }


class VotePollRequest(BaseModel):
    option_index: int


@router.post("/poll/{poll_id}/vote")
def vote_poll(
    poll_id: str,
    data: VotePollRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    options = json.loads(poll.options)
    if data.option_index < 0 or data.option_index >= len(options):
        raise HTTPException(status_code=400, detail="Invalid option index")
    
    # Check if user already voted for this option
    existing_vote = db.query(PollVote).filter(
        PollVote.poll_id == poll_id,
        PollVote.user_id == current_user.id,
        PollVote.option_index == data.option_index
    ).first()
    
    if existing_vote:
        # Toggle off
        db.delete(existing_vote)
        db.commit()
        return poll_to_dict(poll, db)
    
    # If not allow_multiple, remove previous votes
    if not poll.allow_multiple:
        db.query(PollVote).filter(
            PollVote.poll_id == poll_id,
            PollVote.user_id == current_user.id
        ).delete()
    
    vote = PollVote(
        id=str(uuid.uuid4()),
        poll_id=poll_id,
        user_id=current_user.id,
        option_index=data.option_index
    )
    db.add(vote)
    db.commit()
    
    return poll_to_dict(poll, db)


@router.get("/poll/{poll_id}")
def get_poll(
    poll_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    return poll_to_dict(poll, db)