"""
AUTOTEST XP Boost Model
Temporary XP multiplier windows purchased with coins.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.user import User


class XPBoost(Base):
    """Stores temporary XP multiplier windows for a user."""

    __tablename__ = "xp_boosts"
    __table_args__ = (
        Index("ix_xp_boosts_user_expires", "user_id", "expires_at"),
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
    multiplier: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=1.2,
        server_default="1.2",
    )
    source: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="coin_boost",
        server_default="coin_boost",
    )
    activated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="xp_boosts")

    def __repr__(self) -> str:
        return f"<XPBoost(id={self.id}, user_id={self.user_id}, multiplier={self.multiplier})>"
