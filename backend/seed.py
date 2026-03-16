"""
Run this script to create demo users and sample data.
Usage: python seed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import engine, SessionLocal, Base
from models.models import User, Conversation, Message, conversation_participants
from auth_utils import get_password_hash
import uuid

Base.metadata.create_all(bind=engine)

db = SessionLocal()

DEMO_USERS = [
    {"username": "nivas", "email": "nivas@example.com", "full_name": "Nivas Kumar", "password": "demo123", "bio": "Software Developer", "status": "online"},
    {"username": "abhinava", "email": "abhinava@example.com", "full_name": "Abhinava Singh", "password": "demo123", "bio": "Designer & Creative", "status": "online"},
    {"username": "rahul", "email": "rahul@example.com", "full_name": "Rahul Sharma", "password": "demo1234", "bio": "Marketing Manager", "status": "away"},
    {"username": "priya", "email": "priya@example.com", "full_name": "Priya Patel", "password": "demo123", "bio": "Product Manager", "status": "busy"},
    {"username": "anwita", "email": "anwita@example.com", "full_name": "Anwita Das", "password": "demo123", "bio": "Data Scientist", "status": "offline"},
]

colors = ["667eea", "764ba2", "f093fb", "4facfe", "43e97b"]

created_users = []
for i, data in enumerate(DEMO_USERS):
    existing = db.query(User).filter(User.username == data["username"]).first()
    if existing:
        print(f"User {data['username']} already exists, skipping.")
        created_users.append(existing)
        continue

    user = User(
        id=str(uuid.uuid4()),
        username=data["username"],
        email=data["email"],
        full_name=data["full_name"],
        password_hash=get_password_hash(data["password"]),
        bio=data["bio"],
        avatar=f"https://ui-avatars.com/api/?name={data['full_name'].replace(' ', '+')}&background={colors[i]}&color=fff",
        status=data["status"],
    )
    db.add(user)
    created_users.append(user)

db.commit()
print(f"Created/found {len(created_users)} users.")

# Create a sample DM conversation between first two users
if len(created_users) >= 2:
    u1, u2 = created_users[0], created_users[1]
    existing_conv = db.query(Conversation).filter(
        Conversation.type == "dm",
        Conversation.participants.any(User.id == u1.id),
        Conversation.participants.any(User.id == u2.id),
    ).first()

    if not existing_conv:
        conv = Conversation(id=str(uuid.uuid4()), type="dm", created_by=u1.id)
        conv.participants.append(u1)
        conv.participants.append(u2)
        db.add(conv)
        db.commit()
        db.refresh(conv)

        sample_messages = [
            (u1.id, "Hey! Welcome to ChatConnect 👋"),
            (u2.id, "Thanks! This looks great 🎉"),
            (u1.id, "Built with React + FastAPI. Let me know if you have questions!"),
        ]
        for sender_id, content in sample_messages:
            msg = Message(
                id=str(uuid.uuid4()),
                conversation_id=conv.id,
                sender_id=sender_id,
                content=content,
                type="text",
            )
            db.add(msg)
        db.commit()
        print("Created sample DM with messages.")

db.close()
print("\n✅ Seed complete!")
print("\nDemo credentials:")
for u in DEMO_USERS:
    print(f"  Username: {u['username']}  Password: {u['password']}")
