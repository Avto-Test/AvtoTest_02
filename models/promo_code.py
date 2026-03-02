"""
AUTOTEST Promo Code Model
SQLAlchemy model for promo codes.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base
from models.promo_code_plan import PromoCodePlan  # noqa: F401

if TYPE_CHECKING:
    from models.promo_redemption import PromoRedemption
    from models.subscription_plan import SubscriptionPlan


class PromoCode(Base):
    """Promo code model for discounts."""

    __tablename__ = "promo_codes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    discount_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="percent",
    )
    discount_value: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    max_redemptions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    redeemed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
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

    redemptions: Mapped[list["PromoRedemption"]] = relationship(
        "PromoRedemption",
        back_populates="promo_code",
        cascade="all, delete-orphan",
    )
    applicable_plans: Mapped[list["SubscriptionPlan"]] = relationship(
        "SubscriptionPlan",
        secondary="promo_code_plans",
        back_populates="promo_codes",
    )

    @property
    def applicable_plan_ids(self) -> list[uuid.UUID]:
        return [plan.id for plan in self.applicable_plans]

    def __repr__(self) -> str:
        return f"<PromoCode(id={self.id}, code={self.code})>"
