"""
AUTOTEST Stripe Integration
Helper functions for interacting with Stripe API
"""

import stripe
from fastapi import HTTPException, status

from core.config import settings

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


def create_checkout_session(user_id: str, email: str) -> str:
    """
    Create a Stripe Checkout Session for Premium subscription.
    
    Args:
        user_id: User UUID string
        email: User email address
        
    Returns:
        Checkout Session URL
    """
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": "AUTOTEST Premium Subscription",
                            "description": "30 days of unlimited access to all tests",
                        },
                        "unit_amount": settings.PREMIUM_PRICE_USD * 100,  # Amount in cents
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",  # One-time payment
            success_url=settings.FRONTEND_SUCCESS_URL + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=settings.FRONTEND_CANCEL_URL,
            client_reference_id=user_id,
            customer_email=email,
            metadata={
                "type": "premium_subscription",
                "days": 30,
            },
        )
        return session.url
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stripe error: {str(e)}",
        )


def verify_webhook_signature(payload: bytes, sig_header: str) -> stripe.Event:
    """
    Verify Stripe webhook signature.
    
    Args:
        payload: Raw request body
        sig_header: Stripe-Signature header
        
    Returns:
        Stripe Event object
        
    Raises:
        HTTPException: If signature verification fails
    """
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
        return event
    except ValueError:
        # Invalid payload
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload",
        )
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature",
        )
