import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load Azure credentials from your backend .env
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL or "chatconnect.db" in DATABASE_URL:
    print("WARNING: Check your .env file! It looks like you're still on SQLite locally.")
    exit(1)

# Fix for PostgreSQL URL format (if needed)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def patch_database():
    with engine.connect() as conn:
        print(f"Connecting to: {DATABASE_URL.split('@')[-1]}") # Log host safely
        
        # 1. Update MESSAGES table
        print("Patching table: messages...")
        statements = [
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS priority VARCHAR DEFAULT 'normal';",
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS mentions JSONB DEFAULT '[]'::jsonb;",
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id VARCHAR;"
        ]
        
        for sql in statements:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception as e:
                print(f"  Note: {e}")

        # 2. Update USERS table
        print("Patching table: users...")
        user_statements = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;"
        ]
        
        for sql in user_statements:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception as e:
                print(f"  Note: {e}")

        print("\nSUCCESS: All Azure production table schemas are up to date!")

if __name__ == "__main__":
    patch_database()
