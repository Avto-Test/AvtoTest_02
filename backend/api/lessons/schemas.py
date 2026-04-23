"""
AUTOTEST Lessons Schemas
Pydantic models for authenticated lessons feed.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LessonItemResponse(BaseModel):
    """Single lesson payload for users."""
    id: UUID
    title: str
    description: str | None = None
    content_type: str
    content_url: str
    thumbnail_url: str | None = None
    topic: str | None = None
    section: str | None = None
    is_premium: bool
    sort_order: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LessonSectionResponse(BaseModel):
    """Grouped lesson section for premium view."""
    key: str
    title: str
    lessons: list[LessonItemResponse]


class LessonsFeedResponse(BaseModel):
    """Lessons feed response for authenticated users."""
    is_premium_user: bool
    lessons: list[LessonItemResponse]
    sections: list[LessonSectionResponse]
