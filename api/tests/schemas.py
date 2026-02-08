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
    answer_options: list[PublicAnswerOption]
    
    model_config = ConfigDict(from_attributes=True)


class PublicTestList(BaseModel):
    """Schema for test list item."""
    id: UUID
    title: str
    description: str | None = None
    difficulty: str
    question_count: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PublicTestDetail(BaseModel):
    """Schema for full test detail."""
    id: UUID
    title: str
    description: str | None = None
    difficulty: str
    questions: list[PublicQuestion]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
