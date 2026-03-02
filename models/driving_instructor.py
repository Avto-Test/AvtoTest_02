"""
AUTOTEST Driving Instructor Model
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.driving_instructor_complaint import DrivingInstructorComplaint
    from models.driving_instructor_lead import DrivingInstructorLead
    from models.driving_instructor_media import DrivingInstructorMedia
    from models.driving_instructor_review import DrivingInstructorReview
    from models.promo_code import PromoCode
    from models.user import User


class DrivingInstructor(Base):
    """Public profile for an individual driving instructor."""

    __tablename__ = "driving_instructors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
    )
    slug: Mapped[str] = mapped_column(
        String(140),
        nullable=False,
        unique=True,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    gender: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        index=True,
    )
    years_experience: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        index=True,
    )
    short_bio: Mapped[str] = mapped_column(
        String(1200),
        nullable=False,
    )
    teaching_style: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
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
    service_areas: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    transmission: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )
    car_model: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )
    car_year: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    car_features: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    hourly_price_cents: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
    )
    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="UZS",
    )
    min_lesson_minutes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=60,
    )
    special_services: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    phone: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
    )
    telegram: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )
    profile_image_url: Mapped[str] = mapped_column(
        String(2000),
        nullable=False,
    )
    map_embed_url: Mapped[str | None] = mapped_column(
        String(2000),
        nullable=True,
    )
    referral_code: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
        unique=True,
        index=True,
    )
    promo_code_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("promo_codes.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )
    is_blocked: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    is_top_rated: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    view_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
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
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user: Mapped["User | None"] = relationship("User")
    promo_code: Mapped["PromoCode | None"] = relationship("PromoCode")
    media_items: Mapped[list["DrivingInstructorMedia"]] = relationship(
        "DrivingInstructorMedia",
        back_populates="instructor",
        cascade="all, delete-orphan",
    )
    reviews: Mapped[list["DrivingInstructorReview"]] = relationship(
        "DrivingInstructorReview",
        back_populates="instructor",
        cascade="all, delete-orphan",
    )
    leads: Mapped[list["DrivingInstructorLead"]] = relationship(
        "DrivingInstructorLead",
        back_populates="instructor",
        cascade="all, delete-orphan",
    )
    complaints: Mapped[list["DrivingInstructorComplaint"]] = relationship(
        "DrivingInstructorComplaint",
        back_populates="instructor",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<DrivingInstructor(id={self.id}, slug={self.slug}, name={self.full_name})>"

