"""
Subscription lifecycle helpers.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from services.payments.types import utc_now


async def enforce_subscription_status(
    user: User,
    db: AsyncSession,
) -> bool:
    """
    Auto-downgrade expired paid subscriptions.

    Returns:
        True if a downgrade mutation was persisted.
    """
    subscription = user.subscription
    if subscription is None:
        return False

    if subscription.plan == "free":
        return False

    if subscription.expires_at is None:
        return False

    now = utc_now()
    if subscription.expires_at > now:
        return False

    subscription.plan = "free"
    subscription.status = "expired"
    subscription.updated_at = now
    subscription.cancel_at_period_end = False

    await db.commit()
    await db.refresh(user, attribute_names=["subscription"])
    return True
