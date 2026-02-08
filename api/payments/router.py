"""
AUTOTEST Payments Router
API endpoints for payment processing
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import get_current_user
from api.payments.schemas import CheckoutResponse
from core.logging import get_logger
from core.payments.stripe import create_checkout_session, verify_webhook_signature
from database.session import get_db
from models.subscription import Subscription
from models.user import User

router = APIRouter(prefix="/payments", tags=["payments"])
logger = get_logger(__name__)


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    current_user: User = Depends(get_current_user),
) -> CheckoutResponse:
    """
    Create a Stripe Checkout Session for Premium subscription.
    Returns the checkout URL to redirect the user to.
    """
    checkout_url = create_checkout_session(
        user_id=str(current_user.id),
        email=current_user.email
    )
    
    return CheckoutResponse(checkout_url=checkout_url)


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Stripe webhooks.
    Verifies signature and processes successful payments.
    """
    if not stripe_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe signature",
        )
        
    payload = await request.body()
    
    # Verify signature
    event = verify_webhook_signature(payload, stripe_signature)
    
    # Handle checkout.session.completed
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        
        # Extract user info
        user_id = session.get("client_reference_id")
        if not user_id:
            logger.error("Webhook: Missing client_reference_id in session")
            return {"status": "ignored"}
            
        logger.info(f"Processing successful payment for user: {user_id}")
        
        try:
            # Activate subscription
            await activate_subscription(user_id, db)
        except Exception as e:
            logger.error(f"Failed to activate subscription for {user_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Subscription activation failed",
            )
            
    return {"status": "success"}


async def activate_subscription(user_id: str, db: AsyncSession) -> None:
    """
    Activate or extend Premium subscription for a user.
    """
    # Find active subscription
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    subscription = result.scalar_one_or_none()
    
    now = datetime.now(timezone.utc)
    duration = timedelta(days=30)
    
    if subscription:
        # If already premium and not expired, extend
        if subscription.plan == "premium" and subscription.expires_at and subscription.expires_at > now:
            subscription.expires_at += duration
            logger.info(f"Extended premium for {user_id} until {subscription.expires_at}")
        else:
            # Upgrade or reactivate
            subscription.plan = "premium"
            subscription.expires_at = now + duration
            logger.info(f"Activated premium for {user_id} until {subscription.expires_at}")
    else:
        # Create new subscription
        subscription = Subscription(
            user_id=user_id,
            plan="premium",
            expires_at=now + duration,
        )
        db.add(subscription)
        logger.info(f"Created new premium subscription for {user_id}")
        
    await db.commit()
