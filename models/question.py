"""
AUTOTEST Question Model
SQLAlchemy model for questions
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.answer_option import AnswerOption
    from models.question_category import QuestionCategory
    from models.test import Test


class Question(Base):
    """Question model belonging to a test."""
    
    __tablename__ = "questions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    test_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tests.id", ondelete="CASCADE"),
        nullable=False,
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("question_categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    image_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    video_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    media_type: Mapped[str] = mapped_column(
        String(20),
        default="text",
        server_default="text",
        index=True,
        nullable=False,
    )
    topic: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )
    category: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )
    difficulty: Mapped[str] = mapped_column(
        String(20),
        default="medium",
        server_default="medium",
        index=True,
        nullable=False,
    )
    difficulty_percent: Mapped[int] = mapped_column(
        Integer,
        default=50,
        server_default="50",
        nullable=False,
        index=True,
    )
    total_attempts: Mapped[int] = mapped_column(
        default=0,
        server_default="0",
        nullable=False,
        index=True,
    )
    total_correct: Mapped[int] = mapped_column(
        default=0,
        server_default="0",
        nullable=False,
    )
    dynamic_difficulty_score: Mapped[float] = mapped_column(
        default=0.5,
        server_default="0.5",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    
    # Relationships
    test: Mapped["Test"] = relationship(
        "Test",
        back_populates="questions",
    )
    category_ref: Mapped["QuestionCategory | None"] = relationship(
        "QuestionCategory",
        back_populates="questions",
    )
    answer_options: Mapped[list["AnswerOption"]] = relationship(
        "AnswerOption",
        back_populates="question",
        cascade="all, delete-orphan",
    )
    
    def __repr__(self) -> str:
        return f"<Question(id={self.id}, test_id={self.test_id})>"
