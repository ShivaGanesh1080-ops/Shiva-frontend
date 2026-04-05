import os
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. Put your exact Supabase password here (keep the quote marks!)
MY_PASSWORD = "2503A51110@"

# 2. Python will safely encode any special characters (like @ or #)
encoded_password = urllib.parse.quote_plus(MY_PASSWORD)

# 3. We inject the safe password into the URL
SUPABASE_URL = f"postgresql://postgres:{encoded_password}@db.jzzxjukjzdxnciisrptn.supabase.co:5432/postgres"

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", SUPABASE_URL)

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()