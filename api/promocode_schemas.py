"""
AUTOTEST Promocode Linking Schemas
"""

from pydantic import BaseModel, Field


class ApplyPromocodeRequest(BaseModel):
    """Request payload for applying a linking promocode."""

    code: str = Field(..., min_length=1, max_length=50)


class ApplyPromocodeResponse(BaseModel):
    """Response payload after a successful promocode application."""

    success: bool
    discount_percent: int | None = None
    school_linked: bool
    group_assigned: bool
