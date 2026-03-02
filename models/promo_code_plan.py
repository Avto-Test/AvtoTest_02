"""
AUTOTEST Promo Code Plan Mapping Model
Maps promo codes to specific subscription plans.
"""

from datetime import datetime, timezone
from typing import TYPE_CHECKING
import uuid

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from database.base import Base

if TYPE_CHECKING:
    from models.promo_code import PromoCode
    from models.subscription_plan import SubscriptionPlan


class PromoCodePlan(Base):
    """Association table for promo-code-to-plan applicability."""

    __tablename__ = "promo_code_plans"

    promo_code_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("promo_codes.id", ondelete="CASCADE"),
        primary_key=True,
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subscription_plans.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

