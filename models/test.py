"""
AUTOTEST Test Model
SQLAlchemy model for tests
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.attempt import Attempt
    from models.question import Question


class Test(Base):
    """Test model for organizing questions."""
    
    __tablename__ = "tests"
    
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
    difficulty: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="medium",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    is_premium: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    duration: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    
    # Relationships
    questions: Mapped[list["Question"]] = relationship(
        "Question",
        back_populates="test",
        cascade="all, delete-orphan",
    )
    attempts: Mapped[list["Attempt"]] = relationship(
        "Attempt",
        back_populates="test",
        cascade="all, delete-orphan",
    )
    
    def __repr__(self) -> str:
        return f"<Test(id={self.id}, title={self.title})>"
