"""
AUTOTEST Driving Instructors Schemas
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class DrivingInstructorCatalogItemResponse(BaseModel):
    id: UUID
    slug: str
    full_name: str
    profile_image_url: str | None = None
    years_experience: int
    transmission: str
    car_model: str
    city: str
    region: str | None = None
    hourly_price_cents: int
    currency: str
    rating_avg: float = 0.0
    review_count: int = 0
    is_new: bool = False
    is_top_rated: bool = False


class DrivingInstructorCatalogResponse(BaseModel):
    total: int
    offset: int
    limit: int
    items: list[DrivingInstructorCatalogItemResponse]


class DrivingInstructorMetaResponse(BaseModel):
    cities: list[str]
    regions: list[str]
    transmissions: list[str]
    genders: list[str]


class DrivingInstructorMediaResponse(BaseModel):
    id: UUID
    media_type: str
    url: str
    caption: str | None = None
    sort_order: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class DrivingInstructorReviewResponse(BaseModel):
    id: UUID
    rating: int
    comment: str | None = None
    is_visible: bool
    created_at: datetime
    user_display_name: str | None = None


class DrivingInstructorDetailResponse(BaseModel):
    id: UUID
    slug: str
    full_name: str
    gender: str | None = None
    years_experience: int
    short_bio: str
    teaching_style: str | None = None
    city: str
    region: str | None = None
    service_areas: str | None = None
    transmission: str
    car_model: str
    car_year: int | None = None
    car_features: str | None = None
    hourly_price_cents: int
    currency: str
    min_lesson_minutes: int
    special_services: str | None = None
    phone: str
    telegram: str | None = None
    profile_image_url: str
    map_embed_url: str | None = None
    referral_code: str
    promo_code: str | None = None
    view_count: int = 0
    views_last_24h: int = 0
    lead_count: int = 0
    is_most_selected: bool = False
    is_top_rated: bool = False
    rating_avg: float = 0.0
    review_count: int = 0
    review_distribution: dict[str, int] = Field(default_factory=dict)
    media_items: list[DrivingInstructorMediaResponse] = Field(default_factory=list)
    reviews: list[DrivingInstructorReviewResponse] = Field(default_factory=list)
    disclaimer: str


class DrivingInstructorLeadCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: str = Field(..., min_length=5, max_length=40)
    requested_transmission: str | None = Field(default=None, max_length=20)
    comment: str | None = Field(default=None, max_length=4000)


class DrivingInstructorLeadResponse(BaseModel):
    id: UUID
    instructor_id: UUID
    user_id: UUID | None = None
    full_name: str
    phone: str
    requested_transmission: str | None = None
    comment: str | None = None
    source: str
    status: str
    created_at: datetime
    updated_at: datetime
    instructor_name: str | None = None
    user_email: str | None = None

    model_config = ConfigDict(from_attributes=True)


class DrivingInstructorLeadUpdate(BaseModel):
    status: str = Field(..., min_length=2, max_length=30)


class DrivingInstructorComplaintCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: str | None = Field(default=None, min_length=5, max_length=40)
    reason: str = Field(..., min_length=2, max_length=120)
    comment: str | None = Field(default=None, max_length=4000)


class DrivingInstructorComplaintResponse(BaseModel):
    id: UUID
    instructor_id: UUID
    user_id: UUID | None = None
    full_name: str
    phone: str | None = None
    reason: str
    comment: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    instructor_name: str | None = None
    user_email: str | None = None

    model_config = ConfigDict(from_attributes=True)


class DrivingInstructorComplaintUpdate(BaseModel):
    status: str = Field(..., min_length=2, max_length=30)


class DrivingInstructorReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(default=None, max_length=4000)


class DrivingInstructorReviewAdminUpdate(BaseModel):
    is_visible: bool | None = None
    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str | None = Field(default=None, max_length=4000)


class DrivingInstructorApplicationCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: str = Field(..., min_length=5, max_length=40)
    city: str = Field(..., min_length=2, max_length=120)
    region: str | None = Field(default=None, max_length=120)
    gender: str | None = Field(default=None, max_length=20)
    years_experience: int = Field(..., ge=0, le=80)
    transmission: str = Field(..., min_length=3, max_length=20)
    car_model: str = Field(..., min_length=2, max_length=120)
    hourly_price_cents: int = Field(..., ge=0)
    currency: str = Field(default="UZS", min_length=3, max_length=10)
    short_bio: str = Field(..., min_length=20, max_length=4000)
    profile_image_url: str = Field(..., min_length=1, max_length=2000)
    extra_image_urls: list[str] = Field(..., min_length=1, max_length=15)


class DrivingInstructorApplicationResponse(BaseModel):
    id: UUID
    user_id: UUID | None = None
    full_name: str
    phone: str
    city: str
    region: str | None = None
    gender: str | None = None
    years_experience: int
    transmission: str
    car_model: str
    hourly_price_cents: int
    currency: str
    short_bio: str
    profile_image_url: str
    extra_image_urls: list[str] = Field(default_factory=list)
    status: str
    rejection_reason: str | None = None
    reviewed_by_id: UUID | None = None
    reviewed_at: datetime | None = None
    submitted_from: str
    created_at: datetime
    updated_at: datetime
    user_email: str | None = None

    model_config = ConfigDict(from_attributes=True)


class DrivingInstructorApplicationUpdate(BaseModel):
    status: str = Field(..., min_length=2, max_length=30)
    rejection_reason: str | None = Field(default=None, max_length=4000)


class DrivingInstructorRegistrationSettingsResponse(BaseModel):
    is_paid_enabled: bool
    price_cents: int
    currency: str
    validity_days: int
    discount_percent: int
    campaign_title: str | None = None
    campaign_description: str | None = None
    free_banner_enabled: bool
    countdown_enabled: bool
    countdown_ends_at: datetime | None = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DrivingInstructorRegistrationSettingsUpdate(BaseModel):
    is_paid_enabled: bool | None = None
    price_cents: int | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=10)
    validity_days: int | None = Field(default=None, ge=1, le=3650)
    discount_percent: int | None = Field(default=None, ge=0, le=100)
    campaign_title: str | None = Field(default=None, max_length=255)
    campaign_description: str | None = Field(default=None, max_length=4000)
    free_banner_enabled: bool | None = None
    countdown_enabled: bool | None = None
    countdown_ends_at: datetime | None = None


class DrivingInstructorCreate(BaseModel):
    user_id: UUID | None = None
    slug: str | None = Field(default=None, min_length=2, max_length=140)
    full_name: str = Field(..., min_length=2, max_length=255)
    gender: str | None = Field(default=None, max_length=20)
    years_experience: int = Field(default=0, ge=0, le=80)
    short_bio: str = Field(..., min_length=20, max_length=1200)
    teaching_style: str | None = Field(default=None, max_length=8000)
    city: str = Field(..., min_length=2, max_length=120)
    region: str | None = Field(default=None, max_length=120)
    service_areas: str | None = Field(default=None, max_length=4000)
    transmission: str = Field(..., min_length=3, max_length=20)
    car_model: str = Field(..., min_length=2, max_length=120)
    car_year: int | None = Field(default=None, ge=1950, le=2100)
    car_features: str | None = Field(default=None, max_length=4000)
    hourly_price_cents: int = Field(..., ge=0)
    currency: str = Field(default="UZS", min_length=3, max_length=10)
    min_lesson_minutes: int = Field(default=60, ge=15, le=480)
    special_services: str | None = Field(default=None, max_length=4000)
    phone: str = Field(..., min_length=5, max_length=40)
    telegram: str | None = Field(default=None, max_length=120)
    profile_image_url: str = Field(..., min_length=1, max_length=2000)
    map_embed_url: str | None = Field(default=None, max_length=2000)
    referral_code: str | None = Field(default=None, min_length=2, max_length=80)
    promo_code_id: UUID | None = None
    is_verified: bool = False
    is_active: bool = True
    is_blocked: bool = False
    is_top_rated: bool = False


class DrivingInstructorUpdate(BaseModel):
    user_id: UUID | None = None
    slug: str | None = Field(default=None, min_length=2, max_length=140)
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    gender: str | None = Field(default=None, max_length=20)
    years_experience: int | None = Field(default=None, ge=0, le=80)
    short_bio: str | None = Field(default=None, min_length=20, max_length=1200)
    teaching_style: str | None = Field(default=None, max_length=8000)
    city: str | None = Field(default=None, min_length=2, max_length=120)
    region: str | None = Field(default=None, max_length=120)
    service_areas: str | None = Field(default=None, max_length=4000)
    transmission: str | None = Field(default=None, min_length=3, max_length=20)
    car_model: str | None = Field(default=None, min_length=2, max_length=120)
    car_year: int | None = Field(default=None, ge=1950, le=2100)
    car_features: str | None = Field(default=None, max_length=4000)
    hourly_price_cents: int | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=10)
    min_lesson_minutes: int | None = Field(default=None, ge=15, le=480)
    special_services: str | None = Field(default=None, max_length=4000)
    phone: str | None = Field(default=None, min_length=5, max_length=40)
    telegram: str | None = Field(default=None, max_length=120)
    profile_image_url: str | None = Field(default=None, min_length=1, max_length=2000)
    map_embed_url: str | None = Field(default=None, max_length=2000)
    referral_code: str | None = Field(default=None, min_length=2, max_length=80)
    promo_code_id: UUID | None = None
    is_verified: bool | None = None
    is_active: bool | None = None
    is_blocked: bool | None = None
    is_top_rated: bool | None = None


class DrivingInstructorAdminResponse(BaseModel):
    id: UUID
    user_id: UUID | None = None
    slug: str
    full_name: str
    gender: str | None = None
    years_experience: int
    short_bio: str
    teaching_style: str | None = None
    city: str
    region: str | None = None
    service_areas: str | None = None
    transmission: str
    car_model: str
    car_year: int | None = None
    car_features: str | None = None
    hourly_price_cents: int
    currency: str
    min_lesson_minutes: int
    special_services: str | None = None
    phone: str
    telegram: str | None = None
    profile_image_url: str
    map_embed_url: str | None = None
    referral_code: str
    promo_code_id: UUID | None = None
    promo_code: str | None = None
    is_verified: bool
    is_active: bool
    is_blocked: bool
    is_top_rated: bool
    view_count: int
    created_at: datetime
    updated_at: datetime
    approved_at: datetime | None = None
    lead_count: int = 0
    review_count: int = 0
    rating_avg: float = 0.0
    promo_redemption_count: int = 0
    media_items: list[DrivingInstructorMediaResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class DrivingInstructorMediaCreate(BaseModel):
    media_type: str = Field(default="image", max_length=20)
    url: str = Field(..., min_length=1, max_length=2000)
    caption: str | None = Field(default=None, max_length=255)
    sort_order: int = 0
    is_active: bool = True


class DrivingInstructorMediaUpdate(BaseModel):
    media_type: str | None = Field(default=None, max_length=20)
    url: str | None = Field(default=None, min_length=1, max_length=2000)
    caption: str | None = Field(default=None, max_length=255)
    sort_order: int | None = None
    is_active: bool | None = None


class DrivingInstructorPromoStatsItem(BaseModel):
    instructor_id: UUID
    instructor_name: str
    promo_code: str | None = None
    referral_code: str
    lead_count: int
    promo_redemption_count: int
    view_count: int


class DrivingInstructorPromoStatsResponse(BaseModel):
    items: list[DrivingInstructorPromoStatsItem]
