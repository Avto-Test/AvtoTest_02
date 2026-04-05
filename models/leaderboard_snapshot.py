"""
AUTOTEST Leaderboard Snapshot Model
Persisted rank snapshots by period.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.user import User


class LeaderboardSnapshot(Base):
    """Stores leaderboard rankings for a captured period."""

    __tablename__ = "leaderboard_snapshots"
    __table_args__ = (
        Index("ix_leaderboard_snapshots_period_rank", "period", "rank"),
        Index("ix_leaderboard_snapshots_period_user", "period", "user_id"),
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
    xp: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    period: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        index=True,
    )
    rank: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="leaderboard_snapshots")

    def __repr__(self) -> str:
        return f"<LeaderboardSnapshot(period={self.period}, rank={self.rank}, user_id={self.user_id})>"
