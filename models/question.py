"""
AUTOTEST Question Model
SQLAlchemy model for questions
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.answer_option import AnswerOption
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
    text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    image_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
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
    answer_options: Mapped[list["AnswerOption"]] = relationship(
        "AnswerOption",
        back_populates="question",
        cascade="all, delete-orphan",
    )
    
    def __repr__(self) -> str:
        return f"<Question(id={self.id}, test_id={self.test_id})>"
