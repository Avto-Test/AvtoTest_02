"""
AUTOTEST Promo Redemption Model
SQLAlchemy model for promo code redemptions.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.promo_code import PromoCode
    from models.user import User
    from models.payment import Payment


class PromoRedemption(Base):
    """Promo redemption record."""

    __tablename__ = "promo_redemptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    promo_code_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("promo_codes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    payment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    redeemed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    promo_code: Mapped["PromoCode"] = relationship(
        "PromoCode",
        back_populates="redemptions",
    )
    user: Mapped["User | None"] = relationship("User", back_populates="promo_redemptions")
    payment: Mapped["Payment | None"] = relationship("Payment")

    def __repr__(self) -> str:
        return f"<PromoRedemption(id={self.id}, promo_code_id={self.promo_code_id})>"
