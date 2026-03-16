from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from models.models import User, CallHistory, Conversation
from auth_utils import get_current_user
import uuid, json
from datetime import datetime

router = APIRouter()


def call_to_dict(call: CallHistory, current_user_id: str, db: Session) -> dict:
    """Convert a call to dict, resolving the OTHER person's name from current user's perspective."""
    # Collect participant IDs from stored JSON
    raw = json.loads(call.participants) if call.participants else []
    participant_ids = []
    seen = set()
    for p in raw:
        pid = p if isinstance(p, str) else (p.get("id") if isinstance(p, dict) else None)
        if pid and len(pid) > 8 and pid not in seen:
            participant_ids.append(pid)
            seen.add(pid)

    # Always include caller
    if call.caller_id and call.caller_id not in seen:
        participant_ids.append(call.caller_id)
        seen.add(call.caller_id)

    # ALWAYS pull from conversation — this is the authoritative source
    if call.conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == call.conversation_id).first()
        if conv:
            for p in conv.participants:
                if p.id not in seen:
                    participant_ids.append(p.id)
                    seen.add(p.id)

    user_records = {}
    if participant_ids:
        users = db.query(User).filter(User.id.in_(participant_ids)).all()
        for u in users:
            user_records[u.id] = u

    caller = user_records.get(call.caller_id)
    caller_name = caller.full_name if caller else ""
    caller_avatar = (caller.avatar or "") if caller else ""

    # Find the other participant (not current viewer)
    other_id = next((pid for pid in participant_ids if pid != current_user_id), None)
    # If current user not in list at all, pick anyone not the caller
    if not other_id:
        other_id = next((pid for pid in participant_ids if pid != call.caller_id), None)

    other_user = user_records.get(other_id) if other_id else None
    other_name = other_user.full_name if other_user else ""
    other_avatar = (other_user.avatar or "") if other_user else ""



    participant_details = [
        {"id": u.id, "fullName": u.full_name, "avatar": u.avatar or ""}
        for u in user_records.values()
    ]

    return {
        "id": call.id,
        "callerId": call.caller_id,
        "callerName": caller_name,
        "callerAvatar": caller_avatar,
        "otherUserId": other_id,
        "otherUserName": other_name,
        "otherUserAvatar": other_avatar,
        "conversationId": call.conversation_id,
        "callType": call.call_type,
        "status": call.status,
        "duration": call.duration,
        "participants": participant_ids,
        "participantDetails": participant_details,
        "startedAt": (call.started_at.isoformat() + "Z") if call.started_at else None,
        "endedAt": (call.ended_at.isoformat() + "Z") if call.ended_at else None,
    }


@router.get("/")
def get_call_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    all_calls = db.query(CallHistory).order_by(CallHistory.started_at.desc()).limit(200).all()
    result = []
    for call in all_calls:
        raw = json.loads(call.participants) if call.participants else []
        pids = [p if isinstance(p, str) else p.get("id", "") for p in raw]
        if call.caller_id == current_user.id or current_user.id in pids:
            result.append(call_to_dict(call, current_user.id, db))
    return result[:50]


class CreateCallRequest(BaseModel):
    conversation_id: Optional[str] = None
    call_type: str = "audio"
    participant_ids: List[str] = []
    status: str = "completed"
    duration: int = 0


@router.post("/")
def create_call(data: CreateCallRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    clean_ids = []
    for p in data.participant_ids:
        if isinstance(p, str) and len(p) > 8:
            clean_ids.append(p)
        elif isinstance(p, dict) and p.get("id"):
            clean_ids.append(p["id"])

    participants = list(set([current_user.id] + clean_ids))
    call = CallHistory(
        id=str(uuid.uuid4()),
        caller_id=current_user.id,
        conversation_id=data.conversation_id,
        call_type=data.call_type,
        status=data.status,
        duration=data.duration,
        participants=json.dumps(participants),
        ended_at=datetime.utcnow() if data.status in ["completed", "missed", "declined"] else None,
    )
    db.add(call)
    db.commit()
    db.refresh(call)
    return call_to_dict(call, current_user.id, db)


@router.delete("/{call_id}")
def delete_call(call_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    call = db.query(CallHistory).filter(CallHistory.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    raw = json.loads(call.participants) if call.participants else []
    pids = [p if isinstance(p, str) else p.get("id", "") for p in raw]
    if call.caller_id != current_user.id and current_user.id not in pids:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(call)
    db.commit()
    return {"message": "Call deleted"}