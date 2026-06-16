"""
AUTOTEST User Achievement Model
Unlocked achievements for a user.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.achievement_definition import AchievementDefinition
    from models.user import User


class UserAchievement(Base):
    """Links a user to an unlocked achievement definition."""

    __tablename__ = "user_achievements"
    __table_args__ = (
        UniqueConstraint("user_id", "achievement_definition_id", name="uq_user_achievement_definition"),
        Index("ix_user_achievements_user_awarded", "user_id", "awarded_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    achievement_definition_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("achievement_definitions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    awarded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="user_achievements")
    achievement_definition: Mapped["AchievementDefinition"] = relationship(
        "AchievementDefinition",
        back_populates="user_achievements",
    )

    def __repr__(self) -> str:
        return f"<UserAchievement(user_id={self.user_id}, achievement_definition_id={self.achievement_definition_id})>"
