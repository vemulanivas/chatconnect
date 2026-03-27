import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import from current project structure
sys.path.append(os.path.abspath('.'))
from models.models import User, Base
from database import DATABASE_URL, engine

Session = sessionmaker(bind=engine)
db = Session()

# Create tables if not exist
Base.metadata.create_all(bind=engine)

test_users = [
    {"username": "nikhil_test", "full_name": "Nikhil Sharma", "bio": "Hello, I am a test user!", "email": "nikhil@test.com"},
    {"username": "nivas_test", "full_name": "Aditya Nivas", "bio": "Chatting with ChatConnect!", "email": "nivas@test.com"},
    {"username": "john_doe", "full_name": "John Doe", "bio": "Testing the search feature.", "email": "john@test.com"},
    {"username": "jane_smith", "full_name": "Jane Smith", "bio": "I am Jane.", "email": "jane@test.com"},
    {"username": "alice_w", "full_name": "Alice Wonder", "bio": "Curiouser and curiouser!", "email": "alice@test.com"},
    {"username": "bob_b", "full_name": "Bob Builder", "bio": "Can we search it? Yes we can!", "email": "bob@test.com"}
]

added = 0
for u in test_users:
    exists = db.query(User).filter(User.username == u["username"]).first()
    if not exists:
        user = User(
            username=u["username"],
            full_name=u["full_name"],
            email=u["email"],
            bio=u["bio"],
            password_hash="fake_hash", # not for logging in, just for testing search
            status="online",
            avatar=f"https://ui-avatars.com/api/?name={u['full_name'].replace(' ', '+')}&background=random&color=fff"
        )
        db.add(user)
        added += 1

db.commit()
print(f"Successfully added {added} test users to {DATABASE_URL}")
db.close()
