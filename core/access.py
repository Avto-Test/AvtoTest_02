"""
AUTOTEST access control helpers.
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import get_current_user
from database.session import get_db
from models.user import User
from services.subscriptions.lifecycle import enforce_subscription_status


async def ensure_premium_user(current_user: User, db: AsyncSession) -> User:
    """Ensure the current user has premium access, with admin bypass."""
    if current_user.is_admin:
        return current_user

    await enforce_subscription_status(user=current_user, db=db)
    if current_user.is_premium:
        return current_user

    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail="Premium subscription required.",
    )


async def require_premium_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI dependency for premium-only endpoints."""
    return await ensure_premium_user(current_user, db)
