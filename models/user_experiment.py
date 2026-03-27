"""User experiment assignment model."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.experiment import Experiment
    from models.user import User


class UserExperiment(Base):
    """Persistent A/B test assignment for a user."""

    __tablename__ = "user_experiments"
    __table_args__ = (
        UniqueConstraint("user_id", "experiment_id", name="uq_user_experiments_user_experiment"),
    )

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
    experiment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("experiments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    variant: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        index=True,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="experiment_assignments")
    experiment: Mapped["Experiment"] = relationship("Experiment", back_populates="assignments")

    def __repr__(self) -> str:
        return (
            f"<UserExperiment(user_id={self.user_id}, experiment_id={self.experiment_id}, "
            f"variant={self.variant})>"
        )
