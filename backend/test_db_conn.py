import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

print(f"Testing connection to: {DATABASE_URL.split('@')[-1]}")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version();"))
        print("\n✅ SUCCESS! Connected to the database.")
        print("Database version:")
        print(result.fetchone()[0])
except Exception as e:
    print("\n❌ FAILED to connect.")
    print(f"Error details: {e}")
