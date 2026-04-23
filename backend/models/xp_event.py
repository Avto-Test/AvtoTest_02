"""
AUTOTEST XP Event Model
Immutable XP ledger events.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.user import User


class XPEvent(Base):
    """Stores individual XP reward events."""

    __tablename__ = "xp_events"
    __table_args__ = (
        UniqueConstraint("user_id", "source", name="uq_xp_events_user_source"),
        Index("ix_xp_events_user_created_at", "user_id", "created_at"),
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
    source: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )
    xp_amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="xp_events")

    def __repr__(self) -> str:
        return f"<XPEvent(id={self.id}, user_id={self.user_id}, source={self.source}, xp_amount={self.xp_amount})>"
