"""
AUTOTEST Driving Schools Schemas
"""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, EmailStr, Field

from core.admin_statuses import (
    DrivingSchoolLeadStatus,
    DrivingSchoolPartnerApplicationStatus,
    coerce_status_value,
    parse_status_value,
)


def _parse_school_lead_status(value: object) -> DrivingSchoolLeadStatus:
    return parse_status_value(DrivingSchoolLeadStatus, value)


def _coerce_school_lead_status(value: object) -> DrivingSchoolLeadStatus:
    return coerce_status_value(
        DrivingSchoolLeadStatus,
        value,
        context="driving_school_lead.status",
        fallback=DrivingSchoolLeadStatus.NEW,
    )


def _parse_school_partner_application_status(value: object) -> DrivingSchoolPartnerApplicationStatus:
    return parse_status_value(DrivingSchoolPartnerApplicationStatus, value)


def _coerce_school_partner_application_status(value: object) -> DrivingSchoolPartnerApplicationStatus:
    return coerce_status_value(
        DrivingSchoolPartnerApplicationStatus,
        value,
        context="driving_school_partner_application.status",
        fallback=DrivingSchoolPartnerApplicationStatus.PENDING,
    )


DrivingSchoolLeadStatusRequest = Annotated[DrivingSchoolLeadStatus, BeforeValidator(_parse_school_lead_status)]
DrivingSchoolLeadStatusResponse = Annotated[DrivingSchoolLeadStatus, BeforeValidator(_coerce_school_lead_status)]
DrivingSchoolPartnerApplicationStatusRequest = Annotated[
    DrivingSchoolPartnerApplicationStatus,
    BeforeValidator(_parse_school_partner_application_status),
]
DrivingSchoolPartnerApplicationStatusResponse = Annotated[
    DrivingSchoolPartnerApplicationStatus,
    BeforeValidator(_coerce_school_partner_application_status),
]


class DrivingSchoolCatalogItemResponse(BaseModel):
    id: UUID
    slug: str
    name: str
    short_description: str | None = None
    city: str
    region: str | None = None
    logo_url: str | None = None
    rating_avg: float = 0.0
    rating_count: int = 0
    categories: list[str] = Field(default_factory=list)
    starting_price_cents: int | None = None
    currency: str | None = None
    min_duration_weeks: int | None = None
    referral_code: str
    promo_code: str | None = None


class DrivingSchoolCatalogResponse(BaseModel):
    total: int
    offset: int
    limit: int
    items: list[DrivingSchoolCatalogItemResponse]


class DrivingSchoolMetaResponse(BaseModel):
    cities: list[str]
    regions: list[str]
    categories: list[str]


class DrivingSchoolMediaResponse(BaseModel):
    id: UUID
    media_type: str
    url: str
    caption: str | None = None
    sort_order: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class DrivingSchoolCourseResponse(BaseModel):
    id: UUID
    category_code: str
    duration_weeks: int | None = None
    price_cents: int | None = None
    currency: str
    installment_available: bool
    description: str | None = None
    sort_order: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class DrivingSchoolReviewResponse(BaseModel):
    id: UUID
    rating: int
    comment: str | None = None
    is_visible: bool
    created_at: datetime
    user_display_name: str | None = None


class DrivingSchoolDetailResponse(BaseModel):
    id: UUID
    slug: str
    name: str
    short_description: str | None = None
    full_description: str | None = None
    city: str
    region: str | None = None
    address: str | None = None
    landmark: str | None = None
    phone: str
    telegram: str | None = None
    website: str | None = None
    work_hours: str | None = None
    license_info: str | None = None
    years_active: int | None = None
    logo_url: str | None = None
    map_embed_url: str | None = None
    referral_code: str
    promo_code: str | None = None
    rating_avg: float = 0.0
    rating_count: int = 0
    courses: list[DrivingSchoolCourseResponse] = Field(default_factory=list)
    media_items: list[DrivingSchoolMediaResponse] = Field(default_factory=list)
    reviews: list[DrivingSchoolReviewResponse] = Field(default_factory=list)


class DrivingSchoolLeadCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: str = Field(..., min_length=5, max_length=40)
    requested_category: str | None = Field(default=None, max_length=30)
    comment: str | None = Field(default=None, max_length=4000)


class DrivingSchoolLeadResponse(BaseModel):
    id: UUID
    school_id: UUID
    user_id: UUID | None = None
    full_name: str
    phone: str
    requested_category: str | None = None
    comment: str | None = None
    source: str
    status: DrivingSchoolLeadStatusResponse
    created_at: datetime
    updated_at: datetime
    school_name: str | None = None
    user_email: str | None = None

    model_config = ConfigDict(from_attributes=True)


class DrivingSchoolLeadUpdate(BaseModel):
    status: DrivingSchoolLeadStatusRequest


class DrivingSchoolReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(default=None, max_length=4000)


class DrivingSchoolReviewAdminUpdate(BaseModel):
    is_visible: bool | None = None
    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str | None = Field(default=None, max_length=4000)


class DrivingSchoolPartnerApplicationCreate(BaseModel):
    school_name: str = Field(..., min_length=2, max_length=255)
    city: str = Field(..., min_length=2, max_length=120)
    responsible_person: str = Field(..., min_length=2, max_length=255)
    phone: str = Field(..., min_length=5, max_length=40)
    email: EmailStr
    note: str | None = Field(default=None, max_length=4000)


class DrivingSchoolPartnerApplicationResponse(BaseModel):
    id: UUID
    user_id: UUID | None = None
    linked_school_id: UUID | None = None
    school_name: str
    city: str
    responsible_person: str
    phone: str
    email: str
    note: str | None = None
    status: DrivingSchoolPartnerApplicationStatusResponse
    reviewed_by_id: UUID | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DrivingSchoolPartnerApplicationUpdate(BaseModel):
    status: DrivingSchoolPartnerApplicationStatusRequest
    linked_school_id: UUID | None = None


class DrivingSchoolCreate(BaseModel):
    owner_user_id: UUID | None = None
    slug: str | None = Field(default=None, min_length=2, max_length=140)
    name: str = Field(..., min_length=2, max_length=255)
    short_description: str | None = Field(default=None, max_length=500)
    full_description: str | None = Field(default=None, max_length=8000)
    city: str = Field(..., min_length=2, max_length=120)
    region: str | None = Field(default=None, max_length=120)
    address: str | None = Field(default=None, max_length=500)
    landmark: str | None = Field(default=None, max_length=255)
    phone: str = Field(..., min_length=5, max_length=40)
    telegram: str | None = Field(default=None, max_length=120)
    website: str | None = Field(default=None, max_length=255)
    work_hours: str | None = Field(default=None, max_length=255)
    license_info: str | None = Field(default=None, max_length=255)
    years_active: int | None = Field(default=None, ge=0, le=100)
    logo_url: str | None = Field(default=None, max_length=1000)
    map_embed_url: str | None = Field(default=None, max_length=2000)
    referral_code: str | None = Field(default=None, min_length=2, max_length=80)
    promo_code_id: UUID | None = None
    is_active: bool = True


class DrivingSchoolUpdate(BaseModel):
    owner_user_id: UUID | None = None
    slug: str | None = Field(default=None, min_length=2, max_length=140)
    name: str | None = Field(default=None, min_length=2, max_length=255)
    short_description: str | None = Field(default=None, max_length=500)
    full_description: str | None = Field(default=None, max_length=8000)
    city: str | None = Field(default=None, min_length=2, max_length=120)
    region: str | None = Field(default=None, max_length=120)
    address: str | None = Field(default=None, max_length=500)
    landmark: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, min_length=5, max_length=40)
    telegram: str | None = Field(default=None, max_length=120)
    website: str | None = Field(default=None, max_length=255)
    work_hours: str | None = Field(default=None, max_length=255)
    license_info: str | None = Field(default=None, max_length=255)
    years_active: int | None = Field(default=None, ge=0, le=100)
    logo_url: str | None = Field(default=None, max_length=1000)
    map_embed_url: str | None = Field(default=None, max_length=2000)
    referral_code: str | None = Field(default=None, min_length=2, max_length=80)
    promo_code_id: UUID | None = None
    is_active: bool | None = None


class DrivingSchoolAdminResponse(BaseModel):
    id: UUID
    owner_user_id: UUID | None = None
    slug: str
    name: str
    short_description: str | None = None
    full_description: str | None = None
    city: str
    region: str | None = None
    address: str | None = None
    landmark: str | None = None
    phone: str
    telegram: str | None = None
    website: str | None = None
    work_hours: str | None = None
    license_info: str | None = None
    years_active: int | None = None
    logo_url: str | None = None
    map_embed_url: str | None = None
    referral_code: str
    promo_code_id: UUID | None = None
    promo_code: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    lead_count: int = 0
    review_count: int = 0
    rating_avg: float = 0.0
    promo_redemption_count: int = 0
    courses: list[DrivingSchoolCourseResponse] = Field(default_factory=list)
    media_items: list[DrivingSchoolMediaResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class DrivingSchoolCourseCreate(BaseModel):
    category_code: str = Field(..., min_length=1, max_length=20)
    duration_weeks: int | None = Field(default=None, ge=1, le=520)
    price_cents: int | None = Field(default=None, ge=0)
    currency: str = Field(default="UZS", min_length=3, max_length=10)
    installment_available: bool = False
    description: str | None = Field(default=None, max_length=4000)
    is_active: bool = True
    sort_order: int = 0


class DrivingSchoolCourseUpdate(BaseModel):
    category_code: str | None = Field(default=None, min_length=1, max_length=20)
    duration_weeks: int | None = Field(default=None, ge=1, le=520)
    price_cents: int | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=10)
    installment_available: bool | None = None
    description: str | None = Field(default=None, max_length=4000)
    is_active: bool | None = None
    sort_order: int | None = None


class DrivingSchoolMediaCreate(BaseModel):
    media_type: str = Field(default="image", max_length=20)
    url: str = Field(..., min_length=1, max_length=2000)
    caption: str | None = Field(default=None, max_length=255)
    sort_order: int = 0
    is_active: bool = True


class DrivingSchoolMediaUpdate(BaseModel):
    media_type: str | None = Field(default=None, max_length=20)
    url: str | None = Field(default=None, min_length=1, max_length=2000)
    caption: str | None = Field(default=None, max_length=255)
    sort_order: int | None = None
    is_active: bool | None = None


class DrivingSchoolPromoStatsItem(BaseModel):
    school_id: UUID
    school_name: str
    promo_code: str | None = None
    referral_code: str
    lead_count: int
    promo_redemption_count: int


class DrivingSchoolPromoStatsResponse(BaseModel):
    items: list[DrivingSchoolPromoStatsItem]
