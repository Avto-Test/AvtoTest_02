"""
AUTOTEST AnswerOption Model
SQLAlchemy model for answer options
"""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.question import Question


class AnswerOption(Base):
    """Answer option model belonging to a question."""
    
    __tablename__ = "answer_options"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
    )
    text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    is_correct: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    
    # Relationships
    question: Mapped["Question"] = relationship(
        "Question",
        back_populates="answer_options",
    )
    
    def __repr__(self) -> str:
        return f"<AnswerOption(id={self.id}, question_id={self.question_id}, is_correct={self.is_correct})>"
