"""
AUTOTEST Driving School Course Model
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.driving_school import DrivingSchool


class DrivingSchoolCourse(Base):
    """Training packages offered by a partner driving school."""

    __tablename__ = "driving_school_courses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    school_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("driving_schools.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_code: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )
    duration_weeks: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    price_cents: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        index=True,
    )
    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="UZS",
    )
    installment_available: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    sort_order: Mapped[int] = mapped_column(
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

    school: Mapped["DrivingSchool"] = relationship("DrivingSchool", back_populates="courses")

    def __repr__(self) -> str:
        return f"<DrivingSchoolCourse(id={self.id}, school_id={self.school_id}, category={self.category_code})>"
