"""
AUTOTEST Driving Instructor Application Model
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.user import User


class DrivingInstructorApplication(Base):
    """Application submitted to become a listed instructor."""

    __tablename__ = "driving_instructor_applications"

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
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    phone: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
    )
    city: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        index=True,
    )
    region: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )
    gender: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )
    years_experience: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    transmission: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    car_model: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )
    hourly_price_cents: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="UZS",
    )
    short_bio: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    profile_image_url: Mapped[str] = mapped_column(
        String(2000),
        nullable=False,
    )
    extra_images_json: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="[]",
    )
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="pending",
        index=True,
    )
    rejection_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    submitted_from: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="web",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user: Mapped["User | None"] = relationship("User", foreign_keys=[user_id])
    reviewed_by: Mapped["User | None"] = relationship("User", foreign_keys=[reviewed_by_id])

    def __repr__(self) -> str:
        return f"<DrivingInstructorApplication(id={self.id}, full_name={self.full_name}, status={self.status})>"

