"""
AUTOTEST Driving Instructor Media Model
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.driving_instructor import DrivingInstructor


class DrivingInstructorMedia(Base):
    """Image or video media item linked to instructor profile."""

    __tablename__ = "driving_instructor_media"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    instructor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("driving_instructors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    media_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="image",
    )
    url: Mapped[str] = mapped_column(
        String(2000),
        nullable=False,
    )
    caption: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
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

    instructor: Mapped["DrivingInstructor"] = relationship("DrivingInstructor", back_populates="media_items")

    def __repr__(self) -> str:
        return f"<DrivingInstructorMedia(id={self.id}, instructor_id={self.instructor_id}, type={self.media_type})>"

