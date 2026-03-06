"""
Subscription lifecycle helpers.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession
import uuid

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
    subscription.canceled_at = None
    subscription.cancel_at_period_end = False

    await db.commit()
    await db.refresh(user, attribute_names=["subscription"])
    return True


async def _activate_subscription(
    user_id: uuid.UUID,
    db: AsyncSession,
    provider: str,
    provider_subscription_id: str | None,
    plan_code: str,
    duration_days: int,
    payment: "Payment" = None,
) -> Subscription:
    """
    Idempotent and safe subscription activation logic.
    """
    from datetime import timedelta
    from sqlalchemy import select
    from models.subscription import Subscription
    from core.logging import get_logger
    
    logger = get_logger(__name__)

    if payment is not None and payment.status == "succeeded":
        logger.warning("Activation skipped: payment already processed")
        return None
    
    # Use nested transaction logic
    async with db.begin_nested() if db.in_transaction() else db.begin():
        result = await db.execute(select(Subscription).where(Subscription.user_id == user_id))
        subscription = result.scalar_one_or_none()

        now = utc_now()
        safe_duration_days = max(1, duration_days)
        extension_duration = timedelta(days=safe_duration_days)
        
        normalized_plan_code = plan_code.strip().lower() if plan_code else "premium"

        # Idempotency check: if already activated this exact transaction, do nothing and return.
        if subscription is not None and provider_subscription_id and subscription.provider_subscription_id == provider_subscription_id:
            return subscription

        if subscription is None:
            new_expiry = now + extension_duration
            subscription = Subscription(
                user_id=user_id,
                plan=normalized_plan_code,
                status="active",
                provider=provider,
                provider_subscription_id=provider_subscription_id,
                starts_at=now,
                expires_at=new_expiry,
                cancel_at_period_end=False,
            )
            db.add(subscription)
            await db.flush()
            return subscription

        if subscription.expires_at is not None and subscription.expires_at > now:
            new_expiry = subscription.expires_at + extension_duration
        else:
            new_expiry = now + extension_duration

        subscription.plan = normalized_plan_code
        subscription.status = "active"
        subscription.provider = provider
        subscription.provider_subscription_id = provider_subscription_id
        subscription.starts_at = now
        subscription.expires_at = new_expiry
        subscription.canceled_at = None
        subscription.cancel_at_period_end = False
        subscription.updated_at = now
        await db.flush()

    # Need to commit if we controlled the transaction, but SQLAlchemy AsyncSession 
    # context managers are fine. We will just return the sub.
    return subscription
