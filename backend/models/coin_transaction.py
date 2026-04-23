"""
AUTOTEST Coin Transaction Model
Immutable coin ledger events.
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


class CoinTransaction(Base):
    """Stores coin credits and debits."""

    __tablename__ = "coin_transactions"
    __table_args__ = (
        UniqueConstraint("user_id", "type", "source", name="uq_coin_transactions_user_type_source"),
        Index("ix_coin_transactions_user_created_at", "user_id", "created_at"),
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
    amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    type: Mapped[str] = mapped_column(
        String(24),
        nullable=False,
        default="credit",
        server_default="credit",
    )
    source: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="coin_transactions")

    def __repr__(self) -> str:
        return f"<CoinTransaction(id={self.id}, user_id={self.user_id}, amount={self.amount}, type={self.type})>"
