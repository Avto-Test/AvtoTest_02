"""Experiment model for product growth A/B tests."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.user_experiment import UserExperiment


class Experiment(Base):
    """Represents a configurable product experiment with named variants."""

    __tablename__ = "experiments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        unique=True,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
    )
    variants: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=lambda: ["A", "B"],
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    assignments: Mapped[list["UserExperiment"]] = relationship(
        "UserExperiment",
        back_populates="experiment",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Experiment(id={self.id}, name={self.name}, is_active={self.is_active})>"
