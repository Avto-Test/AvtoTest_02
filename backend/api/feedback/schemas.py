"""
AUTOTEST Feedback Schemas
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class FeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    category: str | None = Field(default="general", min_length=1, max_length=50)
    comment: str = Field(..., min_length=3, max_length=4000)
    suggestion: str | None = Field(default=None, max_length=4000)


class FeedbackResponse(BaseModel):
    id: UUID
    user_id: UUID
    rating: int
    category: str
    comment: str
    suggestion: str | None
    status: str
    admin_note: str | None
    created_at: datetime
    updated_at: datetime
    user_email: str | None = None

    model_config = {"from_attributes": True}


class FeedbackAdminUpdate(BaseModel):
    status: str | None = Field(default=None, max_length=30)
    admin_note: str | None = Field(default=None, max_length=4000)
