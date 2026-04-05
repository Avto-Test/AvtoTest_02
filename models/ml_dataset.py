"""
AUTOTEST ML Dataset Model
Stores linked snapshot-label rows plus quality flags for manual training.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from database.base import Base

if TYPE_CHECKING:
    pass


class MLDataset(Base):
    __tablename__ = "ml_dataset"

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
    exam_result_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_exam_results.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    snapshot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_prediction_snapshots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    features: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )
    snapshot_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
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
    label: Mapped[int] = mapped_column(Integer, nullable=False)
    time_gap_days: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    activity_gap_days: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    confidence_band: Mapped[str] = mapped_column(String(20), nullable=False, default="low")
    is_usable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    quality_flags: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )
    built_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
