"""
AUTOTEST UserTopicStats Model
Tracks per-user performance across question topics/categories.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.question_category import QuestionCategory
    from models.user import User


class UserTopicStats(Base):
    """Per-user topic performance summary."""

    __tablename__ = "user_topic_stats"
    __table_args__ = (
        UniqueConstraint("user_id", "topic_id", name="uq_user_topic_stats_user_topic"),
        Index("ix_user_topic_stats_user_topic", "user_id", "topic_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("question_categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    total_attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )
    correct_answers: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )
    wrong_answers: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )
    accuracy_rate: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        server_default="0",
        nullable=False,
    )
    last_attempt_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User")
    topic: Mapped["QuestionCategory"] = relationship("QuestionCategory")

    def __repr__(self) -> str:
        return (
            f"<UserTopicStats(user_id={self.user_id}, topic_id={self.topic_id}, "
            f"accuracy_rate={self.accuracy_rate})>"
        )
