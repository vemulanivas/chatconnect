from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.models import User, Notification
from auth_utils import get_current_user

router = APIRouter()


def notif_to_dict(n: Notification) -> dict:
    return {
        "id": n.id,
        "userId": n.user_id,
        "type": n.type,
        "title": n.title,
        "body": n.body,
        "conversationId": n.conversation_id,
        "isRead": n.is_read,
        "createdAt": n.created_at.isoformat() if n.created_at else None,
    }


# ── Static routes FIRST (before parameterized /{notif_id} routes) ────────────

@router.get("/")
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(50).all()
    return [notif_to_dict(n) for n in notifs]


@router.get("/unread-count")
def get_unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    return {"count": count}


@router.get("/unread-system")
def get_unread_system(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Poll for unread system/broadcast notifications - auto-marks as read"""
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
        Notification.type == "system"
    ).order_by(Notification.created_at.desc()).all()
    results = [notif_to_dict(n) for n in notifs]
    for n in notifs:
        n.is_read = True
    db.commit()
    return results


@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


# ── Parameterized routes LAST ─────────────────────────────────────────────────

@router.post("/{notif_id}/read")
def mark_read(notif_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Skip fake frontend-only IDs (timestamps like "1772207106089")
    if notif_id.isdigit() and len(notif_id) > 10:
        return {"message": "Skipped frontend-only notification"}
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"message": "Marked as read"}


@router.delete("/{notif_id}")
def delete_notification(notif_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if notif:
        db.delete(notif)
        db.commit()
    return {"message": "Notification deleted"}