"""
AUTOTEST Payment Model
Stores payment sessions, webhook payloads, and processing state.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.user import User


class Payment(Base):
    """Payment lifecycle record."""

    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="tspay",
        index=True,
    )
    provider_event_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
        index=True,
    )
    provider_session_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    provider_payment_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    event_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="pending",
        index=True,
    )
    amount_cents: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    currency: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True,
    )
    idempotency_key: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
        index=True,
    )
    signature: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    raw_payload: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User | None"] = relationship("User", back_populates="payments")

    def __repr__(self) -> str:
        return (
            f"<Payment(id={self.id}, provider={self.provider}, "
            f"status={self.status}, user_id={self.user_id})>"
        )
