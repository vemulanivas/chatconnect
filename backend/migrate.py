"""Run this once to add new columns to existing database"""
import sqlite3, os

db_path = os.path.join(os.path.dirname(__file__), 'chatconnect.db')
conn = sqlite3.connect(db_path)

migrations = [
    "ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0",
    "ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1",
    "ALTER TABLE users ADD COLUMN last_seen DATETIME",
    "ALTER TABLE users ADD COLUMN last_login DATETIME",
    "ALTER TABLE conversations ADD COLUMN privacy VARCHAR DEFAULT 'public'",
    "ALTER TABLE messages ADD COLUMN is_flagged BOOLEAN DEFAULT 0",
    """CREATE TABLE IF NOT EXISTS read_receipts (
        id VARCHAR PRIMARY KEY,
        message_id VARCHAR REFERENCES messages(id),
        user_id VARCHAR REFERENCES users(id),
        read_at DATETIME DEFAULT CURRENT_TIMESTAMP
        
    )""",
]

for sql in migrations:
    try:
        conn.execute(sql)
        print(f"OK: {sql[:60]}")
    except sqlite3.OperationalError as e:
        print(f"SKIP: {e}")

conn.commit()
conn.close()
print("\nMigration complete!")