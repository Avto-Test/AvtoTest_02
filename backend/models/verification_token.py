"""
AUTOTEST Verification Token Model
SQLAlchemy model for email verification tokens
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base


class VerificationToken(Base):
    """Verification token model for email verification."""
    
    __tablename__ = "verification_tokens"
    
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
    code: Mapped[str] = mapped_column(
        String(6),
        nullable=False,
    )
    token_type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="email_verification",
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    is_used: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    
    # Relationship
    user = relationship("User", back_populates="verification_tokens")
    
    def __repr__(self) -> str:
        return f"<VerificationToken(id={self.id}, user_id={self.user_id})>"
