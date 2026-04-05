"""
AUTOTEST Driving Schools Public Router
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.auth.router import get_current_user, resolve_user_from_access_token
from api.driving_schools.schemas import (
    DrivingSchoolAdminResponse,
    DrivingSchoolCatalogItemResponse,
    DrivingSchoolCatalogResponse,
    DrivingSchoolDetailResponse,
    DrivingSchoolMediaCreate,
    DrivingSchoolMediaResponse,
    DrivingSchoolMediaUpdate,
    DrivingSchoolLeadCreate,
    DrivingSchoolLeadResponse,
    DrivingSchoolMetaResponse,
    DrivingSchoolPartnerApplicationCreate,
    DrivingSchoolPartnerApplicationResponse,
    DrivingSchoolReviewCreate,
    DrivingSchoolReviewResponse,
    DrivingSchoolUpdate,
)
from core.admin_statuses import (
    DrivingSchoolLeadStatus,
    DrivingSchoolPartnerApplicationStatus,
    coerce_status_value,
)
from core.config import settings
from core.public_urls import resolve_public_upload_url
from database.session import get_db
from models.analytics_event import AnalyticsEvent
from models.driving_school import DrivingSchool
from models.driving_school_lead import DrivingSchoolLead
from models.driving_school_media import DrivingSchoolMedia
from models.driving_school_partner_application import DrivingSchoolPartnerApplication
from models.driving_school_review import DrivingSchoolReview
from models.user import User
from models.user_notification import UserNotification

router = APIRouter(prefix="/driving-schools", tags=["driving-schools"])

ALLOWED_OWNER_MEDIA_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_OWNER_MEDIA_SIZE_BYTES = 10 * 1024 * 1024
OWNER_UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads" / "driving_schools"
ALLOWED_SCHOOL_MEDIA_TYPES = {"image", "video"}


def _average_rating(school: DrivingSchool) -> tuple[float, int]:
    visible_reviews = [review for review in school.reviews if review.is_visible]
    if not visible_reviews:
        return 0.0, 0
    score = sum(review.rating for review in visible_reviews) / len(visible_reviews)
    return round(float(score), 2), len(visible_reviews)


def _starting_price(school: DrivingSchool) -> tuple[int | None, str | None]:
    active_courses = [course for course in school.courses if course.is_active and course.price_cents is not None]
    if not active_courses:
        return None, None
    cheapest = min(active_courses, key=lambda course: course.price_cents if course.price_cents is not None else 10**18)
    return cheapest.price_cents, cheapest.currency


def _min_duration_weeks(school: DrivingSchool) -> int | None:
    durations = [course.duration_weeks for course in school.courses if course.is_active and course.duration_weeks is not None]
    return min(durations) if durations else None


def _categories(school: DrivingSchool) -> list[str]:
    return sorted({course.category_code.strip().upper() for course in school.courses if course.is_active and course.category_code})


def _user_display_name(user: User | None) -> str | None:
    if user is None:
        return None
    if user.full_name:
        return user.full_name
    if user.email:
        return user.email.split("@")[0]
    return None


def _to_owner_school_response(school: DrivingSchool) -> DrivingSchoolAdminResponse:
    visible_reviews = [review for review in school.reviews if review.is_visible]
    rating_avg = (
        round(sum(review.rating for review in visible_reviews) / len(visible_reviews), 2)
        if visible_reviews
        else 0.0
    )
    return DrivingSchoolAdminResponse(
        id=school.id,
        owner_user_id=school.owner_user_id,
        slug=school.slug,
        name=school.name,
        short_description=school.short_description,
        full_description=school.full_description,
        city=school.city,
        region=school.region,
        address=school.address,
        landmark=school.landmark,
        phone=school.phone,
        telegram=school.telegram,
        website=school.website,
        work_hours=school.work_hours,
        license_info=school.license_info,
        years_active=school.years_active,
        logo_url=school.logo_url,
        map_embed_url=school.map_embed_url,
        referral_code=school.referral_code,
        promo_code_id=school.promo_code_id,
        promo_code=school.promo_code.code if school.promo_code else None,
        is_active=school.is_active,
        created_at=school.created_at,
        updated_at=school.updated_at,
        lead_count=len(school.leads),
        review_count=len(visible_reviews),
        rating_avg=rating_avg,
        promo_redemption_count=0,
        courses=sorted(school.courses, key=lambda item: (item.sort_order, item.created_at)),
        media_items=sorted(school.media_items, key=lambda item: (item.sort_order, item.created_at)),
    )


def _normalize_school_media_type(value: str | None) -> str:
    media_type = (value or "image").strip().lower()
    if media_type not in ALLOWED_SCHOOL_MEDIA_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Media type faqat image yoki video bo'lishi mumkin.",
        )
    return media_type


async def _get_optional_user(request: Request, db: AsyncSession) -> User | None:
    token: str | None = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    else:
        token = request.cookies.get("access_token")

    if not token:
        return None

    return await resolve_user_from_access_token(token, db=db, include_subscription=False)


async def _get_my_school(current_user: User, db: AsyncSession) -> DrivingSchool | None:
    result = await db.execute(
        select(DrivingSchool)
        .where(DrivingSchool.owner_user_id == current_user.id)
        .options(
            selectinload(DrivingSchool.courses),
            selectinload(DrivingSchool.media_items),
            selectinload(DrivingSchool.reviews).selectinload(DrivingSchoolReview.user),
            selectinload(DrivingSchool.promo_code),
            selectinload(DrivingSchool.leads).selectinload(DrivingSchoolLead.user),
        )
    )
    return result.scalar_one_or_none()


async def _get_school_by_slug_or_404(
    slug: str,
    db: AsyncSession,
    *,
    include_inactive: bool = False,
) -> DrivingSchool:
    stmt = (
        select(DrivingSchool)
        .where(DrivingSchool.slug == slug)
        .options(
            selectinload(DrivingSchool.courses),
            selectinload(DrivingSchool.media_items),
            selectinload(DrivingSchool.reviews).selectinload(DrivingSchoolReview.user),
            selectinload(DrivingSchool.promo_code),
        )
    )
    if not include_inactive:
        stmt = stmt.where(DrivingSchool.is_active == True)  # noqa: E712

    result = await db.execute(stmt)
    school = result.scalar_one_or_none()
    if school is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driving school not found")
    return school


@router.get("", response_model=DrivingSchoolCatalogResponse)
async def list_driving_schools(
    q: str | None = Query(default=None, max_length=120),
    city: str | None = Query(default=None, max_length=120),
    region: str | None = Query(default=None, max_length=120),
    category: str | None = Query(default=None, max_length=20),
    price_min_cents: int | None = Query(default=None, ge=0),
    price_max_cents: int | None = Query(default=None, ge=0),
    rating_min: float | None = Query(default=None, ge=0.0, le=5.0),
    duration_max_weeks: int | None = Query(default=None, ge=1, le=520),
    sort_by: Literal["rating", "price", "name", "newest"] = "rating",
    limit: int = Query(default=24, ge=1, le=120),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> DrivingSchoolCatalogResponse:
    result = await db.execute(
        select(DrivingSchool)
        .where(DrivingSchool.is_active == True)  # noqa: E712
        .options(
            selectinload(DrivingSchool.courses),
            selectinload(DrivingSchool.reviews),
            selectinload(DrivingSchool.promo_code),
        )
        .order_by(DrivingSchool.created_at.desc())
    )
    schools = list(result.scalars().all())

    q_value = (q or "").strip().lower()
    city_value = (city or "").strip().lower()
    region_value = (region or "").strip().lower()
    category_value = (category or "").strip().upper()

    filtered: list[DrivingSchoolCatalogItemResponse] = []
    for school in schools:
        school_categories = _categories(school)
        starting_price_cents, currency = _starting_price(school)
        min_duration = _min_duration_weeks(school)
        avg_rating, rating_count = _average_rating(school)

        haystack = " ".join(
            filter(
                None,
                [
                    school.name,
                    school.short_description,
                    school.full_description,
                    school.city,
                    school.region,
                ],
            )
        ).lower()

        if q_value and q_value not in haystack:
            continue
        if city_value and city_value not in (school.city or "").lower():
            continue
        if region_value and region_value not in (school.region or "").lower():
            continue
        if category_value and category_value not in school_categories:
            continue
        if price_min_cents is not None and (starting_price_cents is None or starting_price_cents < price_min_cents):
            continue
        if price_max_cents is not None and (starting_price_cents is None or starting_price_cents > price_max_cents):
            continue
        if rating_min is not None and avg_rating < rating_min:
            continue
        if duration_max_weeks is not None and (min_duration is None or min_duration > duration_max_weeks):
            continue

        filtered.append(
            DrivingSchoolCatalogItemResponse(
                id=school.id,
                slug=school.slug,
                name=school.name,
                short_description=school.short_description,
                city=school.city,
                region=school.region,
                logo_url=school.logo_url,
                rating_avg=avg_rating,
                rating_count=rating_count,
                categories=school_categories,
                starting_price_cents=starting_price_cents,
                currency=currency,
                min_duration_weeks=min_duration,
                referral_code=school.referral_code,
                promo_code=school.promo_code.code if school.promo_code else None,
            )
        )

    if sort_by == "name":
        filtered.sort(key=lambda item: item.name.lower())
    elif sort_by == "price":
        filtered.sort(key=lambda item: item.starting_price_cents if item.starting_price_cents is not None else 10**18)
    elif sort_by == "newest":
        # Preserve DB order (already latest first)
        pass
    else:
        filtered.sort(key=lambda item: (item.rating_avg, item.rating_count), reverse=True)

    total = len(filtered)
    paginated = filtered[offset : offset + limit]
    return DrivingSchoolCatalogResponse(
        total=total,
        offset=offset,
        limit=limit,
        items=paginated,
    )


@router.get("/meta", response_model=DrivingSchoolMetaResponse)
async def driving_school_meta(
    db: AsyncSession = Depends(get_db),
) -> DrivingSchoolMetaResponse:
    result = await db.execute(
        select(DrivingSchool)
        .where(DrivingSchool.is_active == True)  # noqa: E712
        .options(selectinload(DrivingSchool.courses))
    )
    schools = list(result.scalars().all())
    cities = sorted({school.city for school in schools if school.city})
    regions = sorted({school.region for school in schools if school.region})
    categories = sorted(
        {
            course.category_code.strip().upper()
            for school in schools
            for course in school.courses
            if course.is_active and course.category_code
        }
    )
    return DrivingSchoolMetaResponse(cities=cities, regions=regions, categories=categories)


@router.get("/me/summary")
async def my_school_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    school = await _get_my_school(current_user, db)
    app_result = await db.execute(
        select(DrivingSchoolPartnerApplication)
        .where(
            (DrivingSchoolPartnerApplication.user_id == current_user.id)
            | (DrivingSchoolPartnerApplication.email == current_user.email)
        )
        .order_by(DrivingSchoolPartnerApplication.created_at.desc())
    )
    latest_application = app_result.scalars().first()
    return {
        "school": _to_owner_school_response(school).model_dump(mode="json") if school else None,
        "latest_application": (
            DrivingSchoolPartnerApplicationResponse.model_validate(latest_application).model_dump(mode="json")
            if latest_application
            else None
        ),
    }


@router.put("/me/profile", response_model=DrivingSchoolAdminResponse)
async def update_my_school_profile(
    payload: DrivingSchoolUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DrivingSchoolAdminResponse:
    school = await _get_my_school(current_user, db)
    if school is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driving school profile not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if key in {"slug", "owner_user_id", "promo_code_id", "referral_code", "is_active"}:
            continue
        if isinstance(value, str):
            setattr(school, key, value.strip() if value else None)
        else:
            setattr(school, key, value)

    school.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(school)
    school = await _get_my_school(current_user, db)
    if school is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driving school profile not found")
    return _to_owner_school_response(school)


@router.post("/me/media/upload", status_code=status.HTTP_201_CREATED)
async def upload_my_school_media(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    school = await _get_my_school(current_user, db)
    if school is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driving school profile not found")

    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File name is required")

    extension = Path(file.filename).suffix.lower()
    if extension not in ALLOWED_OWNER_MEDIA_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported media format")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    if len(content) > MAX_OWNER_MEDIA_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File is too large")

    OWNER_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    saved_path = OWNER_UPLOADS_DIR / filename
    saved_path.write_bytes(content)

    return {
        "url": resolve_public_upload_url(
            request,
            f"/uploads/driving_schools/{filename}",
        ),
        "filename": filename,
    }


@router.post("/me/media", response_model=DrivingSchoolMediaResponse, status_code=status.HTTP_201_CREATED)
async def create_my_school_media(
    payload: DrivingSchoolMediaCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DrivingSchoolMedia:
    school = await _get_my_school(current_user, db)
    if school is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driving school profile not found")

    media_type = _normalize_school_media_type(payload.media_type)
    media_url = payload.url.strip()
    if not media_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Media URL bo'sh bo'lishi mumkin emas.")

    next_sort_order = payload.sort_order
    if next_sort_order <= 0:
        if school.media_items:
            next_sort_order = max(item.sort_order for item in school.media_items) + 1
        else:
            next_sort_order = 0

    row = DrivingSchoolMedia(
        school_id=school.id,
        media_type=media_type,
        url=media_url,
        caption=payload.caption.strip() if payload.caption else None,
        sort_order=next_sort_order,
        is_active=payload.is_active,
    )
    db.add(row)
    school.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(row)
    return row


@router.put("/me/media/{media_id}", response_model=DrivingSchoolMediaResponse)
async def update_my_school_media(
    media_id: UUID,
    payload: DrivingSchoolMediaUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DrivingSchoolMedia:
    school = await _get_my_school(current_user, db)
    if school is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driving school profile not found")

    result = await db.execute(
        select(DrivingSchoolMedia).where(
            DrivingSchoolMedia.id == media_id,
            DrivingSchoolMedia.school_id == school.id,
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media item not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if key == "media_type":
            setattr(row, key, _normalize_school_media_type(value))
            continue
        if isinstance(value, str):
            setattr(row, key, value.strip())
        else:
            setattr(row, key, value)

    school.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/me/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_school_media(
    media_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    school = await _get_my_school(current_user, db)
    if school is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driving school profile not found")

    result = await db.execute(
        select(DrivingSchoolMedia).where(
            DrivingSchoolMedia.id == media_id,
            DrivingSchoolMedia.school_id == school.id,
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media item not found")

    await db.delete(row)
    school.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me/leads", response_model=list[DrivingSchoolLeadResponse])
async def list_my_school_leads(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DrivingSchoolLeadResponse]:
    school = await _get_my_school(current_user, db)
    if school is None:
        return []
    items = sorted(school.leads, key=lambda item: item.created_at, reverse=True)
    return [
        DrivingSchoolLeadResponse(
            id=item.id,
            school_id=item.school_id,
            user_id=item.user_id,
            full_name=item.full_name,
            phone=item.phone,
            requested_category=item.requested_category,
            comment=item.comment,
            source=item.source,
            status=item.status,
            created_at=item.created_at,
            updated_at=item.updated_at,
            school_name=school.name,
            user_email=item.user.email if item.user else None,
        )
        for item in items[:200]
    ]


@router.get("/me/reviews", response_model=list[DrivingSchoolReviewResponse])
async def list_my_school_reviews(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DrivingSchoolReviewResponse]:
    school = await _get_my_school(current_user, db)
    if school is None:
        return []
    visible_reviews = [review for review in school.reviews if review.is_visible]
    visible_reviews.sort(key=lambda item: item.created_at, reverse=True)
    return [
        DrivingSchoolReviewResponse(
            id=review.id,
            rating=review.rating,
            comment=review.comment,
            is_visible=review.is_visible,
            created_at=review.created_at,
            user_display_name=_user_display_name(review.user),
        )
        for review in visible_reviews[:200]
    ]


@router.get("/{school_slug}", response_model=DrivingSchoolDetailResponse)
async def get_driving_school_detail(
    school_slug: str,
    db: AsyncSession = Depends(get_db),
) -> DrivingSchoolDetailResponse:
    school = await _get_school_by_slug_or_404(school_slug, db)
    avg_rating, rating_count = _average_rating(school)
    visible_reviews = [
        DrivingSchoolReviewResponse(
            id=review.id,
            rating=review.rating,
            comment=review.comment,
            is_visible=review.is_visible,
            created_at=review.created_at,
            user_display_name=_user_display_name(review.user),
        )
        for review in school.reviews
        if review.is_visible
    ]
    visible_reviews.sort(key=lambda item: item.created_at, reverse=True)

    courses = [course for course in school.courses if course.is_active]
    courses.sort(key=lambda course: (course.sort_order, course.category_code))
    media_items = [item for item in school.media_items if item.is_active]
    media_items.sort(key=lambda item: (item.sort_order, item.created_at))

    return DrivingSchoolDetailResponse(
        id=school.id,
        slug=school.slug,
        name=school.name,
        short_description=school.short_description,
        full_description=school.full_description,
        city=school.city,
        region=school.region,
        address=school.address,
        landmark=school.landmark,
        phone=school.phone,
        telegram=school.telegram,
        website=school.website,
        work_hours=school.work_hours,
        license_info=school.license_info,
        years_active=school.years_active,
        logo_url=school.logo_url,
        map_embed_url=school.map_embed_url,
        referral_code=school.referral_code,
        promo_code=school.promo_code.code if school.promo_code else None,
        rating_avg=avg_rating,
        rating_count=rating_count,
        courses=courses,
        media_items=media_items,
        reviews=visible_reviews,
    )


@router.post("/{school_slug}/leads", status_code=status.HTTP_201_CREATED)
async def submit_school_lead(
    school_slug: str,
    payload: DrivingSchoolLeadCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    school = await _get_school_by_slug_or_404(school_slug, db)
    current_user = await _get_optional_user(request, db)

    lead = DrivingSchoolLead(
        school_id=school.id,
        user_id=current_user.id if current_user else None,
        full_name=payload.full_name.strip(),
        phone=payload.phone.strip(),
        requested_category=payload.requested_category.strip().upper() if payload.requested_category else None,
        comment=payload.comment.strip() if payload.comment else None,
        source="web",
        status=DrivingSchoolLeadStatus.NEW.value,
    )
    db.add(lead)
    await db.flush()

    admins_result = await db.execute(select(User).where(User.is_admin == True))  # noqa: E712
    admins = list(admins_result.scalars().all())
    for admin in admins:
        db.add(
            UserNotification(
                user_id=admin.id,
                notification_type="driving_school_lead",
                title="Yangi avtomaktab so'rovi",
                message=f"{payload.full_name} ({payload.phone}) {school.name} uchun bog'lanish so'rovi yubordi.",
                payload={
                    "school_id": str(school.id),
                    "school_name": school.name,
                    "lead_id": str(lead.id),
                    "requested_category": payload.requested_category,
                },
            )
        )

    if current_user is not None:
        db.add(
            UserNotification(
                user_id=current_user.id,
                notification_type="driving_school_lead_submitted",
                title="So'rovingiz qabul qilindi",
                message=f"{school.name} avtomaktabiga yuborgan so'rovingiz qabul qilindi.",
                payload={
                    "school_id": str(school.id),
                    "school_slug": school.slug,
                    "lead_id": str(lead.id),
                },
            )
        )

    if school.owner_user_id is not None:
        db.add(
            UserNotification(
                user_id=school.owner_user_id,
                notification_type="driving_school_owner_lead",
                title="Yangi so'rov",
                message=f"{payload.full_name} sizning avtomaktab profilingizga so'rov yubordi.",
                payload={"school_id": str(school.id), "lead_id": str(lead.id), "phone": payload.phone},
            )
        )

    await db.commit()
    return {"status": "ok"}


@router.get("/{school_slug}/reviews", response_model=list[DrivingSchoolReviewResponse])
async def list_school_reviews(
    school_slug: str,
    limit: int = Query(default=40, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[DrivingSchoolReviewResponse]:
    school = await _get_school_by_slug_or_404(school_slug, db)
    visible_reviews = [
        DrivingSchoolReviewResponse(
            id=review.id,
            rating=review.rating,
            comment=review.comment,
            is_visible=review.is_visible,
            created_at=review.created_at,
            user_display_name=_user_display_name(review.user),
        )
        for review in school.reviews
        if review.is_visible
    ]
    visible_reviews.sort(key=lambda item: item.created_at, reverse=True)
    return visible_reviews[:limit]


@router.post("/{school_slug}/reviews", response_model=DrivingSchoolReviewResponse)
async def submit_school_review(
    school_slug: str,
    payload: DrivingSchoolReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DrivingSchoolReviewResponse:
    school = await _get_school_by_slug_or_404(school_slug, db)

    result = await db.execute(
        select(DrivingSchoolReview).where(
            DrivingSchoolReview.school_id == school.id,
            DrivingSchoolReview.user_id == current_user.id,
        )
    )
    review = result.scalar_one_or_none()

    if review is None:
        review = DrivingSchoolReview(
            school_id=school.id,
            user_id=current_user.id,
            rating=payload.rating,
            comment=payload.comment.strip() if payload.comment else None,
            is_visible=True,
        )
        db.add(review)
    else:
        review.rating = payload.rating
        review.comment = payload.comment.strip() if payload.comment else None
        review.updated_at = datetime.now(timezone.utc)

    await db.flush()

    admins_result = await db.execute(select(User).where(User.is_admin == True))  # noqa: E712
    admins = list(admins_result.scalars().all())
    for admin in admins:
        db.add(
            UserNotification(
                user_id=admin.id,
                notification_type="driving_school_review",
                title="Yangi avtomaktab bahosi",
                message=f"{current_user.email} {school.name} uchun {payload.rating}/5 baho qoldirdi.",
                payload={
                    "school_id": str(school.id),
                    "review_id": str(review.id),
                    "rating": payload.rating,
                },
            )
        )

    if school.owner_user_id is not None and school.owner_user_id != current_user.id:
        db.add(
            UserNotification(
                user_id=school.owner_user_id,
                notification_type="driving_school_owner_review",
                title="Yangi baho",
                message=f"{current_user.email} profilingiz uchun {payload.rating}/5 baho qoldirdi.",
                payload={"school_id": str(school.id), "review_id": str(review.id), "rating": payload.rating},
            )
        )

    await db.commit()
    await db.refresh(review)

    return DrivingSchoolReviewResponse(
        id=review.id,
        rating=review.rating,
        comment=review.comment,
        is_visible=review.is_visible,
        created_at=review.created_at,
        user_display_name=_user_display_name(current_user),
    )


@router.post("/partner-applications", response_model=DrivingSchoolPartnerApplicationResponse, status_code=status.HTTP_201_CREATED)
async def submit_partner_application(
    payload: DrivingSchoolPartnerApplicationCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> DrivingSchoolPartnerApplication:
    current_user = await _get_optional_user(request, db)
    active_application_statuses = {
        DrivingSchoolPartnerApplicationStatus.PENDING,
        DrivingSchoolPartnerApplicationStatus.APPROVED,
    }
    status_labels = {
        DrivingSchoolPartnerApplicationStatus.PENDING: "kutilmoqda",
        DrivingSchoolPartnerApplicationStatus.APPROVED: "tasdiqlangan",
        DrivingSchoolPartnerApplicationStatus.REJECTED: "rad etilgan",
    }

    normalized_email = str(payload.email).strip().lower()
    normalized_phone = payload.phone.strip()

    if current_user is not None:
        existing_school_result = await db.execute(
            select(DrivingSchool.id).where(DrivingSchool.owner_user_id == current_user.id)
        )
        if existing_school_result.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Sizda allaqachon avtomaktab profili mavjud.",
            )

    if current_user is not None:
        duplicate_stmt = (
            select(DrivingSchoolPartnerApplication)
            .where(DrivingSchoolPartnerApplication.user_id == current_user.id)
            .order_by(DrivingSchoolPartnerApplication.created_at.desc())
        )
    else:
        duplicate_stmt = (
            select(DrivingSchoolPartnerApplication)
            .where(
                (DrivingSchoolPartnerApplication.email == normalized_email)
                | (DrivingSchoolPartnerApplication.phone == normalized_phone)
            )
            .order_by(DrivingSchoolPartnerApplication.created_at.desc())
        )
    duplicate_result = await db.execute(duplicate_stmt)
    latest_application = duplicate_result.scalars().first()
    if latest_application is not None:
        latest_status = coerce_status_value(
            DrivingSchoolPartnerApplicationStatus,
            latest_application.status,
            context="driving_school_partner_application.duplicate_check",
            fallback=DrivingSchoolPartnerApplicationStatus.PENDING,
        )
        if latest_status in active_application_statuses:
            status_text = status_labels.get(latest_status, latest_status)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Sizda allaqachon ariza mavjud. Holat: {status_text}.",
            )

    application = DrivingSchoolPartnerApplication(
        user_id=current_user.id if current_user else None,
        school_name=payload.school_name.strip(),
        city=payload.city.strip(),
        responsible_person=payload.responsible_person.strip(),
        phone=normalized_phone,
        email=normalized_email,
        note=payload.note.strip() if payload.note else None,
        status=DrivingSchoolPartnerApplicationStatus.PENDING.value,
    )
    db.add(application)
    await db.flush()

    admins_result = await db.execute(select(User).where(User.is_admin == True))  # noqa: E712
    admins = list(admins_result.scalars().all())
    for admin in admins:
        db.add(
            UserNotification(
                user_id=admin.id,
                notification_type="driving_school_partner_application",
                title="Yangi hamkorlik arizasi",
                message=f"{payload.school_name} avtomaktabi hamkorlik arizasi yubordi.",
                payload={
                    "application_id": str(application.id),
                    "school_name": payload.school_name,
                    "city": payload.city,
                    "phone": payload.phone,
                },
            )
        )

    if current_user is not None:
        db.add(
            UserNotification(
                user_id=current_user.id,
                notification_type="driving_school_partner_application_submitted",
                title="Hamkorlik arizasi qabul qilindi",
                message=f"{payload.school_name} uchun yuborgan arizangiz qabul qilindi.",
                payload={
                    "application_id": str(application.id),
                    "status": DrivingSchoolPartnerApplicationStatus.PENDING.value,
                },
            )
        )

    await db.commit()
    await db.refresh(application)
    return application


@router.get("/ref/{referral_code}")
async def referral_redirect(
    referral_code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    result = await db.execute(
        select(DrivingSchool).where(
            DrivingSchool.referral_code == referral_code.strip().upper(),
            DrivingSchool.is_active == True,  # noqa: E712
        )
    )
    school = result.scalar_one_or_none()
    if school is not None:
        optional_user = await _get_optional_user(request, db)
        db.add(
            AnalyticsEvent(
                user_id=optional_user.id if optional_user else None,
                event_name="driving_school_referral_click",
                metadata_json={
                    "school_id": str(school.id),
                    "school_slug": school.slug,
                    "referral_code": school.referral_code,
                    "source": "direct_referral_route",
                },
            )
        )
        await db.commit()

    frontend_url = settings.FRONTEND_URL.rstrip("/")
    redirect_to = f"{frontend_url}/register?ref={referral_code.strip().upper()}"
    return RedirectResponse(url=redirect_to, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
