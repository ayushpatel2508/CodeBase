from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, func, String
from sqlalchemy.dialects.postgresql import UUID

from .base import Base


class UserRepo(Base):
    __tablename__ = "user_repos"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    repo_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), primary_key=True)
    chat_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
