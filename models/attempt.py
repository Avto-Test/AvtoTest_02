"""
AUTOTEST Attempt Model
SQLAlchemy model for test attempts
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.attempt_answer import AttemptAnswer
    from models.test import Test
    from models.user import User


class Attempt(Base):
    """Attempt model for tracking user test attempts."""
    
    __tablename__ = "attempts"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    test_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tests.id", ondelete="CASCADE"),
        nullable=False,
    )
    score: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    
    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="attempts",
    )
    test: Mapped["Test"] = relationship(
        "Test",
        back_populates="attempts",
    )
    attempt_answers: Mapped[list["AttemptAnswer"]] = relationship(
        "AttemptAnswer",
        back_populates="attempt",
        cascade="all, delete-orphan",
    )
    
    def calculate_score(self) -> int:
        """Calculate score based on correct answers."""
        return sum(1 for answer in self.attempt_answers if answer.is_correct)
    
    def finish(self) -> None:
        """Mark attempt as finished and calculate final score."""
        self.finished_at = datetime.now(timezone.utc)
        self.score = self.calculate_score()
    
    def __repr__(self) -> str:
        return f"<Attempt(id={self.id}, user_id={self.user_id}, test_id={self.test_id}, score={self.score})>"
