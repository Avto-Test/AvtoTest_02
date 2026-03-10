"""
AUTOTEST ReviewQueue Model
Stores spaced-repetition items for users.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.question import Question
    from models.user import User


class ReviewQueue(Base):
    """Queued spaced-repetition review entry."""

    __tablename__ = "review_queue"
    __table_args__ = (
        UniqueConstraint("user_id", "question_id", name="uq_review_queue_user_question"),
        Index("ix_review_queue_user_question", "user_id", "question_id"),
        Index("ix_review_queue_user_next_review", "user_id", "next_review_at"),
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
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    next_review_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    interval_days: Mapped[int] = mapped_column(
        Integer,
        default=1,
        server_default="1",
        nullable=False,
    )
    last_result: Mapped[str] = mapped_column(
        String(16),
        default="wrong",
        server_default="wrong",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User")
    question: Mapped["Question"] = relationship("Question")

    def __repr__(self) -> str:
        return (
            f"<ReviewQueue(user_id={self.user_id}, question_id={self.question_id}, "
            f"next_review_at={self.next_review_at})>"
        )
