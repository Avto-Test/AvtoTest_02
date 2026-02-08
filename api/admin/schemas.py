"""
AUTOTEST Admin Schemas
Pydantic schemas for admin CRUD operations
"""

from uuid import UUID

from pydantic import BaseModel, Field


# ========== Test Schemas ==========

class TestCreate(BaseModel):
    """Schema for creating a test."""
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    difficulty: str = Field(default="medium", max_length=50)
    is_active: bool = True


class TestUpdate(BaseModel):
    """Schema for updating a test."""
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    difficulty: str | None = Field(default=None, max_length=50)
    is_active: bool | None = None


class TestResponse(BaseModel):
    """Schema for test response."""
    id: UUID
    title: str
    description: str | None
    difficulty: str
    is_active: bool

    model_config = {"from_attributes": True}


# ========== Question Schemas ==========

class QuestionCreate(BaseModel):
    """Schema for creating a question."""
    text: str = Field(..., min_length=1)
    image_url: str | None = Field(default=None, max_length=500)


class QuestionUpdate(BaseModel):
    """Schema for updating a question."""
    text: str | None = Field(default=None, min_length=1)
    image_url: str | None = Field(default=None, max_length=500)


class QuestionResponse(BaseModel):
    """Schema for question response."""
    id: UUID
    test_id: UUID
    text: str
    image_url: str | None

    model_config = {"from_attributes": True}


# ========== AnswerOption Schemas ==========

class AnswerOptionCreate(BaseModel):
    """Schema for creating an answer option."""
    text: str = Field(..., min_length=1)
    is_correct: bool = False


class AnswerOptionUpdate(BaseModel):
    """Schema for updating an answer option."""
    text: str | None = Field(default=None, min_length=1)
    is_correct: bool | None = None


class AnswerOptionResponse(BaseModel):
    """Schema for answer option response."""
    id: UUID
    question_id: UUID
    text: str
    is_correct: bool

    model_config = {"from_attributes": True}
