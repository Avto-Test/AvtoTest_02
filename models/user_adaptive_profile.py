"""
AUTOTEST User Adaptive Profile Model
Stores per-user adaptive difficulty target.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.user import User


class UserAdaptiveProfile(Base):
    """Per-user adaptive difficulty profile."""

    __tablename__ = "user_adaptive_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    # Lower values mean harder target, higher values mean easier target.
    target_difficulty_percent: Mapped[int] = mapped_column(
        Integer,
        default=50,
        server_default="50",
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="adaptive_profile")

    def __repr__(self) -> str:
        return (
            f"<UserAdaptiveProfile(user_id={self.user_id}, "
            f"target_difficulty_percent={self.target_difficulty_percent})>"
        )

