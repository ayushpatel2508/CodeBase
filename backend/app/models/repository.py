from __future__ import annotations

import uuid

from sqlalchemy import Column, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID, JSON

from .base import Base


class Repository(Base):
    __tablename__ = "repositories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    github_url = Column(String(1024), nullable=False, unique=True, index=True)
    status = Column(String(32), nullable=False, default="queued")
    total_files = Column(Integer, nullable=False, default=0)
    total_chunks = Column(Integer, nullable=False, default=0)
    error_message = Column(String(2048), nullable=True)
    parsed_tree = Column(JSON, nullable=True)
    last_commit_hash = Column(String(40), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
