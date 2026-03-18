"""
AUTOTEST Attempt Model
SQLAlchemy model for test attempts
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, JSON, String, desc
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.attempt_answer import AttemptAnswer
    from models.exam_simulation_attempt import ExamSimulationAttempt
    from models.test import Test
    from models.user import User
    from models.inference_snapshot import InferenceSnapshot


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
    mode: Mapped[str] = mapped_column(
        String(20),
        default="standard",
        server_default="standard",
        nullable=False,
    )
    training_level: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )
    
    # Cognitive Load & Exam Pressure Simulation Fields
    avg_response_time: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )
    response_time_variance: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )
    pressure_mode: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
    )
    pressure_score_modifier: Mapped[float] = mapped_column(
        Float,
        default=1.0,
        server_default="1.0",
        nullable=False,
    )
    question_ids: Mapped[list[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )
    question_count: Mapped[int] = mapped_column(
        Integer,
        default=20,
        server_default="20",
        nullable=False,
    )
    time_limit_seconds: Mapped[int] = mapped_column(
        Integer,
        default=1500,
        server_default="1500",
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("avg_response_time >= 0", name="check_avg_response_time_positive"),
        CheckConstraint("response_time_variance >= 0", name="check_response_time_variance_positive"),
        CheckConstraint("pressure_score_modifier >= 0.7 AND pressure_score_modifier <= 1.0", name="check_pressure_score_modifier_bounds"),
        CheckConstraint("question_count >= 1", name="check_attempt_question_count_positive"),
        CheckConstraint("time_limit_seconds >= 30", name="check_attempt_time_limit_seconds_min"),
        Index("ix_attempts_user_finished", "user_id", desc("finished_at")),
    )
    
    @property
    def is_adaptive(self) -> bool:
        return self.mode == "adaptive"
    
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
    inference_snapshot: Mapped["InferenceSnapshot"] = relationship(
        "InferenceSnapshot",
        back_populates="attempt",
        uselist=False,
    )
    simulation_attempt: Mapped["ExamSimulationAttempt | None"] = relationship(
        "ExamSimulationAttempt",
        back_populates="attempt",
        uselist=False,
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
