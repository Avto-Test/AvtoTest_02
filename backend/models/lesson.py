"""
AUTOTEST Lesson Model
SQLAlchemy model for learning content entries.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from database.base import Base


class Lesson(Base):
    """Lesson model for files/links managed from admin panel."""

    __tablename__ = "lessons"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    content_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="link",
    )
    content_url: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )
    thumbnail_url: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )
    topic: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )
    section: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    is_premium: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<Lesson(id={self.id}, title={self.title})>"
