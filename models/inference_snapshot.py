"""
AUTOTEST InferenceSnapshot Model
SQLAlchemy model for persisting AI prediction state per attempt
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, String, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

class InferenceSnapshot(Base):
    """Immutable snapshot of AI inference at the time of attempt completion."""
    
    __tablename__ = "inference_snapshots"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("attempts.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    pass_probability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    probability_source: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    readiness_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    cognitive_stability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    retention_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    drift_state: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    model_version: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
    )
    inference_latency_ms: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship
    attempt = relationship("Attempt", back_populates="inference_snapshot", uselist=False)
