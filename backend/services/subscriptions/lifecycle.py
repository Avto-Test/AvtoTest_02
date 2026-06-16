"""
Subscription lifecycle helpers.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from models.subscription import Subscription
from models.user import User
from services.payments.types import utc_now


def sync_user_subscription_state(
    user: User,
    subscription: Subscription | None = None,
) -> bool:
    """Mirror subscription state onto fast-access user columns."""
    active_subscription = subscription if subscription is not None else user.subscription
    target_is_premium = bool(active_subscription and active_subscription.is_active)
    target_expires_at = active_subscription.expires_at if active_subscription is not None else None

    changed = False
    if user.is_premium != target_is_premium:
        user.is_premium = target_is_premium
        changed = True
    if user.subscription_expires_at != target_expires_at:
        user.subscription_expires_at = target_expires_at
        changed = True
    return changed


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
    changed = False

    if subscription is None:
        changed = sync_user_subscription_state(user)
        if changed:
            await db.commit()
            await db.refresh(user)
        return changed

    now = utc_now()
    if (
        subscription.plan != "free"
        and subscription.expires_at is not None
        and subscription.expires_at <= now
    ):
        subscription.plan = "free"
        subscription.status = "expired"
        subscription.canceled_at = None
        subscription.cancel_at_period_end = False
        changed = True

    if sync_user_subscription_state(user, subscription):
        changed = True

    if changed:
        await db.commit()
        await db.refresh(user, attribute_names=["subscription"])
    return changed


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
    from core.logging import get_logger
    
    logger = get_logger(__name__)

    if payment is not None and payment.status == "succeeded":
        logger.warning("Activation skipped: payment already processed")
        return None
    
    # Use nested transaction logic
    async with db.begin_nested() if db.in_transaction() else db.begin():
        user = await db.get(User, user_id)
        if user is None:
            raise ValueError(f"User not found for subscription activation: {user_id}")

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
            sync_user_subscription_state(user, subscription)
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
        sync_user_subscription_state(user, subscription)
        await db.flush()

    # Need to commit if we controlled the transaction, but SQLAlchemy AsyncSession 
    # context managers are fine. We will just return the sub.
    return subscription
