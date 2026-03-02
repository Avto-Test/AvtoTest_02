"""
AUTOTEST User Training History Model
SQLAlchemy model for tracking training level transitions
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.user import User


class UserTrainingHistory(Base):
    """Model for tracking user training level changes."""
    
    __tablename__ = "user_training_history"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    previous_level: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )
    new_level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    
    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="training_history",
    )
    
    def __repr__(self) -> str:
        return f"<UserTrainingHistory(user_id={self.user_id}, {self.previous_level}->{self.new_level})>"
