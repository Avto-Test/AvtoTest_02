"""
AUTOTEST User Prediction Snapshot Model
Stores point-in-time feature aggregates for future ML training.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.attempt import Attempt
    from models.user import User


class UserPredictionSnapshot(Base):
    __tablename__ = "user_prediction_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attempt_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("attempts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    trigger_source: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    snapshot_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    last_activity_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    last_5_avg: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    last_5_std: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    improvement_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    overall_accuracy: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    avg_response_time: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    response_time_variance: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    weakest_topic_accuracy: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    strongest_topic_accuracy: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    topic_entropy: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    consistency_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="prediction_snapshots",
    )
    attempt: Mapped["Attempt | None"] = relationship(
        "Attempt",
        back_populates="prediction_snapshots",
    )
