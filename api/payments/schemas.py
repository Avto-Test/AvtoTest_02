"""
AUTOTEST Payment Schemas
Pydantic schemas for payment operations
"""

from pydantic import BaseModel


class CheckoutResponse(BaseModel):
    """Response model for checkout session creation."""
    checkout_url: str
