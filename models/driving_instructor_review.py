"""
AUTOTEST Driving Instructor Review Model
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.driving_instructor import DrivingInstructor
    from models.user import User


class DrivingInstructorReview(Base):
    """User rating and text review for a driving instructor."""

    __tablename__ = "driving_instructor_reviews"
    __table_args__ = (
        UniqueConstraint("instructor_id", "user_id", name="uq_driving_instructor_reviews_instructor_user"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_driving_instructor_reviews_rating_range"),
    )

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
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rating: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    comment: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    is_visible: Mapped[bool] = mapped_column(
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

    instructor: Mapped["DrivingInstructor"] = relationship("DrivingInstructor", back_populates="reviews")
    user: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<DrivingInstructorReview(id={self.id}, instructor_id={self.instructor_id}, user_id={self.user_id}, rating={self.rating})>"

