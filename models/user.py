"""
AUTOTEST User Model
SQLAlchemy 2.0 async-compatible User model
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.attempt import Attempt
    from models.feedback import Feedback
    from models.payment import Payment
    from models.promo_redemption import PromoRedemption
    from models.refresh_session import RefreshSession
    from models.school_membership import SchoolMembership
    from models.subscription import Subscription
    from models.user_role import UserRole
    from models.user_adaptive_profile import UserAdaptiveProfile
    from models.user_notification import UserNotification
    from models.verification_token import VerificationToken
    from models.user_training_history import UserTrainingHistory
    from models.user_skill import UserSkill


class User(Base):
    """User model for authentication and authorization."""
    
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    full_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    is_admin: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    
    # Relationships
    verification_tokens: Mapped[list["VerificationToken"]] = relationship(
        "VerificationToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    attempts: Mapped[list["Attempt"]] = relationship(
        "Attempt",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    subscription: Mapped["Subscription | None"] = relationship(
        "Subscription",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    training_history: Mapped[list["UserTrainingHistory"]] = relationship(
        "UserTrainingHistory",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    skills: Mapped[list["UserSkill"]] = relationship(
        "UserSkill",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    payments: Mapped[list["Payment"]] = relationship(
        "Payment",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    promo_redemptions: Mapped[list["PromoRedemption"]] = relationship(
        "PromoRedemption",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    feedbacks: Mapped[list["Feedback"]] = relationship(
        "Feedback",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    adaptive_profile: Mapped["UserAdaptiveProfile | None"] = relationship(
        "UserAdaptiveProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    notifications: Mapped[list["UserNotification"]] = relationship(
        "UserNotification",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    refresh_sessions: Mapped[list["RefreshSession"]] = relationship(
        "RefreshSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    user_roles: Mapped[list["UserRole"]] = relationship(
        "UserRole",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    school_memberships: Mapped[list["SchoolMembership"]] = relationship(
        "SchoolMembership",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    
    @property
    def is_premium(self) -> bool:
        """
        Check if user has active premium subscription.
        SAFE for async/Pydantic use - avoids lazy loading.
        """
        # If the relationship is not loaded, we return False by default
        # to prevent MissingGreenlet/lazy loading errors.
        if "subscription" not in self.__dict__ or self.subscription is None:
            return False
        
        if self.subscription.plan == "free":
            return False
            
        return self.subscription.is_active
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"
