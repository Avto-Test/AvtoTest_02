"""
AUTOTEST Driving School Model
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.driving_school_course import DrivingSchoolCourse
    from models.driving_school_lead import DrivingSchoolLead
    from models.driving_school_media import DrivingSchoolMedia
    from models.driving_school_review import DrivingSchoolReview
    from models.promo_code import PromoCode
    from models.user import User


class DrivingSchool(Base):
    """Partner driving school profile."""

    __tablename__ = "driving_schools"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    slug: Mapped[str] = mapped_column(
        String(140),
        nullable=False,
        unique=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    short_description: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    full_description: Mapped[str | None] = mapped_column(
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
    address: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    landmark: Mapped[str | None] = mapped_column(
        String(255),
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
    website: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    work_hours: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    license_info: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    years_active: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    logo_url: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
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
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
        index=True,
    )
    promo_code_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("promo_codes.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
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

    courses: Mapped[list["DrivingSchoolCourse"]] = relationship(
        "DrivingSchoolCourse",
        back_populates="school",
        cascade="all, delete-orphan",
    )
    media_items: Mapped[list["DrivingSchoolMedia"]] = relationship(
        "DrivingSchoolMedia",
        back_populates="school",
        cascade="all, delete-orphan",
    )
    leads: Mapped[list["DrivingSchoolLead"]] = relationship(
        "DrivingSchoolLead",
        back_populates="school",
        cascade="all, delete-orphan",
    )
    reviews: Mapped[list["DrivingSchoolReview"]] = relationship(
        "DrivingSchoolReview",
        back_populates="school",
        cascade="all, delete-orphan",
    )
    owner_user: Mapped["User | None"] = relationship("User")
    promo_code: Mapped["PromoCode | None"] = relationship("PromoCode")

    def __repr__(self) -> str:
        return f"<DrivingSchool(id={self.id}, slug={self.slug}, name={self.name})>"
