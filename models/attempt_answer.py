"""
AUTOTEST AttemptAnswer Model
SQLAlchemy model for attempt answers
"""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.answer_option import AnswerOption
    from models.attempt import Attempt
    from models.question import Question


class AttemptAnswer(Base):
    """AttemptAnswer model for tracking individual question answers."""
    
    __tablename__ = "attempt_answers"
    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_attempt_answers_attempt_question"),
        Index("ix_attempt_answers_attempt_question", "attempt_id", "question_id"),
    )
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("attempts.id", ondelete="CASCADE"),
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
    
    # Relationships
    attempt: Mapped["Attempt"] = relationship(
        "Attempt",
        back_populates="attempt_answers",
    )
    question: Mapped["Question"] = relationship(
        "Question",
    )
    selected_option: Mapped["AnswerOption"] = relationship(
        "AnswerOption",
    )
    
    def __repr__(self) -> str:
        return f"<AttemptAnswer(id={self.id}, attempt_id={self.attempt_id}, is_correct={self.is_correct})>"
