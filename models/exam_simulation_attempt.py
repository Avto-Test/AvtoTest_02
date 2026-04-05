"""
AUTOTEST Exam Simulation Attempt Model
Dedicated entity for simulation exam lifecycle and cooldown tracking.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.attempt import Attempt
    from models.user import User


class ExamSimulationAttempt(Base):
    __tablename__ = "exam_simulation_attempts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("attempts.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    cooldown_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    next_available_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    readiness_snapshot: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
        server_default="0",
    )
    pass_probability_snapshot: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
        server_default="0",
    )
    question_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=40,
        server_default="40",
    )
    pressure_mode: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )
    mistake_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    mistake_limit: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=3,
        server_default="3",
    )
    violation_limit: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=2,
        server_default="2",
    )
    violation_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    disqualified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    disqualification_reason: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )
    timeout: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    passed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    cooldown_reduction_days_used: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    __table_args__ = (
        Index("ix_exam_simulation_attempts_user_id", "user_id"),
        Index("ix_exam_simulation_attempts_user_started_at", "user_id", "started_at"),
        Index("ix_exam_simulation_attempts_user_next_available_at", "user_id", "next_available_at"),
    )

    attempt: Mapped["Attempt"] = relationship(
        "Attempt",
        back_populates="simulation_attempt",
        uselist=False,
    )
    user: Mapped["User"] = relationship(
        "User",
        back_populates="exam_simulations",
    )

    def __repr__(self) -> str:
        return f"<ExamSimulationAttempt(id={self.id}, user_id={self.user_id}, passed={self.passed})>"
