from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

SQLALCHEMY_DATABASE_URL = "sqlite:///./data/knowledge_base.db"

# Ensure data directory exists
db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
db_dir = os.path.dirname(db_path)
if db_dir:
    os.makedirs(db_dir, exist_ok=True)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
