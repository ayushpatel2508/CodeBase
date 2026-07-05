from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
import sqlalchemy

from .config import settings
from .models.base import Base


engine = create_engine(
    settings.database_url, 
    pool_pre_ping=True, 
    future=True,
    pool_size=20,
    max_overflow=10
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from . import models  # noqa: F401

    # Ensure the pgvector extension is enabled on the database
    with engine.connect() as conn:
        conn.execute(sqlalchemy.text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()

