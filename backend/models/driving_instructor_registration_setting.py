"""
AUTOTEST Driving Instructor Registration Settings Model
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.user import User


class DrivingInstructorRegistrationSetting(Base):
    """Admin managed pricing and campaign settings for instructor onboarding."""

    __tablename__ = "driving_instructor_registration_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    is_paid_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="UZS")
    validity_days: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    discount_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    campaign_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    campaign_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    free_banner_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    countdown_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    countdown_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    updated_by: Mapped["User | None"] = relationship("User")

    def __repr__(self) -> str:
        return f"<DrivingInstructorRegistrationSetting(id={self.id}, paid={self.is_paid_enabled}, price={self.price_cents})>"

