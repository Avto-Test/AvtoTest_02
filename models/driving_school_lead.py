"""
AUTOTEST Driving School Lead Model
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.driving_school import DrivingSchool
    from models.user import User


class DrivingSchoolLead(Base):
    """Lead request submitted from a driving school profile page."""

    __tablename__ = "driving_school_leads"

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
    requested_category: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )
    comment: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    source: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="web",
    )
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="new",
        index=True,
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

    school: Mapped["DrivingSchool"] = relationship("DrivingSchool", back_populates="leads")
    user: Mapped["User | None"] = relationship("User")

    def __repr__(self) -> str:
        return f"<DrivingSchoolLead(id={self.id}, school_id={self.school_id}, status={self.status})>"
