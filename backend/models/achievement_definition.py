"""
AUTOTEST Achievement Definition Model
Static achievement catalog.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.user_achievement import UserAchievement


class AchievementDefinition(Base):
    """Defines an unlockable achievement."""

    __tablename__ = "achievement_definitions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(120),
        unique=True,
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    icon: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="sparkles",
        server_default="sparkles",
    )
    trigger_rule: Mapped[str] = mapped_column(
        String(120),
        unique=True,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user_achievements: Mapped[list["UserAchievement"]] = relationship(
        "UserAchievement",
        back_populates="achievement_definition",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<AchievementDefinition(id={self.id}, trigger_rule={self.trigger_rule})>"
