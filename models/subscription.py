"""
AUTOTEST Subscription Model
SQLAlchemy model for user subscriptions
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.user import User


class Subscription(Base):
    """Subscription model for managing user plans."""
    
    __tablename__ = "subscriptions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    plan: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="free",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="inactive",
    )
    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="tspay",
    )
    provider_subscription_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    starts_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    canceled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    cancel_at_period_end: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
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
    
    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="subscription",
    )
    
    @property
    def is_active(self) -> bool:
        """Check if subscription is currently active."""
        # Free tier never counts as paid premium access.
        if self.plan == "free":
            return False
        # Only explicitly active paid statuses unlock premium features.
        if self.status not in {"active", "trialing"}:
            return False
        now = datetime.now(timezone.utc)
        if self.expires_at is None:
            return True
        return self.expires_at > now
    
    def __repr__(self) -> str:
        return f"<Subscription(id={self.id}, user_id={self.user_id}, plan={self.plan})>"
