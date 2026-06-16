"""
AUTOTEST UserSkill Model
SQLAlchemy model for tracking user proficiency per topic
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, String, Float, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

class UserSkill(Base):
    """User skill proficiency per topic."""
    
    __tablename__ = "user_skills"
    
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
    topic: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    skill_score: Mapped[float] = mapped_column(
        Float,
        default=0.5,
        nullable=False,
    )
    bkt_knowledge_prob: Mapped[float] = mapped_column(
        Float,
        default=0.3,
        nullable=False,
    )
    total_attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    bkt_attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    last_practice_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    retention_score: Mapped[float] = mapped_column(
        Float,
        default=1.0,
        nullable=False,
    )
    repetition_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    interval_days: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    ease_factor: Mapped[float] = mapped_column(
        Float,
        default=2.5,
        nullable=False,
    )
    next_review_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="skills")
    
    __table_args__ = (
        UniqueConstraint("user_id", "topic", name="uq_user_topic_skill"),
    )
    
    def __repr__(self) -> str:
        return f"<UserSkill(user_id={self.user_id}, topic='{self.topic}', score={self.skill_score})>"
