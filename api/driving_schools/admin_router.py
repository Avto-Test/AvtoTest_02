"""
AUTOTEST Driving Schools Admin Router
"""

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
from api.driving_schools.schemas import (
    DrivingSchoolAdminResponse,
    DrivingSchoolCourseCreate,
    DrivingSchoolCourseResponse,
    DrivingSchoolCourseUpdate,
    DrivingSchoolCreate,
    DrivingSchoolLeadResponse,
    DrivingSchoolLeadUpdate,
    DrivingSchoolMediaCreate,
    DrivingSchoolMediaResponse,
    DrivingSchoolMediaUpdate,
    DrivingSchoolPartnerApplicationResponse,
    DrivingSchoolPartnerApplicationUpdate,
    DrivingSchoolPromoStatsItem,
    DrivingSchoolPromoStatsResponse,
    DrivingSchoolReviewAdminUpdate,
    DrivingSchoolReviewResponse,
    DrivingSchoolUpdate,
)
from core.public_urls import resolve_public_upload_url
from database.session import get_db
from models.driving_school import DrivingSchool
from models.driving_school_course import DrivingSchoolCourse
from models.driving_school_lead import DrivingSchoolLead
from models.driving_school_media import DrivingSchoolMedia
from models.driving_school_partner_application import DrivingSchoolPartnerApplication
from models.driving_school_review import DrivingSchoolReview
from models.promo_code import PromoCode
from models.promo_redemption import PromoRedemption
from models.user import User
from models.user_notification import UserNotification

router = APIRouter(prefix="/admin/driving-schools", tags=["admin-driving-schools"])

ALLOWED_MEDIA_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov"}
MAX_MEDIA_SIZE_BYTES = 50 * 1024 * 1024
ADMIN_UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads" / "driving_schools"


def _slugify(value: str) -> str:
    lowered = value.strip().lower()
    lowered = re.sub(r"[^a-z0-9\s-]", "", lowered)
    lowered = re.sub(r"\s+", "-", lowered)
    lowered = re.sub(r"-{2,}", "-", lowered).strip("-")
    return lowered or "avtomaktab"


def _normalize_referral(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_-]", "", value.strip().upper())
    return cleaned or "AUTO"


async def _unique_slug(db: AsyncSession, base: str, exclude_id: UUID | None = None) -> str:
    candidate = _slugify(base)
    index = 2
    while True:
        stmt = select(DrivingSchool.id).where(DrivingSchool.slug == candidate)
        if exclude_id is not None:
            stmt = stmt.where(DrivingSchool.id != exclude_id)
        result = await db.execute(stmt)
        exists = result.scalar_one_or_none()
        if exists is None:
            return candidate
        candidate = f"{_slugify(base)}-{index}"
        index += 1


async def _unique_referral_code(db: AsyncSession, base: str, exclude_id: UUID | None = None) -> str:
    normalized = _normalize_referral(base)
    candidate = normalized
    index = 2
    while True:
        stmt = select(DrivingSchool.id).where(DrivingSchool.referral_code == candidate)
        if exclude_id is not None:
            stmt = stmt.where(DrivingSchool.id != exclude_id)
        result = await db.execute(stmt)
        exists = result.scalar_one_or_none()
        if exists is None:
            return candidate
        candidate = f"{normalized}{index}"
        index += 1


async def _validate_promo_code(
    db: AsyncSession,
    promo_code_id: UUID | None,
    *,
    exclude_school_id: UUID | None = None,
) -> PromoCode | None:
    if promo_code_id is None:
        return None

    promo_result = await db.execute(select(PromoCode).where(PromoCode.id == promo_code_id))
    promo = promo_result.scalar_one_or_none()
    if promo is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Promo code not found")

    conflict_stmt = select(DrivingSchool.id).where(DrivingSchool.promo_code_id == promo_code_id)
    if exclude_school_id is not None:
        conflict_stmt = conflict_stmt.where(DrivingSchool.id != exclude_school_id)
    conflict_result = await db.execute(conflict_stmt)
    conflict_school_id = conflict_result.scalar_one_or_none()
    if conflict_school_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Promo code is already linked to another driving school",
        )

    return promo


async def _get_school_or_404(school_id: UUID, db: AsyncSession) -> DrivingSchool:
    result = await db.execute(
        select(DrivingSchool)
        .where(DrivingSchool.id == school_id)
        .options(
            selectinload(DrivingSchool.courses),
            selectinload(DrivingSchool.media_items),
            selectinload(DrivingSchool.reviews),
            selectinload(DrivingSchool.promo_code),
            selectinload(DrivingSchool.leads),
        )
    )
    school = result.scalar_one_or_none()
    if school is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driving school not found")
    return school


async def _promo_redemption_map(db: AsyncSession) -> dict[UUID, int]:
    result = await db.execute(
        select(PromoRedemption.promo_code_id, func.count(PromoRedemption.id))
        .group_by(PromoRedemption.promo_code_id)
    )
    return {promo_id: count for promo_id, count in result.all()}


def _school_to_admin_response(
    school: DrivingSchool,
    promo_redemption_count: int = 0,
) -> DrivingSchoolAdminResponse:
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
        promo_redemption_count=promo_redemption_count,
        courses=[course for course in sorted(school.courses, key=lambda item: (item.sort_order, item.created_at))],
        media_items=[item for item in sorted(school.media_items, key=lambda item: (item.sort_order, item.created_at))],
    )


@router.post("/media/upload", status_code=status.HTTP_201_CREATED)
async def upload_driving_school_media(
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
    saved_path = ADMIN_UPLOADS_DIR / filename
    saved_path.write_bytes(content)

    return {
        "url": resolve_public_upload_url(
            request,
            f"/uploads/driving_schools/{filename}",
        ),
        "filename": filename,
    }


@router.get("", response_model=list[DrivingSchoolAdminResponse])
async def list_driving_schools_admin(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[DrivingSchoolAdminResponse]:
    result = await db.execute(
        select(DrivingSchool)
        .options(
            selectinload(DrivingSchool.courses),
            selectinload(DrivingSchool.media_items),
            selectinload(DrivingSchool.reviews),
            selectinload(DrivingSchool.promo_code),
            selectinload(DrivingSchool.leads),
        )
        .order_by(DrivingSchool.created_at.desc())
    )
    schools = list(result.scalars().all())
    redemption_counts = await _promo_redemption_map(db)
    return [
        _school_to_admin_response(
            school,
            promo_redemption_count=redemption_counts.get(school.promo_code_id, 0) if school.promo_code_id else 0,
        )
        for school in schools
    ]


@router.post("", response_model=DrivingSchoolAdminResponse, status_code=status.HTTP_201_CREATED)
async def create_driving_school(
    payload: DrivingSchoolCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> DrivingSchoolAdminResponse:
    await _validate_promo_code(db, payload.promo_code_id)
    slug = await _unique_slug(db, payload.slug or payload.name)
    referral_code = await _unique_referral_code(db, payload.referral_code or payload.name)

    school = DrivingSchool(
        owner_user_id=payload.owner_user_id,
        slug=slug,
        name=payload.name.strip(),
        short_description=payload.short_description.strip() if payload.short_description else None,
        full_description=payload.full_description.strip() if payload.full_description else None,
        city=payload.city.strip(),
        region=payload.region.strip() if payload.region else None,
        address=payload.address.strip() if payload.address else None,
        landmark=payload.landmark.strip() if payload.landmark else None,
        phone=payload.phone.strip(),
        telegram=payload.telegram.strip() if payload.telegram else None,
        website=payload.website.strip() if payload.website else None,
        work_hours=payload.work_hours.strip() if payload.work_hours else None,
        license_info=payload.license_info.strip() if payload.license_info else None,
        years_active=payload.years_active,
        logo_url=payload.logo_url.strip() if payload.logo_url else None,
        map_embed_url=payload.map_embed_url.strip() if payload.map_embed_url else None,
        referral_code=referral_code,
        promo_code_id=payload.promo_code_id,
        is_active=payload.is_active,
    )
    db.add(school)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Driving school with same slug or referral code already exists")
    await db.refresh(school)

    loaded_school = await _get_school_or_404(school.id, db)
    return _school_to_admin_response(loaded_school)


@router.put("/{school_id}", response_model=DrivingSchoolAdminResponse)
async def update_driving_school(
    school_id: UUID,
    payload: DrivingSchoolUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> DrivingSchoolAdminResponse:
    school = await _get_school_or_404(school_id, db)
    fields_set = payload.model_fields_set

    if "promo_code_id" in fields_set:
        await _validate_promo_code(db, payload.promo_code_id, exclude_school_id=school.id)
        school.promo_code_id = payload.promo_code_id
    if "owner_user_id" in fields_set:
        school.owner_user_id = payload.owner_user_id

    if "name" in fields_set and payload.name is not None:
        school.name = payload.name.strip()
    if "slug" in fields_set and payload.slug is not None:
        school.slug = await _unique_slug(db, payload.slug, exclude_id=school.id)
    if "short_description" in fields_set:
        school.short_description = payload.short_description.strip() if payload.short_description else None
    if "full_description" in fields_set:
        school.full_description = payload.full_description.strip() if payload.full_description else None
    if "city" in fields_set and payload.city is not None:
        school.city = payload.city.strip()
    if "region" in fields_set:
        school.region = payload.region.strip() if payload.region else None
    if "address" in fields_set:
        school.address = payload.address.strip() if payload.address else None
    if "landmark" in fields_set:
        school.landmark = payload.landmark.strip() if payload.landmark else None
    if "phone" in fields_set and payload.phone is not None:
        school.phone = payload.phone.strip()
    if "telegram" in fields_set:
        school.telegram = payload.telegram.strip() if payload.telegram else None
    if "website" in fields_set:
        school.website = payload.website.strip() if payload.website else None
    if "work_hours" in fields_set:
        school.work_hours = payload.work_hours.strip() if payload.work_hours else None
    if "license_info" in fields_set:
        school.license_info = payload.license_info.strip() if payload.license_info else None
    if "years_active" in fields_set:
        school.years_active = payload.years_active
    if "logo_url" in fields_set:
        school.logo_url = payload.logo_url.strip() if payload.logo_url else None
    if "map_embed_url" in fields_set:
        school.map_embed_url = payload.map_embed_url.strip() if payload.map_embed_url else None
    if "referral_code" in fields_set and payload.referral_code is not None:
        school.referral_code = await _unique_referral_code(db, payload.referral_code, exclude_id=school.id)
    if "is_active" in fields_set and payload.is_active is not None:
        school.is_active = payload.is_active

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Driving school update conflict")
    await db.refresh(school)
    loaded_school = await _get_school_or_404(school.id, db)
    redemption_counts = await _promo_redemption_map(db)
    return _school_to_admin_response(
        loaded_school,
        promo_redemption_count=redemption_counts.get(loaded_school.promo_code_id, 0) if loaded_school.promo_code_id else 0,
    )


@router.delete("/{school_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_driving_school(
    school_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> None:
    school = await _get_school_or_404(school_id, db)
    await db.delete(school)
    await db.commit()


@router.post("/{school_id}/courses", response_model=DrivingSchoolCourseResponse, status_code=status.HTTP_201_CREATED)
async def create_school_course(
    school_id: UUID,
    payload: DrivingSchoolCourseCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> DrivingSchoolCourse:
    await _get_school_or_404(school_id, db)
    course = DrivingSchoolCourse(
        school_id=school_id,
        category_code=payload.category_code.strip().upper(),
        duration_weeks=payload.duration_weeks,
        price_cents=payload.price_cents,
        currency=payload.currency.strip().upper(),
        installment_available=payload.installment_available,
        description=payload.description.strip() if payload.description else None,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


@router.put("/courses/{course_id}", response_model=DrivingSchoolCourseResponse)
async def update_school_course(
    course_id: UUID,
    payload: DrivingSchoolCourseUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> DrivingSchoolCourse:
    result = await db.execute(select(DrivingSchoolCourse).where(DrivingSchoolCourse.id == course_id))
    course = result.scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    fields_set = payload.model_fields_set
    if "category_code" in fields_set and payload.category_code is not None:
        course.category_code = payload.category_code.strip().upper()
    if "duration_weeks" in fields_set:
        course.duration_weeks = payload.duration_weeks
    if "price_cents" in fields_set:
        course.price_cents = payload.price_cents
    if "currency" in fields_set and payload.currency is not None:
        course.currency = payload.currency.strip().upper()
    if "installment_available" in fields_set and payload.installment_available is not None:
        course.installment_available = payload.installment_available
    if "description" in fields_set:
        course.description = payload.description.strip() if payload.description else None
    if "is_active" in fields_set and payload.is_active is not None:
        course.is_active = payload.is_active
    if "sort_order" in fields_set and payload.sort_order is not None:
        course.sort_order = payload.sort_order

    await db.commit()
    await db.refresh(course)
    return course


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_school_course(
    course_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> None:
    result = await db.execute(select(DrivingSchoolCourse).where(DrivingSchoolCourse.id == course_id))
    course = result.scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    await db.delete(course)
    await db.commit()


@router.post("/{school_id}/media", response_model=DrivingSchoolMediaResponse, status_code=status.HTTP_201_CREATED)
async def create_school_media(
    school_id: UUID,
    payload: DrivingSchoolMediaCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> DrivingSchoolMedia:
    await _get_school_or_404(school_id, db)
    media = DrivingSchoolMedia(
        school_id=school_id,
        media_type=payload.media_type.strip().lower(),
        url=payload.url.strip(),
        caption=payload.caption.strip() if payload.caption else None,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    db.add(media)
    await db.commit()
    await db.refresh(media)
    return media


@router.put("/media/{media_id}", response_model=DrivingSchoolMediaResponse)
async def update_school_media(
    media_id: UUID,
    payload: DrivingSchoolMediaUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> DrivingSchoolMedia:
    result = await db.execute(select(DrivingSchoolMedia).where(DrivingSchoolMedia.id == media_id))
    media = result.scalar_one_or_none()
    if media is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media item not found")

    fields_set = payload.model_fields_set
    if "media_type" in fields_set and payload.media_type is not None:
        media.media_type = payload.media_type.strip().lower()
    if "url" in fields_set and payload.url is not None:
        media.url = payload.url.strip()
    if "caption" in fields_set:
        media.caption = payload.caption.strip() if payload.caption else None
    if "sort_order" in fields_set and payload.sort_order is not None:
        media.sort_order = payload.sort_order
    if "is_active" in fields_set and payload.is_active is not None:
        media.is_active = payload.is_active

    await db.commit()
    await db.refresh(media)
    return media


@router.delete("/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_school_media(
    media_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> None:
    result = await db.execute(select(DrivingSchoolMedia).where(DrivingSchoolMedia.id == media_id))
    media = result.scalar_one_or_none()
    if media is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media item not found")
    await db.delete(media)
    await db.commit()


@router.get("/leads", response_model=list[DrivingSchoolLeadResponse])
async def list_school_leads(
    school_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[DrivingSchoolLeadResponse]:
    stmt = (
        select(DrivingSchoolLead)
        .options(
            selectinload(DrivingSchoolLead.school),
            selectinload(DrivingSchoolLead.user),
        )
        .order_by(DrivingSchoolLead.created_at.desc())
    )
    if school_id is not None:
        stmt = stmt.where(DrivingSchoolLead.school_id == school_id)
    result = await db.execute(stmt)
    leads = list(result.scalars().all())
    return [
        DrivingSchoolLeadResponse(
            id=lead.id,
            school_id=lead.school_id,
            user_id=lead.user_id,
            full_name=lead.full_name,
            phone=lead.phone,
            requested_category=lead.requested_category,
            comment=lead.comment,
            source=lead.source,
            status=lead.status,
            created_at=lead.created_at,
            updated_at=lead.updated_at,
            school_name=lead.school.name if lead.school else None,
            user_email=lead.user.email if lead.user else None,
        )
        for lead in leads
    ]


@router.put("/leads/{lead_id}", response_model=DrivingSchoolLeadResponse)
async def update_school_lead_status(
    lead_id: UUID,
    payload: DrivingSchoolLeadUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> DrivingSchoolLeadResponse:
    result = await db.execute(
        select(DrivingSchoolLead)
        .where(DrivingSchoolLead.id == lead_id)
        .options(selectinload(DrivingSchoolLead.school), selectinload(DrivingSchoolLead.user))
    )
    lead = result.scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    lead.status = payload.status.strip().lower()
    lead.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(lead)
    return DrivingSchoolLeadResponse(
        id=lead.id,
        school_id=lead.school_id,
        user_id=lead.user_id,
        full_name=lead.full_name,
        phone=lead.phone,
        requested_category=lead.requested_category,
        comment=lead.comment,
        source=lead.source,
        status=lead.status,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
        school_name=lead.school.name if lead.school else None,
        user_email=lead.user.email if lead.user else None,
    )


@router.get("/partner-applications", response_model=list[DrivingSchoolPartnerApplicationResponse])
async def list_partner_applications(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[DrivingSchoolPartnerApplication]:
    result = await db.execute(
        select(DrivingSchoolPartnerApplication).order_by(DrivingSchoolPartnerApplication.created_at.desc())
    )
    return list(result.scalars().all())


@router.put("/partner-applications/{application_id}", response_model=DrivingSchoolPartnerApplicationResponse)
async def update_partner_application(
    application_id: UUID,
    payload: DrivingSchoolPartnerApplicationUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin),
) -> DrivingSchoolPartnerApplication:
    result = await db.execute(
        select(DrivingSchoolPartnerApplication).where(DrivingSchoolPartnerApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    application.status = payload.status.strip().lower()
    application.reviewed_by_id = admin_user.id
    application.reviewed_at = datetime.now(timezone.utc)

    auto_created_school: DrivingSchool | None = None
    if application.status == "approved" and application.user_id is not None:
        existing_school_result = await db.execute(
            select(DrivingSchool).where(DrivingSchool.owner_user_id == application.user_id)
        )
        existing_school = existing_school_result.scalar_one_or_none()
        if existing_school is None:
            slug = await _unique_slug(db, application.school_name)
            referral_code = await _unique_referral_code(db, application.school_name)
            auto_created_school = DrivingSchool(
                owner_user_id=application.user_id,
                slug=slug,
                name=application.school_name.strip(),
                short_description="Hamkor avtomaktab profili",
                full_description=application.note.strip() if application.note else None,
                city=application.city.strip(),
                region=None,
                address=None,
                landmark=None,
                phone=application.phone.strip(),
                telegram=None,
                website=None,
                work_hours=None,
                license_info=None,
                years_active=None,
                logo_url=None,
                map_embed_url=None,
                referral_code=referral_code,
                promo_code_id=None,
                is_active=True,
            )
            db.add(auto_created_school)
            await db.flush()

    if application.user_id is not None:
        db.add(
            UserNotification(
                user_id=application.user_id,
                notification_type="driving_school_partner_application_status",
                title="Hamkorlik arizasi holati yangilandi",
                message=(
                    f"{application.school_name} bo'yicha ariza holati: approved. "
                    "Sizga avtomaktab kabineti faollashtirildi."
                    if application.status == "approved"
                    else f"{application.school_name} bo'yicha ariza holati: {application.status}"
                ),
                payload={
                    "application_id": str(application.id),
                    "status": application.status,
                    "school_id": str(auto_created_school.id) if auto_created_school else None,
                    "school_slug": auto_created_school.slug if auto_created_school else None,
                },
            )
        )

    await db.commit()
    await db.refresh(application)
    return application


@router.get("/reviews", response_model=list[DrivingSchoolReviewResponse])
async def list_school_reviews_admin(
    school_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[DrivingSchoolReviewResponse]:
    stmt = (
        select(DrivingSchoolReview)
        .options(selectinload(DrivingSchoolReview.user), selectinload(DrivingSchoolReview.school))
        .order_by(DrivingSchoolReview.created_at.desc())
    )
    if school_id is not None:
        stmt = stmt.where(DrivingSchoolReview.school_id == school_id)
    result = await db.execute(stmt)
    reviews = list(result.scalars().all())
    return [
        DrivingSchoolReviewResponse(
            id=review.id,
            rating=review.rating,
            comment=review.comment,
            is_visible=review.is_visible,
            created_at=review.created_at,
            user_display_name=review.user.email if review.user else None,
        )
        for review in reviews
    ]


@router.put("/reviews/{review_id}", response_model=DrivingSchoolReviewResponse)
async def update_school_review_admin(
    review_id: UUID,
    payload: DrivingSchoolReviewAdminUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> DrivingSchoolReviewResponse:
    result = await db.execute(
        select(DrivingSchoolReview)
        .where(DrivingSchoolReview.id == review_id)
        .options(selectinload(DrivingSchoolReview.user))
    )
    review = result.scalar_one_or_none()
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    fields_set = payload.model_fields_set
    if "is_visible" in fields_set and payload.is_visible is not None:
        review.is_visible = payload.is_visible
    if "rating" in fields_set and payload.rating is not None:
        review.rating = payload.rating
    if "comment" in fields_set:
        review.comment = payload.comment.strip() if payload.comment else None
    review.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(review)
    return DrivingSchoolReviewResponse(
        id=review.id,
        rating=review.rating,
        comment=review.comment,
        is_visible=review.is_visible,
        created_at=review.created_at,
        user_display_name=review.user.email if review.user else None,
    )


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_school_review_admin(
    review_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> None:
    result = await db.execute(select(DrivingSchoolReview).where(DrivingSchoolReview.id == review_id))
    review = result.scalar_one_or_none()
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    await db.delete(review)
    await db.commit()


@router.get("/promo-stats", response_model=DrivingSchoolPromoStatsResponse)
async def driving_school_promo_stats(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> DrivingSchoolPromoStatsResponse:
    result = await db.execute(
        select(DrivingSchool)
        .options(
            selectinload(DrivingSchool.leads),
            selectinload(DrivingSchool.promo_code),
        )
        .order_by(DrivingSchool.name.asc())
    )
    schools = list(result.scalars().all())
    redemption_counts = await _promo_redemption_map(db)
    items = [
        DrivingSchoolPromoStatsItem(
            school_id=school.id,
            school_name=school.name,
            promo_code=school.promo_code.code if school.promo_code else None,
            referral_code=school.referral_code,
            lead_count=len(school.leads),
            promo_redemption_count=redemption_counts.get(school.promo_code_id, 0) if school.promo_code_id else 0,
        )
        for school in schools
    ]
    return DrivingSchoolPromoStatsResponse(items=items)
