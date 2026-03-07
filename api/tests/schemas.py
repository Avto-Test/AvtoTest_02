"""
AUTOTEST Public Test Schemas
Pydantic models for public test viewing
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PublicAnswerOption(BaseModel):
    """Answer option schema without is_correct field."""
    id: UUID
    text: str
    
    model_config = ConfigDict(from_attributes=True)


class PublicQuestion(BaseModel):
    """Question schema for test taking."""
    id: UUID
    text: str
    image_url: str | None = None
    video_url: str | None = None
    media_type: str | None = None
    topic: str | None = None
    category: str | None = None
    difficulty: str | None = None
    answer_options: list[PublicAnswerOption]
    
    model_config = ConfigDict(from_attributes=True)


class PublicTestList(BaseModel):
    """Schema for test list item."""
    id: UUID
    title: str
    description: str | None = None
    difficulty: str
    is_premium: bool
    duration: int | None = None
    question_count: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PublicTestDetail(BaseModel):
    """Schema for full test detail."""
    id: UUID
    title: str
    description: str | None = None
    difficulty: str
    is_premium: bool
    duration: int | None = None
    questions: list[PublicQuestion]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class FreeTestStatus(BaseModel):
    """Schema describing free plan daily test usage."""

    attempts_used_today: int
    attempts_limit: int
    attempts_remaining: int
    limit_reached: bool
    is_premium: bool
