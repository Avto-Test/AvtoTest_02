"""
AUTOTEST Simulation Exam Settings Model
Admin-managed rules for simulation exam limits.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.user import User


class SimulationExamSetting(Base):
    """Singleton settings row that controls simulation exam rules."""

    __tablename__ = "simulation_exam_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    question_count: Mapped[int] = mapped_column(Integer, nullable=False, default=40, server_default="40")
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=40, server_default="40")
    mistake_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=3, server_default="3")
    violation_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=2, server_default="2")
    cooldown_days: Mapped[int] = mapped_column(Integer, nullable=False, default=14, server_default="14")
    fast_unlock_price: Mapped[int] = mapped_column(Integer, nullable=False, default=120, server_default="120")
    intro_video_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    updated_by: Mapped["User | None"] = relationship("User")

    def __repr__(self) -> str:
        return (
            "<SimulationExamSetting("
            f"id={self.id}, question_count={self.question_count}, duration_minutes={self.duration_minutes}, "
            f"mistake_limit={self.mistake_limit}, violation_limit={self.violation_limit}, "
            f"cooldown_days={self.cooldown_days}, fast_unlock_price={self.fast_unlock_price}, "
            f"intro_video_url={self.intro_video_url})>"
        )
