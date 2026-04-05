"""
AUTOTEST Driving Instructors Admin Router
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.admin.router import get_current_admin
from api.driving_instructors.schemas import (
    DrivingInstructorAdminResponse,
    DrivingInstructorApplicationResponse,
    DrivingInstructorApplicationUpdate,
    DrivingInstructorComplaintResponse,
    DrivingInstructorComplaintUpdate,
    DrivingInstructorCreate,
    DrivingInstructorLeadResponse,
    DrivingInstructorLeadUpdate,
    DrivingInstructorMediaCreate,
    DrivingInstructorMediaResponse,
    DrivingInstructorMediaUpdate,
    DrivingInstructorPromoStatsItem,
    DrivingInstructorPromoStatsResponse,
    DrivingInstructorRegistrationSettingsResponse,
    DrivingInstructorRegistrationSettingsUpdate,
    DrivingInstructorReviewAdminUpdate,
    DrivingInstructorReviewResponse,
    DrivingInstructorUpdate,
)
from core.admin_statuses import (
    DrivingInstructorApplicationStatus,
    DrivingInstructorComplaintStatus,
    DrivingInstructorLeadStatus,
    ensure_status_transition,
    status_display_label,
)
from core.public_urls import resolve_public_upload_url
from database.session import get_db
from models.driving_instructor import DrivingInstructor
from models.driving_instructor_application import DrivingInstructorApplication
from models.driving_instructor_complaint import DrivingInstructorComplaint
from models.driving_instructor_lead import DrivingInstructorLead
from models.driving_instructor_media import DrivingInstructorMedia
from models.driving_instructor_registration_setting import DrivingInstructorRegistrationSetting
from models.driving_instructor_review import DrivingInstructorReview
from models.promo_code import PromoCode
from models.promo_redemption import PromoRedemption
from models.user import User
from models.user_notification import UserNotification

router = APIRouter(prefix="/admin/driving-instructors", tags=["admin-driving-instructors"])

ALLOWED_MEDIA_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov"}
MAX_MEDIA_SIZE_BYTES = 50 * 1024 * 1024
ADMIN_UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads" / "driving_instructors"


def _slugify(value: str) -> str:
    lowered = value.strip().lower()
    lowered = re.sub(r"[^a-z0-9\\s-]", "", lowered)
    lowered = re.sub(r"\\s+", "-", lowered)
    lowered = re.sub(r"-{2,}", "-", lowered).strip("-")
    return lowered or "instruktor"


def _normalize_referral(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_-]", "", value.strip().upper())
    return cleaned or "INST"


def _normalize_transmission(value: str | None) -> str:
    raw = (value or "").strip().lower()
    if raw in {"manual", "mexanika"}:
        return "manual"
    if raw in {"automatic", "avtomat", "auto"}:
        return "automatic"
    return raw or "manual"


def _average_rating(instructor: DrivingInstructor) -> tuple[float, int]:
    visible = [review for review in instructor.reviews if review.is_visible]
    if not visible:
        return 0.0, 0
    avg = sum(review.rating for review in visible) / len(visible)
    return round(float(avg), 2), len(visible)


def _user_display_name(user: User | None) -> str | None:
    if user is None:
        return None
    if user.full_name:
        return user.full_name
    if user.email:
        return user.email.split("@")[0]
    return None


async def _get_linked_instructor_or_404(db: AsyncSession, instructor_id: UUID) -> DrivingInstructor:
    result = await db.execute(select(DrivingInstructor).where(DrivingInstructor.id == instructor_id))
    instructor = result.scalar_one_or_none()
    if instructor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked instructor not found")
    return instructor


def _to_application_response(row: DrivingInstructorApplication) -> DrivingInstructorApplicationResponse:
    return DrivingInstructorApplicationResponse(
        id=row.id,
        user_id=row.user_id,
        linked_instructor_id=row.linked_instructor_id,
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
        user_email=row.user.email if row.user else None,
    )


async def _unique_slug(db: AsyncSession, base: str, exclude_id: UUID | None = None) -> str:
    candidate = _slugify(base)
    index = 2
    while True:
        stmt = select(DrivingInstructor.id).where(DrivingInstructor.slug == candidate)
        if exclude_id is not None:
            stmt = stmt.where(DrivingInstructor.id != exclude_id)
        result = await db.execute(stmt)
        if result.scalar_one_or_none() is None:
            return candidate
        candidate = f"{_slugify(base)}-{index}"
        index += 1


async def _unique_referral_code(db: AsyncSession, base: str, exclude_id: UUID | None = None) -> str:
    normalized = _normalize_referral(base)
    candidate = normalized
    index = 2
    while True:
        stmt = select(DrivingInstructor.id).where(DrivingInstructor.referral_code == candidate)
        if exclude_id is not None:
            stmt = stmt.where(DrivingInstructor.id != exclude_id)
        result = await db.execute(stmt)
        if result.scalar_one_or_none() is None:
            return candidate
        candidate = f"{normalized}{index}"
        index += 1


async def _validate_promo_code(
    db: AsyncSession,
    promo_code_id: UUID | None,
    *,
    exclude_instructor_id: UUID | None = None,
) -> PromoCode | None:
    if promo_code_id is None:
        return None
    promo_result = await db.execute(select(PromoCode).where(PromoCode.id == promo_code_id))
    promo = promo_result.scalar_one_or_none()
    if promo is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Promo code not found")
    conflict_stmt = select(DrivingInstructor.id).where(DrivingInstructor.promo_code_id == promo_code_id)
    if exclude_instructor_id is not None:
        conflict_stmt = conflict_stmt.where(DrivingInstructor.id != exclude_instructor_id)
    conflict_result = await db.execute(conflict_stmt)
    if conflict_result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Promo code already linked")
    return promo


async def _promo_redemption_map(db: AsyncSession) -> dict[UUID, int]:
    result = await db.execute(
        select(PromoRedemption.promo_code_id, func.count(PromoRedemption.id))
        .group_by(PromoRedemption.promo_code_id)
    )
    return {promo_id: count for promo_id, count in result.all()}


async def _get_instructor_or_404(instructor_id: UUID, db: AsyncSession) -> DrivingInstructor:
    result = await db.execute(
        select(DrivingInstructor)
        .where(DrivingInstructor.id == instructor_id)
        .options(
            selectinload(DrivingInstructor.media_items),
            selectinload(DrivingInstructor.reviews),
            selectinload(DrivingInstructor.leads),
            selectinload(DrivingInstructor.promo_code),
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor not found")
    return row


async def _get_registration_settings(db: AsyncSession) -> DrivingInstructorRegistrationSetting:
    result = await db.execute(
        select(DrivingInstructorRegistrationSetting).where(DrivingInstructorRegistrationSetting.id == 1)
    )
    row = result.scalar_one_or_none()
    if row is None:
        row = DrivingInstructorRegistrationSetting(id=1)
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row


def _to_admin_response(row: DrivingInstructor, promo_redemption_count: int = 0) -> DrivingInstructorAdminResponse:
    rating_avg, review_count = _average_rating(row)
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
        review_count=review_count,
        rating_avg=rating_avg,
        promo_redemption_count=promo_redemption_count,
        media_items=sorted(row.media_items, key=lambda i: (i.sort_order, i.created_at)),
        reviews=[
            DrivingInstructorReviewResponse(
                id=review.id,
                rating=review.rating,
                comment=review.comment,
                is_visible=review.is_visible,
                created_at=review.created_at,
                user_display_name=None,
            )
            for review in sorted(row.reviews, key=lambda item: item.created_at, reverse=True)
        ],
    )


@router.post("/media/upload", status_code=status.HTTP_201_CREATED)
async def upload_media(
    request: Request,
    file: UploadFile = File(...),
    _admin: User = Depends(get_current_admin),
) -> dict[str, str]:
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
    ADMIN_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    (ADMIN_UPLOADS_DIR / filename).write_bytes(content)
    return {
        "url": resolve_public_upload_url(
            request,
            f"/uploads/driving_instructors/{filename}",
        ),
        "filename": filename,
    }


@router.get("", response_model=list[DrivingInstructorAdminResponse])
async def list_instructors(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[DrivingInstructorAdminResponse]:
    result = await db.execute(
        select(DrivingInstructor)
        .options(
            selectinload(DrivingInstructor.media_items),
            selectinload(DrivingInstructor.reviews),
            selectinload(DrivingInstructor.leads),
            selectinload(DrivingInstructor.promo_code),
        )
        .order_by(DrivingInstructor.created_at.desc())
    )
    rows = list(result.scalars().all())
    redemption_map = await _promo_redemption_map(db)
    return [
        _to_admin_response(row, promo_redemption_count=redemption_map.get(row.promo_code_id, 0) if row.promo_code_id else 0)
        for row in rows
    ]


@router.post("", response_model=DrivingInstructorAdminResponse, status_code=status.HTTP_201_CREATED)
async def create_instructor(
    payload: DrivingInstructorCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> DrivingInstructorAdminResponse:
    await _validate_promo_code(db, payload.promo_code_id)
    slug = await _unique_slug(db, payload.slug or payload.full_name)
    referral_code = await _unique_referral_code(db, payload.referral_code or payload.full_name)
    row = DrivingInstructor(
        user_id=payload.user_id,
        slug=slug,
        full_name=payload.full_name.strip(),
        gender=(payload.gender or "").strip().lower() or None,
        years_experience=payload.years_experience,
        short_bio=payload.short_bio.strip(),
        teaching_style=payload.teaching_style.strip() if payload.teaching_style else None,
        city=payload.city.strip(),
        region=payload.region.strip() if payload.region else None,
        service_areas=payload.service_areas.strip() if payload.service_areas else None,
        transmission=_normalize_transmission(payload.transmission),
        car_model=payload.car_model.strip(),
        car_year=payload.car_year,
        car_features=payload.car_features.strip() if payload.car_features else None,
        hourly_price_cents=payload.hourly_price_cents,
        currency=payload.currency.strip().upper(),
        min_lesson_minutes=payload.min_lesson_minutes,
        special_services=payload.special_services.strip() if payload.special_services else None,
        phone=payload.phone.strip(),
        telegram=payload.telegram.strip() if payload.telegram else None,
        profile_image_url=payload.profile_image_url.strip(),
        map_embed_url=payload.map_embed_url.strip() if payload.map_embed_url else None,
        referral_code=referral_code,
        promo_code_id=payload.promo_code_id,
        is_verified=payload.is_verified,
        is_active=payload.is_active,
        is_blocked=payload.is_blocked,
        is_top_rated=payload.is_top_rated,
        approved_at=datetime.now(timezone.utc) if payload.is_verified else None,
    )
    db.add(row)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Instructor with same slug/referral already exists")
    return _to_admin_response(await _get_instructor_or_404(row.id, db))


@router.put("/{instructor_id}", response_model=DrivingInstructorAdminResponse)
async def update_instructor(
    instructor_id: UUID,
    payload: DrivingInstructorUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> DrivingInstructorAdminResponse:
    row = await _get_instructor_or_404(instructor_id, db)
    fields_set = payload.model_fields_set
    if "promo_code_id" in fields_set:
        await _validate_promo_code(db, payload.promo_code_id, exclude_instructor_id=row.id)
        row.promo_code_id = payload.promo_code_id
    if "slug" in fields_set and payload.slug is not None:
        row.slug = await _unique_slug(db, payload.slug, exclude_id=row.id)
    if "referral_code" in fields_set and payload.referral_code is not None:
        row.referral_code = await _unique_referral_code(db, payload.referral_code, exclude_id=row.id)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if key in {"promo_code_id", "slug", "referral_code"}:
            continue
        if key == "transmission" and value is not None:
            setattr(row, key, _normalize_transmission(value))
            continue
        if isinstance(value, str):
            setattr(row, key, value.strip())
        else:
            setattr(row, key, value)
    if "is_verified" in fields_set and payload.is_verified is True and row.approved_at is None:
        row.approved_at = datetime.now(timezone.utc)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Instructor update conflict")
    redemption_map = await _promo_redemption_map(db)
    return _to_admin_response(row, promo_redemption_count=redemption_map.get(row.promo_code_id, 0) if row.promo_code_id else 0)


@router.delete("/{instructor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_instructor(
    instructor_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> None:
    row = await _get_instructor_or_404(instructor_id, db)
    await db.delete(row)
    await db.commit()


@router.post("/{instructor_id}/media", response_model=DrivingInstructorMediaResponse, status_code=status.HTTP_201_CREATED)
async def create_media(
    instructor_id: UUID,
    payload: DrivingInstructorMediaCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> DrivingInstructorMedia:
    await _get_instructor_or_404(instructor_id, db)
    row = DrivingInstructorMedia(
        instructor_id=instructor_id,
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


@router.put("/media/{media_id}", response_model=DrivingInstructorMediaResponse)
async def update_media(
    media_id: UUID,
    payload: DrivingInstructorMediaUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> DrivingInstructorMedia:
    result = await db.execute(select(DrivingInstructorMedia).where(DrivingInstructorMedia.id == media_id))
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


@router.delete("/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media(
    media_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> None:
    result = await db.execute(select(DrivingInstructorMedia).where(DrivingInstructorMedia.id == media_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media item not found")
    await db.delete(row)
    await db.commit()


@router.get("/promo-stats", response_model=DrivingInstructorPromoStatsResponse)
async def instructor_promo_stats(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> DrivingInstructorPromoStatsResponse:
    result = await db.execute(
        select(DrivingInstructor)
        .options(selectinload(DrivingInstructor.leads), selectinload(DrivingInstructor.promo_code))
        .order_by(DrivingInstructor.full_name.asc())
    )
    rows = list(result.scalars().all())
    redemption_map = await _promo_redemption_map(db)
    items = [
        DrivingInstructorPromoStatsItem(
            instructor_id=row.id,
            instructor_name=row.full_name,
            promo_code=row.promo_code.code if row.promo_code else None,
            referral_code=row.referral_code,
            lead_count=len(row.leads),
            promo_redemption_count=redemption_map.get(row.promo_code_id, 0) if row.promo_code_id else 0,
            view_count=row.view_count,
        )
        for row in rows
    ]
    return DrivingInstructorPromoStatsResponse(items=items)


@router.get("/applications", response_model=list[DrivingInstructorApplicationResponse])
async def list_applications(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[DrivingInstructorApplicationResponse]:
    result = await db.execute(
        select(DrivingInstructorApplication)
        .options(selectinload(DrivingInstructorApplication.user))
        .order_by(DrivingInstructorApplication.created_at.desc())
    )
    rows = list(result.scalars().all())
    return [_to_application_response(row) for row in rows]


@router.put("/applications/{application_id}", response_model=DrivingInstructorApplicationResponse)
async def update_application(
    application_id: UUID,
    payload: DrivingInstructorApplicationUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin),
) -> DrivingInstructorApplicationResponse:
    result = await db.execute(
        select(DrivingInstructorApplication)
        .where(DrivingInstructorApplication.id == application_id)
        .options(selectinload(DrivingInstructorApplication.user))
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    try:
        next_status = ensure_status_transition(
            DrivingInstructorApplicationStatus,
            row.status,
            payload.status,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    row.status = next_status.value
    row.rejection_reason = payload.rejection_reason.strip() if payload.rejection_reason else None
    row.reviewed_by_id = admin_user.id
    row.reviewed_at = datetime.now(timezone.utc)

    instructor: DrivingInstructor | None = None
    if payload.linked_instructor_id is not None:
        instructor = await _get_linked_instructor_or_404(db, payload.linked_instructor_id)
        row.linked_instructor_id = instructor.id

    if next_status == DrivingInstructorApplicationStatus.APPROVED:
        if instructor is None and row.linked_instructor_id is not None:
            instructor = await _get_linked_instructor_or_404(db, row.linked_instructor_id)

        if instructor is None and row.user_id is not None:
            instructor_result = await db.execute(select(DrivingInstructor).where(DrivingInstructor.user_id == row.user_id))
            instructor = instructor_result.scalar_one_or_none()

        if instructor is None:
            slug = await _unique_slug(db, row.full_name)
            referral = await _unique_referral_code(db, row.full_name)
            instructor = DrivingInstructor(
                user_id=row.user_id,
                slug=slug,
                full_name=row.full_name,
                gender=row.gender,
                years_experience=row.years_experience,
                short_bio=row.short_bio,
                teaching_style=None,
                city=row.city,
                region=row.region,
                service_areas=row.region,
                transmission=_normalize_transmission(row.transmission),
                car_model=row.car_model,
                car_year=None,
                car_features=None,
                hourly_price_cents=row.hourly_price_cents,
                currency=row.currency,
                min_lesson_minutes=60,
                special_services="Imtihon oldi tayyorgarlik",
                phone=row.phone,
                telegram=None,
                profile_image_url=row.profile_image_url,
                map_embed_url=None,
                referral_code=referral,
                promo_code_id=None,
                is_verified=True,
                is_active=True,
                is_blocked=False,
                is_top_rated=False,
                approved_at=datetime.now(timezone.utc),
            )
            db.add(instructor)
            await db.flush()

            db.add(
                DrivingInstructorMedia(
                    instructor_id=instructor.id,
                    media_type="image",
                    url=row.profile_image_url,
                    caption="Profil rasmi",
                    sort_order=0,
                    is_active=True,
                )
            )

            extra_urls = json.loads(row.extra_images_json or "[]")
            for idx, url in enumerate(extra_urls, start=1):
                if not isinstance(url, str) or not url.strip():
                    continue
                db.add(
                    DrivingInstructorMedia(
                        instructor_id=instructor.id,
                        media_type="image",
                        url=url.strip(),
                        caption=None,
                        sort_order=idx,
                        is_active=True,
                    )
                )
        else:
            instructor.full_name = row.full_name
            instructor.gender = row.gender
            instructor.years_experience = row.years_experience
            instructor.short_bio = row.short_bio
            instructor.city = row.city
            instructor.region = row.region
            instructor.transmission = _normalize_transmission(row.transmission)
            instructor.car_model = row.car_model
            instructor.hourly_price_cents = row.hourly_price_cents
            instructor.currency = row.currency
            instructor.phone = row.phone
            instructor.profile_image_url = row.profile_image_url
            instructor.is_verified = True
            instructor.is_active = True
            instructor.is_blocked = False
            if instructor.approved_at is None:
                instructor.approved_at = datetime.now(timezone.utc)

        row.linked_instructor_id = instructor.id

    if row.user_id is not None:
        db.add(
            UserNotification(
                user_id=row.user_id,
                notification_type="driving_instructor_application_status",
                title="Instruktor arizasi holati yangilandi",
                message=(
                    "Arizangiz tasdiqlandi. Profilingiz katalogda korinadi."
                    if next_status == DrivingInstructorApplicationStatus.APPROVED
                    else (
                        f"Arizangiz rad etildi: {row.rejection_reason or 'Izoh berilmagan'}"
                        if next_status == DrivingInstructorApplicationStatus.REJECTED
                        else f"Arizangiz holati: {status_display_label(row.status)}"
                    )
                ),
                payload={
                    "application_id": str(row.id),
                    "status": row.status,
                    "linked_instructor_id": str(row.linked_instructor_id) if row.linked_instructor_id else None,
                },
            )
        )

    await db.commit()
    await db.refresh(row)
    return _to_application_response(row)


@router.get("/leads", response_model=list[DrivingInstructorLeadResponse])
async def list_leads(
    instructor_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[DrivingInstructorLeadResponse]:
    stmt = (
        select(DrivingInstructorLead)
        .options(selectinload(DrivingInstructorLead.instructor), selectinload(DrivingInstructorLead.user))
        .order_by(DrivingInstructorLead.created_at.desc())
    )
    if instructor_id is not None:
        stmt = stmt.where(DrivingInstructorLead.instructor_id == instructor_id)
    result = await db.execute(stmt)
    rows = list(result.scalars().all())
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
            instructor_name=row.instructor.full_name if row.instructor else None,
            user_email=row.user.email if row.user else None,
        )
        for row in rows
    ]


@router.put("/leads/{lead_id}", response_model=DrivingInstructorLeadResponse)
async def update_lead_status(
    lead_id: UUID,
    payload: DrivingInstructorLeadUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> DrivingInstructorLeadResponse:
    result = await db.execute(
        select(DrivingInstructorLead)
        .where(DrivingInstructorLead.id == lead_id)
        .options(selectinload(DrivingInstructorLead.instructor), selectinload(DrivingInstructorLead.user))
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    try:
        next_status = ensure_status_transition(DrivingInstructorLeadStatus, row.status, payload.status)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    row.status = next_status.value
    row.updated_at = datetime.now(timezone.utc)

    if row.user_id is not None:
        db.add(
            UserNotification(
                user_id=row.user_id,
                notification_type="driving_instructor_lead_status",
                title="Instruktor sorovi holati yangilandi",
                message=f"{row.instructor.full_name if row.instructor else 'Instruktor'} boyicha sorov holati: {status_display_label(row.status)}",
                payload={"lead_id": str(row.id), "status": row.status},
            )
        )

    await db.commit()
    await db.refresh(row)
    return DrivingInstructorLeadResponse(
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
        instructor_name=row.instructor.full_name if row.instructor else None,
        user_email=row.user.email if row.user else None,
    )


@router.get("/reviews", response_model=list[DrivingInstructorReviewResponse])
async def list_reviews(
    instructor_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[DrivingInstructorReviewResponse]:
    stmt = (
        select(DrivingInstructorReview)
        .options(selectinload(DrivingInstructorReview.user), selectinload(DrivingInstructorReview.instructor))
        .order_by(DrivingInstructorReview.created_at.desc())
    )
    if instructor_id is not None:
        stmt = stmt.where(DrivingInstructorReview.instructor_id == instructor_id)
    result = await db.execute(stmt)
    rows = list(result.scalars().all())
    return [
        DrivingInstructorReviewResponse(
            id=row.id,
            rating=row.rating,
            comment=row.comment,
            is_visible=row.is_visible,
            created_at=row.created_at,
            user_display_name=_user_display_name(row.user),
        )
        for row in rows
    ]


@router.put("/reviews/{review_id}", response_model=DrivingInstructorReviewResponse)
async def update_review(
    review_id: UUID,
    payload: DrivingInstructorReviewAdminUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> DrivingInstructorReviewResponse:
    result = await db.execute(
        select(DrivingInstructorReview)
        .options(selectinload(DrivingInstructorReview.user))
        .where(DrivingInstructorReview.id == review_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if key == "comment":
            row.comment = value.strip() if value else None
        else:
            setattr(row, key, value)
    row.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(row)
    return DrivingInstructorReviewResponse(
        id=row.id,
        rating=row.rating,
        comment=row.comment,
        is_visible=row.is_visible,
        created_at=row.created_at,
        user_display_name=_user_display_name(row.user),
    )


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> None:
    result = await db.execute(select(DrivingInstructorReview).where(DrivingInstructorReview.id == review_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    await db.delete(row)
    await db.commit()


@router.get("/complaints", response_model=list[DrivingInstructorComplaintResponse])
async def list_complaints(
    instructor_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[DrivingInstructorComplaintResponse]:
    stmt = (
        select(DrivingInstructorComplaint)
        .options(selectinload(DrivingInstructorComplaint.user), selectinload(DrivingInstructorComplaint.instructor))
        .order_by(DrivingInstructorComplaint.created_at.desc())
    )
    if instructor_id is not None:
        stmt = stmt.where(DrivingInstructorComplaint.instructor_id == instructor_id)
    result = await db.execute(stmt)
    rows = list(result.scalars().all())
    return [
        DrivingInstructorComplaintResponse(
            id=row.id,
            instructor_id=row.instructor_id,
            user_id=row.user_id,
            full_name=row.full_name,
            phone=row.phone,
            reason=row.reason,
            comment=row.comment,
            status=row.status,
            created_at=row.created_at,
            updated_at=row.updated_at,
            instructor_name=row.instructor.full_name if row.instructor else None,
            user_email=row.user.email if row.user else None,
        )
        for row in rows
    ]


@router.put("/complaints/{complaint_id}", response_model=DrivingInstructorComplaintResponse)
async def update_complaint_status(
    complaint_id: UUID,
    payload: DrivingInstructorComplaintUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> DrivingInstructorComplaintResponse:
    result = await db.execute(
        select(DrivingInstructorComplaint)
        .where(DrivingInstructorComplaint.id == complaint_id)
        .options(selectinload(DrivingInstructorComplaint.user), selectinload(DrivingInstructorComplaint.instructor))
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    try:
        next_status = ensure_status_transition(
            DrivingInstructorComplaintStatus,
            row.status,
            payload.status,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    row.status = next_status.value
    row.updated_at = datetime.now(timezone.utc)

    if row.user_id is not None:
        db.add(
            UserNotification(
                user_id=row.user_id,
                notification_type="driving_instructor_complaint_status",
                title="Shikoyat holati yangilandi",
                message=f"{row.instructor.full_name if row.instructor else 'Instruktor'} boyicha shikoyat holati: {status_display_label(row.status)}",
                payload={"complaint_id": str(row.id), "status": row.status},
            )
        )

    await db.commit()
    await db.refresh(row)
    return DrivingInstructorComplaintResponse(
        id=row.id,
        instructor_id=row.instructor_id,
        user_id=row.user_id,
        full_name=row.full_name,
        phone=row.phone,
        reason=row.reason,
        comment=row.comment,
        status=row.status,
        created_at=row.created_at,
        updated_at=row.updated_at,
        instructor_name=row.instructor.full_name if row.instructor else None,
        user_email=row.user.email if row.user else None,
    )


@router.get("/registration-settings", response_model=DrivingInstructorRegistrationSettingsResponse)
async def get_registration_settings_admin(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> DrivingInstructorRegistrationSetting:
    return await _get_registration_settings(db)


@router.put("/registration-settings", response_model=DrivingInstructorRegistrationSettingsResponse)
async def update_registration_settings(
    payload: DrivingInstructorRegistrationSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin),
) -> DrivingInstructorRegistrationSetting:
    row = await _get_registration_settings(db)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(row, key, value)
    row.updated_by_id = admin_user.id
    row.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(row)
    return row
