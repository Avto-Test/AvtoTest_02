"""
AUTOTEST Admin Schemas
Pydantic schemas for admin CRUD operations
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ========== Test Schemas ==========

class TestCreate(BaseModel):
    """Schema for creating a test."""
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    difficulty: str = Field(default="medium", max_length=50)
    is_active: bool = True
    is_premium: bool = False
    duration: int | None = Field(default=25, ge=1, le=300)


class TestUpdate(BaseModel):
    """Schema for updating a test."""
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    difficulty: str | None = Field(default=None, max_length=50)
    is_active: bool | None = None
    is_premium: bool | None = None
    duration: int | None = Field(default=None, ge=1, le=300)


class TestResponse(BaseModel):
    """Schema for test response."""
    id: UUID
    title: str
    description: str | None
    difficulty: str
    is_active: bool
    is_premium: bool
    duration: int | None

    model_config = {"from_attributes": True}


# ========== Lesson Schemas ==========

class LessonCreate(BaseModel):
    """Schema for creating a lesson."""
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    content_type: str = Field(default="link", max_length=30)
    content_url: str = Field(..., min_length=1, max_length=1000)
    thumbnail_url: str | None = Field(default=None, max_length=1000)
    topic: str | None = Field(default=None, max_length=120)
    section: str | None = Field(default=None, max_length=120)
    is_active: bool = True
    is_premium: bool = False
    sort_order: int = 0


class LessonUpdate(BaseModel):
    """Schema for updating a lesson."""
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    content_type: str | None = Field(default=None, max_length=30)
    content_url: str | None = Field(default=None, min_length=1, max_length=1000)
    thumbnail_url: str | None = Field(default=None, max_length=1000)
    topic: str | None = Field(default=None, max_length=120)
    section: str | None = Field(default=None, max_length=120)
    is_active: bool | None = None
    is_premium: bool | None = None
    sort_order: int | None = None


class LessonResponse(BaseModel):
    """Schema for lesson response."""
    id: UUID
    title: str
    description: str | None
    content_type: str
    content_url: str
    thumbnail_url: str | None
    topic: str | None
    section: str | None
    is_active: bool
    is_premium: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ========== Question Schemas ==========

class QuestionCreate(BaseModel):
    """Schema for creating a question."""
    text: str = Field(..., min_length=1)
    image_url: str | None = Field(default=None, max_length=500)
    video_url: str | None = Field(default=None, max_length=500)
    media_type: str = Field(default="text", max_length=20)
    topic: str | None = Field(default=None, max_length=100)
    category: str | None = Field(default=None, max_length=100)
    category_id: UUID | None = None
    difficulty: str = Field(default="medium", max_length=20)
    difficulty_percent: int = Field(default=50, ge=0, le=100)


class QuestionUpdate(BaseModel):
    """Schema for updating a question."""
    text: str | None = Field(default=None, min_length=1)
    image_url: str | None = Field(default=None, max_length=500)
    video_url: str | None = Field(default=None, max_length=500)
    media_type: str | None = Field(default=None, max_length=20)
    topic: str | None = Field(default=None, max_length=100)
    category: str | None = Field(default=None, max_length=100)
    category_id: UUID | None = None
    difficulty: str | None = Field(default=None, max_length=20)
    difficulty_percent: int | None = Field(default=None, ge=0, le=100)


class QuestionResponse(BaseModel):
    """Schema for question response."""
    id: UUID
    test_id: UUID | None = None
    text: str
    image_url: str | None
    video_url: str | None
    media_type: str
    topic: str | None
    category: str | None
    category_id: UUID | None = None
    difficulty: str
    difficulty_percent: int

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


class ImageUploadResponse(BaseModel):
    """Schema for uploaded image response."""
    url: str
    filename: str


class LessonUploadResponse(BaseModel):
    """Schema for uploaded lesson file response."""
    url: str
    filename: str
    content_type: str
    size_bytes: int


class AdminQuestionWithOptionsResponse(BaseModel):
    """Question response with nested answer options."""
    id: UUID
    test_id: UUID | None = None
    text: str
    image_url: str | None
    video_url: str | None
    media_type: str
    topic: str | None
    category: str | None
    category_id: UUID | None = None
    difficulty: str
    difficulty_percent: int
    answer_options: list[AnswerOptionResponse]

    model_config = {"from_attributes": True}


class AdminTestDetailResponse(BaseModel):
    """Admin test detail with full question tree."""
    id: UUID
    title: str
    description: str | None = None
    difficulty: str
    is_active: bool
    is_premium: bool
    duration: int | None
    questions: list[AdminQuestionWithOptionsResponse]

    model_config = {"from_attributes": True}


# ========== User Schemas ==========

class AdminUserResponse(BaseModel):
    """Admin user response with subscription info."""
    id: UUID
    email: str
    full_name: str | None
    is_active: bool
    is_verified: bool
    is_admin: bool
    is_premium: bool
    created_at: datetime
    subscription_plan: str | None = None
    subscription_status: str | None = None
    subscription_expires_at: datetime | None = None

    model_config = {"from_attributes": True}


class AdminUserUpdate(BaseModel):
    """Admin user update payload."""
    is_active: bool | None = None
    is_verified: bool | None = None
    is_admin: bool | None = None


class AdminUserSubscriptionUpdate(BaseModel):
    """Admin subscription update payload."""
    plan: str = Field(default="premium", max_length=50)
    status: str = Field(default="active", max_length=50)
    expires_at: datetime | None = None


# ========== Subscription Plan Schemas ==========

class SubscriptionPlanCreate(BaseModel):
    """Schema for creating a subscription plan."""
    code: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    price_cents: int = Field(..., ge=1)
    currency: str = Field(default="UZS", min_length=3, max_length=10)
    duration_days: int = Field(default=30, ge=1, le=3650)
    is_active: bool = True
    sort_order: int = 0


class SubscriptionPlanUpdate(BaseModel):
    """Schema for updating a subscription plan."""
    code: str | None = Field(default=None, min_length=3, max_length=50)
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    price_cents: int | None = Field(default=None, ge=1)
    currency: str | None = Field(default=None, min_length=3, max_length=10)
    duration_days: int | None = Field(default=None, ge=1, le=3650)
    is_active: bool | None = None
    sort_order: int | None = None


class SubscriptionPlanResponse(BaseModel):
    """Subscription plan response."""
    id: UUID
    code: str
    name: str
    description: str | None
    price_cents: int
    currency: str
    duration_days: int
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ========== Promo Code Schemas ==========

class PromoCodeCreate(BaseModel):
    """Schema for creating a promo code."""
    code: str = Field(..., min_length=3, max_length=50)
    name: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    discount_type: str = Field(default="percent", max_length=20)
    discount_value: int = Field(default=0, ge=0)
    school_id: UUID | None = None
    group_id: UUID | None = None
    max_redemptions: int | None = Field(default=None, ge=1)
    max_uses: int | None = Field(default=None, ge=1)
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    is_active: bool = True
    applicable_plan_ids: list[UUID] = Field(default_factory=list)


class PromoCodeUpdate(BaseModel):
    """Schema for updating a promo code."""
    code: str | None = Field(default=None, min_length=3, max_length=50)
    name: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    discount_type: str | None = Field(default=None, max_length=20)
    discount_value: int | None = Field(default=None, ge=0)
    school_id: UUID | None = None
    group_id: UUID | None = None
    max_redemptions: int | None = Field(default=None, ge=1)
    max_uses: int | None = Field(default=None, ge=1)
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    is_active: bool | None = None
    applicable_plan_ids: list[UUID] | None = None


class PromoCodeResponse(BaseModel):
    """Promo code response."""
    id: UUID
    code: str
    name: str | None
    description: str | None
    discount_type: str
    discount_value: int
    school_id: UUID | None = None
    group_id: UUID | None = None
    max_redemptions: int | None
    max_uses: int | None = None
    redeemed_count: int
    current_uses: int = 0
    starts_at: datetime | None
    expires_at: datetime | None
    is_active: bool
    applicable_plan_ids: list[UUID]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ========== Violation Schemas ==========

class ViolationLogResponse(BaseModel):
    """Admin violation log response."""
    id: UUID
    user_id: UUID | None
    guest_id: str | None
    test_id: UUID | None
    attempt_id: UUID | None
    event_type: str
    details: dict
    created_at: datetime
    user_email: str | None = None
    test_title: str | None = None

    model_config = {"from_attributes": True}


# ========== Question Category Schemas ==========

class QuestionCategoryCreate(BaseModel):
    """Schema for creating a question category."""
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    is_active: bool = True


class QuestionCategoryUpdate(BaseModel):
    """Schema for updating a question category."""
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None


class QuestionCategoryResponse(BaseModel):
    """Schema for question category response."""
    id: UUID
    name: str
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
