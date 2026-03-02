"""
AUTOTEST User Schemas
Pydantic models for user profile
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class UserMeResponse(BaseModel):
    """Schema for current user profile."""
    id: UUID
    email: EmailStr
    full_name: str | None = None
    is_verified: bool
    is_active: bool
    is_admin: bool
    is_premium: bool
    has_instructor_profile: bool = False
    has_school_profile: bool = False
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
