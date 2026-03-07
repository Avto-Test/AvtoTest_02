"""
AUTOTEST Driving Instructors Public Router
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import RedirectResponse, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.auth.router import decode_access_token, get_current_user
from api.driving_instructors.schemas import (
    DrivingInstructorAdminResponse,
    DrivingInstructorApplicationCreate,
    DrivingInstructorApplicationResponse,
    DrivingInstructorCatalogItemResponse,
    DrivingInstructorCatalogResponse,
    DrivingInstructorComplaintCreate,
    DrivingInstructorDetailResponse,
    DrivingInstructorLeadCreate,
    DrivingInstructorLeadResponse,
    DrivingInstructorMediaCreate,
    DrivingInstructorMediaResponse,
    DrivingInstructorMediaUpdate,
    DrivingInstructorMetaResponse,
    DrivingInstructorRegistrationSettingsResponse,
    DrivingInstructorReviewCreate,
    DrivingInstructorReviewResponse,
    DrivingInstructorUpdate,
)
from core.config import settings
from core.public_urls import resolve_public_upload_url
from database.session import get_db
from models.analytics_event import AnalyticsEvent
from models.driving_instructor import DrivingInstructor
from models.driving_instructor_application import DrivingInstructorApplication
from models.driving_instructor_complaint import DrivingInstructorComplaint
from models.driving_instructor_lead import DrivingInstructorLead
from models.driving_instructor_media import DrivingInstructorMedia
from models.driving_instructor_registration_setting import DrivingInstructorRegistrationSetting
from models.driving_instructor_review import DrivingInstructorReview
from models.user import User
from models.user_notification import UserNotification

router = APIRouter(prefix="/driving-instructors", tags=["driving-instructors"])

DISCLAIMER_TEXT = (
    "Muhim: Platforma instruktor va foydalanuvchi ortasidagi kelishuv jarayoniga "
    "aralashmaydi. Xizmat sifati, kelishuv va tolov shartlari tomonlarning shaxsiy "
    "masuliyatiga kiradi."
)

ALLOWED_MEDIA_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov"}
MAX_MEDIA_SIZE_BYTES = 50 * 1024 * 1024
UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads" / "driving_instructors"


def _normalize_transmission(value: str | None) -> str:
    raw = (value or "").strip().lower()
    if raw in {"manual", "mexanika"}:
        return "manual"
    if raw in {"automatic", "avtomat", "auto"}:
        return "automatic"
    return raw or "manual"


def _user_display_name(user: User | None) -> str | None:
    if user is None:
        return None
    if user.full_name:
        return user.full_name
    if user.email:
        return user.email.split("@")[0]
    return None


def _average_rating(instructor: DrivingInstructor) -> tuple[float, int, dict[str, int]]:
    rows = [review for review in instructor.reviews if review.is_visible]
    distribution = {str(i): 0 for i in range(1, 6)}
    for review in rows:
        distribution[str(review.rating)] = distribution.get(str(review.rating), 0) + 1
    if not rows:
        return 0.0, 0, distribution
    avg = sum(review.rating for review in rows) / len(rows)
    return round(float(avg), 2), len(rows), distribution


def _is_new(instructor: DrivingInstructor) -> bool:
    return (datetime.now(timezone.utc) - instructor.created_at) <= timedelta(days=14)


async def _get_optional_user(request: Request, db: AsyncSession) -> User | None:
    token: str | None = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    else:
        token = request.cookies.get("access_token")
    if not token:
        return None
    user_id = decode_access_token(token)
    if not user_id:
        return None
    try:
        uid = UUID(str(user_id))
    except ValueError:
        return None
    result = await db.execute(select(User).where(User.id == uid))
    return result.scalar_one_or_none()


async def _get_instructor_by_slug_or_404(slug: str, db: AsyncSession) -> DrivingInstructor:
    result = await db.execute(
        select(DrivingInstructor)
        .where(
            DrivingInstructor.slug == slug,
            DrivingInstructor.is_verified == True,  # noqa: E712
            DrivingInstructor.is_active == True,  # noqa: E712
            DrivingInstructor.is_blocked == False,  # noqa: E712
        )
        .options(
            selectinload(DrivingInstructor.media_items),
            selectinload(DrivingInstructor.reviews).selectinload(DrivingInstructorReview.user),
            selectinload(DrivingInstructor.leads),
            selectinload(DrivingInstructor.promo_code),
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driving instructor not found")
    return row


async def _get_registration_settings(db: AsyncSession) -> DrivingInstructorRegistrationSetting:
    result = await db.execute(select(DrivingInstructorRegistrationSetting).where(DrivingInstructorRegistrationSetting.id == 1))
    row = result.scalar_one_or_none()
    if row is None:
        row = DrivingInstructorRegistrationSetting(id=1)
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row


async def _get_my_instructor(current_user: User, db: AsyncSession) -> DrivingInstructor | None:
    result = await db.execute(
        select(DrivingInstructor)
        .where(DrivingInstructor.user_id == current_user.id)
        .options(
            selectinload(DrivingInstructor.media_items),
            selectinload(DrivingInstructor.reviews).selectinload(DrivingInstructorReview.user),
            selectinload(DrivingInstructor.leads).selectinload(DrivingInstructorLead.user),
            selectinload(DrivingInstructor.promo_code),
        )
    )
    return result.scalar_one_or_none()


def _to_admin_profile_response(row: DrivingInstructor) -> DrivingInstructorAdminResponse:
    avg, count, _ = _average_rating(row)
    return DrivingInstructorAdminResponse(
        id=row.id,
        user_id=row.user_id,
        slug=row.slug,
        full_name=row.full_name,
        gender=row.gender,
        years_experience=row.years_experience,
        short_bio=row.short_bio,
        teaching_style=row.teaching_style,
        city=row.city,
        region=row.region,
        service_areas=row.service_areas,
        transmission=row.transmission,
        car_model=row.car_model,
        car_year=row.car_year,
        car_features=row.car_features,
        hourly_price_cents=row.hourly_price_cents,
        currency=row.currency,
        min_lesson_minutes=row.min_lesson_minutes,
        special_services=row.special_services,
        phone=row.phone,
        telegram=row.telegram,
        profile_image_url=row.profile_image_url,
        map_embed_url=row.map_embed_url,
        referral_code=row.referral_code,
        promo_code_id=row.promo_code_id,
        promo_code=row.promo_code.code if row.promo_code else None,
        is_verified=row.is_verified,
        is_active=row.is_active,
        is_blocked=row.is_blocked,
        is_top_rated=row.is_top_rated,
        view_count=row.view_count,
        created_at=row.created_at,
        updated_at=row.updated_at,
        approved_at=row.approved_at,
        lead_count=len(row.leads),
        review_count=count,
        rating_avg=avg,
        promo_redemption_count=0,
        media_items=sorted(row.media_items, key=lambda m: (m.sort_order, m.created_at)),
    )


@router.get("", response_model=DrivingInstructorCatalogResponse)
async def list_driving_instructors(
    q: str | None = Query(default=None, max_length=120),
    city: str | None = Query(default=None, max_length=120),
    region: str | None = Query(default=None, max_length=120),
    transmission: str | None = Query(default=None, max_length=20),
    price_min_cents: int | None = Query(default=None, ge=0),
    price_max_cents: int | None = Query(default=None, ge=0),
    rating_min: float | None = Query(default=None, ge=0, le=5),
    experience_min_years: int | None = Query(default=None, ge=0, le=80),
    gender: str | None = Query(default=None, max_length=20),
    sort_by: Literal["rating", "price", "experience", "newest", "activity"] = "rating",
    limit: int = Query(default=24, ge=1, le=120),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> DrivingInstructorCatalogResponse:
    result = await db.execute(
        select(DrivingInstructor)
        .where(
            DrivingInstructor.is_verified == True,  # noqa: E712
            DrivingInstructor.is_active == True,  # noqa: E712
            DrivingInstructor.is_blocked == False,  # noqa: E712
        )
        .options(selectinload(DrivingInstructor.reviews))
        .order_by(DrivingInstructor.created_at.desc())
    )
    instructors = list(result.scalars().all())

    q_value = (q or "").strip().lower()
    city_value = (city or "").strip().lower()
    region_value = (region or "").strip().lower()
    transmission_value = _normalize_transmission(transmission) if transmission else ""
    gender_value = (gender or "").strip().lower()

    items: list[DrivingInstructorCatalogItemResponse] = []
    for row in instructors:
        avg, count, _ = _average_rating(row)
        haystack = " ".join(
            filter(
                None,
                [row.full_name, row.short_bio, row.teaching_style, row.city, row.region, row.car_model],
            )
        ).lower()
        if q_value and q_value not in haystack:
            continue
        if city_value and city_value not in (row.city or "").lower():
            continue
        if region_value and region_value not in (row.region or "").lower():
            continue
        if transmission_value and _normalize_transmission(row.transmission) != transmission_value:
            continue
        if gender_value and gender_value not in (row.gender or "").lower():
            continue
        if price_min_cents is not None and row.hourly_price_cents < price_min_cents:
            continue
        if price_max_cents is not None and row.hourly_price_cents > price_max_cents:
            continue
        if rating_min is not None and avg < rating_min:
            continue
        if experience_min_years is not None and row.years_experience < experience_min_years:
            continue

        items.append(
            DrivingInstructorCatalogItemResponse(
                id=row.id,
                slug=row.slug,
                full_name=row.full_name,
                profile_image_url=row.profile_image_url,
                years_experience=row.years_experience,
                transmission=row.transmission,
                car_model=row.car_model,
                city=row.city,
                region=row.region,
                hourly_price_cents=row.hourly_price_cents,
                currency=row.currency,
                rating_avg=avg,
                review_count=count,
                is_new=_is_new(row),
                is_top_rated=row.is_top_rated,
            )
        )

    if sort_by == "price":
        items.sort(key=lambda i: i.hourly_price_cents)
    elif sort_by == "experience":
        items.sort(key=lambda i: i.years_experience, reverse=True)
    elif sort_by == "activity":
        items.sort(key=lambda i: i.review_count * 5, reverse=True)
    elif sort_by == "newest":
        pass
    else:
        items.sort(key=lambda i: (i.rating_avg, i.review_count), reverse=True)

    total = len(items)
    return DrivingInstructorCatalogResponse(total=total, offset=offset, limit=limit, items=items[offset : offset + limit])


@router.get("/meta", response_model=DrivingInstructorMetaResponse)
async def driving_instructor_meta(db: AsyncSession = Depends(get_db)) -> DrivingInstructorMetaResponse:
    result = await db.execute(
        select(DrivingInstructor).where(
            DrivingInstructor.is_verified == True,  # noqa: E712
            DrivingInstructor.is_active == True,  # noqa: E712
            DrivingInstructor.is_blocked == False,  # noqa: E712
        )
    )
    rows = list(result.scalars().all())
    return DrivingInstructorMetaResponse(
        cities=sorted({r.city for r in rows if r.city}),
        regions=sorted({r.region for r in rows if r.region}),
        transmissions=sorted({_normalize_transmission(r.transmission) for r in rows if r.transmission}),
        genders=sorted({(r.gender or "").strip().lower() for r in rows if r.gender}),
    )


@router.get("/registration-settings", response_model=DrivingInstructorRegistrationSettingsResponse)
async def get_registration_settings(db: AsyncSession = Depends(get_db)) -> DrivingInstructorRegistrationSetting:
    return await _get_registration_settings(db)


@router.post("/media/upload", status_code=status.HTTP_201_CREATED)
async def upload_application_media(request: Request, file: UploadFile = File(...)) -> dict[str, str]:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File name is required")
    extension = Path(file.filename).suffix.lower()
    if extension not in ALLOWED_MEDIA_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported media format")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    if len(content) > MAX_MEDIA_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File is too large")

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    (UPLOADS_DIR / filename).write_bytes(content)

    return {
        "url": resolve_public_upload_url(
            request,
            f"/uploads/driving_instructors/{filename}",
        ),
        "filename": filename,
    }


@router.get("/me/summary")
async def my_instructor_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    instructor = await _get_my_instructor(current_user, db)
    app_result = await db.execute(
        select(DrivingInstructorApplication)
        .where(DrivingInstructorApplication.user_id == current_user.id)
        .order_by(DrivingInstructorApplication.created_at.desc())
    )
    latest_application = app_result.scalars().first()

    app_payload = None
    if latest_application is not None:
        app_payload = DrivingInstructorApplicationResponse(
            id=latest_application.id,
            user_id=latest_application.user_id,
            full_name=latest_application.full_name,
            phone=latest_application.phone,
            city=latest_application.city,
            region=latest_application.region,
            gender=latest_application.gender,
            years_experience=latest_application.years_experience,
            transmission=latest_application.transmission,
            car_model=latest_application.car_model,
            hourly_price_cents=latest_application.hourly_price_cents,
            currency=latest_application.currency,
            short_bio=latest_application.short_bio,
            profile_image_url=latest_application.profile_image_url,
            extra_image_urls=json.loads(latest_application.extra_images_json or "[]"),
            status=latest_application.status,
            rejection_reason=latest_application.rejection_reason,
            reviewed_by_id=latest_application.reviewed_by_id,
            reviewed_at=latest_application.reviewed_at,
            submitted_from=latest_application.submitted_from,
            created_at=latest_application.created_at,
            updated_at=latest_application.updated_at,
            user_email=current_user.email,
        ).model_dump(mode="json")

    today = datetime.now(timezone.utc).date()
    day_keys = [(today - timedelta(days=offset)).isoformat() for offset in range(6, -1, -1)]
    trend_map: dict[str, dict[str, int]] = {
        key: {"views": 0, "leads": 0, "reviews": 0} for key in day_keys
    }

    if instructor is not None:
        week_start_dt = datetime.combine(today - timedelta(days=6), datetime.min.time(), tzinfo=timezone.utc)
        events_result = await db.execute(
            select(AnalyticsEvent).where(
                AnalyticsEvent.event_name == "driving_instructor_profile_view",
                AnalyticsEvent.created_at >= week_start_dt,
            )
        )
        for event in events_result.scalars().all():
            if str((event.metadata_json or {}).get("instructor_id")) != str(instructor.id):
                continue
            day_key = event.created_at.date().isoformat()
            if day_key in trend_map:
                trend_map[day_key]["views"] += 1

        for lead in instructor.leads:
            day_key = lead.created_at.date().isoformat()
            if day_key in trend_map:
                trend_map[day_key]["leads"] += 1

        for review in instructor.reviews:
            if not review.is_visible:
                continue
            day_key = review.created_at.date().isoformat()
            if day_key in trend_map:
                trend_map[day_key]["reviews"] += 1

    trend_payload = [
        {
            "date": key,
            "views": trend_map[key]["views"],
            "leads": trend_map[key]["leads"],
            "reviews": trend_map[key]["reviews"],
        }
        for key in day_keys
    ]

    return {
        "instructor": _to_admin_profile_response(instructor).model_dump(mode="json") if instructor else None,
        "latest_application": app_payload,
        "view_trend_7d": trend_payload,
    }


@router.get("/me/leads", response_model=list[DrivingInstructorLeadResponse])
async def my_instructor_leads(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DrivingInstructorLeadResponse]:
    instructor = await _get_my_instructor(current_user, db)
    if instructor is None:
        return []
    rows = sorted(instructor.leads, key=lambda item: item.created_at, reverse=True)
    return [
        DrivingInstructorLeadResponse(
            id=row.id,
            instructor_id=row.instructor_id,
            user_id=row.user_id,
            full_name=row.full_name,
            phone=row.phone,
            requested_transmission=row.requested_transmission,
            comment=row.comment,
            source=row.source,
            status=row.status,
            created_at=row.created_at,
            updated_at=row.updated_at,
            instructor_name=instructor.full_name,
            user_email=row.user.email if row.user else None,
        )
        for row in rows[:200]
    ]


@router.get("/me/reviews", response_model=list[DrivingInstructorReviewResponse])
async def my_instructor_reviews(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DrivingInstructorReviewResponse]:
    instructor = await _get_my_instructor(current_user, db)
    if instructor is None:
        return []
    rows = [review for review in instructor.reviews if review.is_visible]
    rows.sort(key=lambda item: item.created_at, reverse=True)
    return [
        DrivingInstructorReviewResponse(
            id=row.id,
            rating=row.rating,
            comment=row.comment,
            is_visible=row.is_visible,
            created_at=row.created_at,
            user_display_name=_user_display_name(row.user),
        )
        for row in rows[:200]
    ]


@router.put("/me/profile", response_model=DrivingInstructorAdminResponse)
async def update_my_instructor_profile(
    payload: DrivingInstructorUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DrivingInstructorAdminResponse:
    instructor = await _get_my_instructor(current_user, db)
    if instructor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if key in {"user_id", "is_verified", "is_active", "is_blocked", "is_top_rated", "promo_code_id", "slug", "referral_code"}:
            continue
        if key == "transmission" and value is not None:
            setattr(instructor, key, _normalize_transmission(value))
            continue
        if isinstance(value, str):
            setattr(instructor, key, value.strip())
        else:
            setattr(instructor, key, value)

    instructor.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(instructor)
    return _to_admin_profile_response(instructor)


@router.post("/me/media", response_model=DrivingInstructorMediaResponse, status_code=status.HTTP_201_CREATED)
async def create_my_media(
    payload: DrivingInstructorMediaCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DrivingInstructorMedia:
    instructor = await _get_my_instructor(current_user, db)
    if instructor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    row = DrivingInstructorMedia(
        instructor_id=instructor.id,
        media_type=(payload.media_type or "image").strip().lower(),
        url=payload.url.strip(),
        caption=payload.caption.strip() if payload.caption else None,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.put("/me/media/{media_id}", response_model=DrivingInstructorMediaResponse)
async def update_my_media(
    media_id: UUID,
    payload: DrivingInstructorMediaUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DrivingInstructorMedia:
    instructor = await _get_my_instructor(current_user, db)
    if instructor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    result = await db.execute(
        select(DrivingInstructorMedia).where(
            DrivingInstructorMedia.id == media_id,
            DrivingInstructorMedia.instructor_id == instructor.id,
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media item not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if key == "media_type" and value is not None:
            setattr(row, key, value.strip().lower())
            continue
        if isinstance(value, str):
            setattr(row, key, value.strip())
        else:
            setattr(row, key, value)

    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/me/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_media(
    media_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    instructor = await _get_my_instructor(current_user, db)
    if instructor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor profile not found")

    result = await db.execute(
        select(DrivingInstructorMedia).where(
            DrivingInstructorMedia.id == media_id,
            DrivingInstructorMedia.instructor_id == instructor.id,
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media item not found")

    await db.delete(row)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{instructor_slug}", response_model=DrivingInstructorDetailResponse)
async def get_driving_instructor_detail(
    instructor_slug: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> DrivingInstructorDetailResponse:
    row = await _get_instructor_by_slug_or_404(instructor_slug, db)
    optional_user = await _get_optional_user(request, db)
    row.view_count += 1
    db.add(
        AnalyticsEvent(
            user_id=optional_user.id if optional_user else None,
            event_name="driving_instructor_profile_view",
            metadata_json={
                "instructor_id": str(row.id),
                "instructor_slug": row.slug,
                "source": "instructor_detail_page",
            },
        )
    )
    await db.commit()
    await db.refresh(row)

    last_24h_cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    events_24h_result = await db.execute(
        select(AnalyticsEvent).where(
            AnalyticsEvent.event_name == "driving_instructor_profile_view",
            AnalyticsEvent.created_at >= last_24h_cutoff,
        )
    )
    views_last_24h = 0
    for event in events_24h_result.scalars().all():
        if str((event.metadata_json or {}).get("instructor_id")) == str(row.id):
            views_last_24h += 1

    lead_count = len(row.leads)
    top_selected_result = await db.execute(
        select(
            DrivingInstructorLead.instructor_id,
            func.count(DrivingInstructorLead.id).label("lead_total"),
        )
        .group_by(DrivingInstructorLead.instructor_id)
        .order_by(func.count(DrivingInstructorLead.id).desc())
        .limit(1)
    )
    top_selected_row = top_selected_result.first()
    is_most_selected = bool(
        top_selected_row
        and lead_count > 0
        and str(top_selected_row.instructor_id) == str(row.id)
    )

    avg, count, distribution = _average_rating(row)
    reviews = [
        DrivingInstructorReviewResponse(
            id=review.id,
            rating=review.rating,
            comment=review.comment,
            is_visible=review.is_visible,
            created_at=review.created_at,
            user_display_name=_user_display_name(review.user),
        )
        for review in row.reviews
        if review.is_visible
    ]
    reviews.sort(key=lambda i: i.created_at, reverse=True)

    media_items = [m for m in row.media_items if m.is_active]
    media_items.sort(key=lambda m: (m.sort_order, m.created_at))

    return DrivingInstructorDetailResponse(
        id=row.id,
        slug=row.slug,
        full_name=row.full_name,
        gender=row.gender,
        years_experience=row.years_experience,
        short_bio=row.short_bio,
        teaching_style=row.teaching_style,
        city=row.city,
        region=row.region,
        service_areas=row.service_areas,
        transmission=row.transmission,
        car_model=row.car_model,
        car_year=row.car_year,
        car_features=row.car_features,
        hourly_price_cents=row.hourly_price_cents,
        currency=row.currency,
        min_lesson_minutes=row.min_lesson_minutes,
        special_services=row.special_services,
        phone=row.phone,
        telegram=row.telegram,
        profile_image_url=row.profile_image_url,
        map_embed_url=row.map_embed_url,
        referral_code=row.referral_code,
        promo_code=row.promo_code.code if row.promo_code else None,
        view_count=row.view_count,
        views_last_24h=views_last_24h,
        lead_count=lead_count,
        is_most_selected=is_most_selected,
        is_top_rated=row.is_top_rated,
        rating_avg=avg,
        review_count=count,
        review_distribution=distribution,
        media_items=media_items,
        reviews=reviews[:60],
        disclaimer=DISCLAIMER_TEXT,
    )


@router.get("/{instructor_slug}/reviews", response_model=list[DrivingInstructorReviewResponse])
async def list_instructor_reviews(
    instructor_slug: str,
    limit: int = Query(default=60, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[DrivingInstructorReviewResponse]:
    row = await _get_instructor_by_slug_or_404(instructor_slug, db)
    reviews = [
        DrivingInstructorReviewResponse(
            id=review.id,
            rating=review.rating,
            comment=review.comment,
            is_visible=review.is_visible,
            created_at=review.created_at,
            user_display_name=_user_display_name(review.user),
        )
        for review in row.reviews
        if review.is_visible
    ]
    reviews.sort(key=lambda i: i.created_at, reverse=True)
    return reviews[:limit]


@router.post("/{instructor_slug}/leads", response_model=DrivingInstructorLeadResponse, status_code=status.HTTP_201_CREATED)
async def submit_instructor_lead(
    instructor_slug: str,
    payload: DrivingInstructorLeadCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> DrivingInstructorLeadResponse:
    row = await _get_instructor_by_slug_or_404(instructor_slug, db)
    optional_user = await _get_optional_user(request, db)

    lead = DrivingInstructorLead(
        instructor_id=row.id,
        user_id=optional_user.id if optional_user else None,
        full_name=payload.full_name.strip(),
        phone=payload.phone.strip(),
        requested_transmission=_normalize_transmission(payload.requested_transmission) if payload.requested_transmission else None,
        comment=payload.comment.strip() if payload.comment else None,
        source="web",
        status="new",
    )
    db.add(lead)
    await db.flush()

    admins_result = await db.execute(select(User).where(User.is_admin == True))  # noqa: E712
    admins = list(admins_result.scalars().all())
    for admin in admins:
        db.add(
            UserNotification(
                user_id=admin.id,
                notification_type="driving_instructor_lead",
                title="Yangi instruktor sorovi",
                message=f"{payload.full_name} ({payload.phone}) {row.full_name} instruktori uchun sorov yubordi.",
                payload={"instructor_id": str(row.id), "lead_id": str(lead.id)},
            )
        )

    if optional_user is not None:
        db.add(
            UserNotification(
                user_id=optional_user.id,
                notification_type="driving_instructor_lead_submitted",
                title="Sorovingiz qabul qilindi",
                message=f"{row.full_name} instruktorga yuborgan sorovingiz qabul qilindi.",
                payload={"instructor_id": str(row.id), "instructor_slug": row.slug, "lead_id": str(lead.id)},
            )
        )

    if row.user_id is not None:
        db.add(
            UserNotification(
                user_id=row.user_id,
                notification_type="driving_instructor_owner_lead",
                title="Yangi so'rov",
                message=f"{payload.full_name} profilingizga so'rov yubordi.",
                payload={"instructor_id": str(row.id), "lead_id": str(lead.id), "phone": payload.phone},
            )
        )

    await db.commit()
    await db.refresh(lead)
    return DrivingInstructorLeadResponse(
        id=lead.id,
        instructor_id=lead.instructor_id,
        user_id=lead.user_id,
        full_name=lead.full_name,
        phone=lead.phone,
        requested_transmission=lead.requested_transmission,
        comment=lead.comment,
        source=lead.source,
        status=lead.status,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
        instructor_name=row.full_name,
        user_email=optional_user.email if optional_user else None,
    )


@router.post("/{instructor_slug}/reviews", response_model=DrivingInstructorReviewResponse)
async def submit_instructor_review(
    instructor_slug: str,
    payload: DrivingInstructorReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DrivingInstructorReviewResponse:
    row = await _get_instructor_by_slug_or_404(instructor_slug, db)
    result = await db.execute(
        select(DrivingInstructorReview).where(
            DrivingInstructorReview.instructor_id == row.id,
            DrivingInstructorReview.user_id == current_user.id,
        )
    )
    review = result.scalar_one_or_none()
    if review is None:
        review = DrivingInstructorReview(
            instructor_id=row.id,
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
                notification_type="driving_instructor_review",
                title="Yangi instruktor bahosi",
                message=f"{current_user.email} {row.full_name} uchun {payload.rating}/5 baho qoldirdi.",
                payload={"instructor_id": str(row.id), "review_id": str(review.id), "rating": payload.rating},
            )
        )

    if row.user_id is not None and row.user_id != current_user.id:
        db.add(
            UserNotification(
                user_id=row.user_id,
                notification_type="driving_instructor_owner_review",
                title="Yangi baho",
                message=f"{current_user.email} profilingiz uchun {payload.rating}/5 baho qoldirdi.",
                payload={"instructor_id": str(row.id), "review_id": str(review.id), "rating": payload.rating},
            )
        )

    await db.commit()
    await db.refresh(review)
    return DrivingInstructorReviewResponse(
        id=review.id,
        rating=review.rating,
        comment=review.comment,
        is_visible=review.is_visible,
        created_at=review.created_at,
        user_display_name=_user_display_name(current_user),
    )


@router.post("/{instructor_slug}/complaints", status_code=status.HTTP_201_CREATED)
async def submit_instructor_complaint(
    instructor_slug: str,
    payload: DrivingInstructorComplaintCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    row = await _get_instructor_by_slug_or_404(instructor_slug, db)
    optional_user = await _get_optional_user(request, db)

    complaint = DrivingInstructorComplaint(
        instructor_id=row.id,
        user_id=optional_user.id if optional_user else None,
        full_name=payload.full_name.strip(),
        phone=payload.phone.strip() if payload.phone else None,
        reason=payload.reason.strip(),
        comment=payload.comment.strip() if payload.comment else None,
        status="new",
    )
    db.add(complaint)
    await db.flush()

    admins_result = await db.execute(select(User).where(User.is_admin == True))  # noqa: E712
    admins = list(admins_result.scalars().all())
    for admin in admins:
        db.add(
            UserNotification(
                user_id=admin.id,
                notification_type="driving_instructor_complaint",
                title="Instruktor boyicha shikoyat",
                message=f"{payload.full_name} {row.full_name} boyicha shikoyat qoldirdi.",
                payload={"instructor_id": str(row.id), "complaint_id": str(complaint.id), "reason": payload.reason},
            )
        )

    if optional_user is not None:
        db.add(
            UserNotification(
                user_id=optional_user.id,
                notification_type="driving_instructor_complaint_submitted",
                title="Shikoyat qabul qilindi",
                message=f"{row.full_name} boyicha shikoyatingiz qabul qilindi va korib chiqiladi.",
                payload={"instructor_id": str(row.id), "complaint_id": str(complaint.id)},
            )
        )

    await db.commit()
    return {"status": "ok"}


@router.post("/applications", response_model=DrivingInstructorApplicationResponse, status_code=status.HTTP_201_CREATED)
async def submit_instructor_application(
    payload: DrivingInstructorApplicationCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> DrivingInstructorApplicationResponse:
    optional_user = await _get_optional_user(request, db)

    if len(payload.extra_image_urls) < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kamida 1 ta qoshimcha rasm kerak")

    active_application_statuses = {"new", "pending", "reviewing", "approved"}
    status_labels = {
        "new": "kutilmoqda",
        "pending": "kutilmoqda",
        "reviewing": "korib chiqilmoqda",
        "approved": "tasdiqlangan",
        "rejected": "rad etilgan",
    }

    if optional_user is not None:
        existing_profile_result = await db.execute(
            select(DrivingInstructor.id).where(DrivingInstructor.user_id == optional_user.id)
        )
        if existing_profile_result.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Sizda allaqachon instruktor profili mavjud.",
            )

    normalized_phone = payload.phone.strip()
    if optional_user is not None:
        duplicate_stmt = (
            select(DrivingInstructorApplication)
            .where(DrivingInstructorApplication.user_id == optional_user.id)
            .order_by(DrivingInstructorApplication.created_at.desc())
        )
    else:
        duplicate_stmt = (
            select(DrivingInstructorApplication)
            .where(DrivingInstructorApplication.phone == normalized_phone)
            .order_by(DrivingInstructorApplication.created_at.desc())
        )
    duplicate_result = await db.execute(duplicate_stmt)
    latest_application = duplicate_result.scalars().first()
    if latest_application is not None:
        latest_status = (latest_application.status or "").strip().lower()
        if latest_status in active_application_statuses:
            status_text = status_labels.get(latest_status, latest_status)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Sizda allaqachon ariza mavjud. Holat: {status_text}.",
            )

    row = DrivingInstructorApplication(
        user_id=optional_user.id if optional_user else None,
        full_name=payload.full_name.strip(),
        phone=normalized_phone,
        city=payload.city.strip(),
        region=payload.region.strip() if payload.region else None,
        gender=(payload.gender or "").strip().lower() or None,
        years_experience=payload.years_experience,
        transmission=_normalize_transmission(payload.transmission),
        car_model=payload.car_model.strip(),
        hourly_price_cents=payload.hourly_price_cents,
        currency=payload.currency.strip().upper(),
        short_bio=payload.short_bio.strip(),
        profile_image_url=payload.profile_image_url.strip(),
        extra_images_json=json.dumps(payload.extra_image_urls),
        status="pending",
        submitted_from="web",
    )
    db.add(row)
    await db.flush()

    admins_result = await db.execute(select(User).where(User.is_admin == True))  # noqa: E712
    admins = list(admins_result.scalars().all())
    for admin in admins:
        db.add(
            UserNotification(
                user_id=admin.id,
                notification_type="driving_instructor_application",
                title="Yangi instruktor arizasi",
                message=f"{payload.full_name} instruktor bolish uchun ariza yubordi.",
                payload={"application_id": str(row.id), "full_name": payload.full_name, "city": payload.city},
            )
        )

    if optional_user is not None:
        db.add(
            UserNotification(
                user_id=optional_user.id,
                notification_type="driving_instructor_application_submitted",
                title="Arizangiz qabul qilindi",
                message="Instruktor sifatida royxatdan otish arizangiz qabul qilindi.",
                payload={"application_id": str(row.id), "status": "pending"},
            )
        )

    await db.commit()
    await db.refresh(row)

    return DrivingInstructorApplicationResponse(
        id=row.id,
        user_id=row.user_id,
        full_name=row.full_name,
        phone=row.phone,
        city=row.city,
        region=row.region,
        gender=row.gender,
        years_experience=row.years_experience,
        transmission=row.transmission,
        car_model=row.car_model,
        hourly_price_cents=row.hourly_price_cents,
        currency=row.currency,
        short_bio=row.short_bio,
        profile_image_url=row.profile_image_url,
        extra_image_urls=json.loads(row.extra_images_json or "[]"),
        status=row.status,
        rejection_reason=row.rejection_reason,
        reviewed_by_id=row.reviewed_by_id,
        reviewed_at=row.reviewed_at,
        submitted_from=row.submitted_from,
        created_at=row.created_at,
        updated_at=row.updated_at,
        user_email=optional_user.email if optional_user else None,
    )


@router.get("/ref/{referral_code}")
async def referral_redirect(
    referral_code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    result = await db.execute(
        select(DrivingInstructor).where(
            DrivingInstructor.referral_code == referral_code.strip().upper(),
            DrivingInstructor.is_verified == True,  # noqa: E712
            DrivingInstructor.is_active == True,  # noqa: E712
            DrivingInstructor.is_blocked == False,  # noqa: E712
        )
    )
    row = result.scalar_one_or_none()

    if row:
        optional_user = await _get_optional_user(request, db)
        db.add(
            AnalyticsEvent(
                user_id=optional_user.id if optional_user else None,
                event_name="driving_instructor_referral_click",
                metadata_json={"instructor_id": str(row.id), "referral_code": row.referral_code},
            )
        )
        await db.commit()

    frontend_url = settings.FRONTEND_URL.rstrip("/")
    return RedirectResponse(
        url=f"{frontend_url}/register?ref={referral_code.strip().upper()}",
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )
