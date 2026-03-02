"""
AUTOTEST Guest Attempt Model
SQLAlchemy model for guest test attempts
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.test import Test
    from models.guest_attempt_answer import GuestAttemptAnswer


class GuestAttempt(Base):
    """Guest attempt model for unauthenticated sessions."""

    __tablename__ = "guest_attempts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    guest_id: Mapped[str] = mapped_column(
        String(64),
        index=True,
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

    test: Mapped["Test"] = relationship("Test")
    attempt_answers: Mapped[list["GuestAttemptAnswer"]] = relationship(
        "GuestAttemptAnswer",
        back_populates="attempt",
        cascade="all, delete-orphan",
    )

    def finish(self) -> None:
        self.finished_at = datetime.now(timezone.utc)

    def __repr__(self) -> str:
        return f"<GuestAttempt(id={self.id}, guest_id={self.guest_id}, test_id={self.test_id})>"
