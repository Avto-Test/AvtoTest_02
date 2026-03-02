"""
AUTOTEST Guest Attempt Answer Model
SQLAlchemy model for guest attempt answers
"""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.guest_attempt import GuestAttempt


class GuestAttemptAnswer(Base):
    """Guest answer record for an attempt."""

    __tablename__ = "guest_attempt_answers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("guest_attempts.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
    )
    selected_option_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("answer_options.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_correct: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    attempt: Mapped["GuestAttempt"] = relationship(
        "GuestAttempt",
        back_populates="attempt_answers",
    )

    def __repr__(self) -> str:
        return f"<GuestAttemptAnswer(id={self.id}, attempt_id={self.attempt_id})>"
