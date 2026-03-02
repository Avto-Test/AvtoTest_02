"""
AUTOTEST Feedback Router
User feedback and admin review endpoints.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.auth.router import get_current_user
from api.feedback.schemas import FeedbackAdminUpdate, FeedbackCreate, FeedbackResponse
from database.session import get_db
from models.feedback import Feedback
from models.user import User

router = APIRouter(prefix="/feedback", tags=["feedback"])

ALLOWED_STATUSES = {"new", "reviewed", "planned", "resolved", "rejected"}


def _normalize_status(value: str) -> str:
    return value.strip().lower()


def _normalize_category(value: str) -> str:
    return value.strip().lower()


def _serialize_feedback(item: Feedback) -> FeedbackResponse:
    return FeedbackResponse(
        id=item.id,
        user_id=item.user_id,
        rating=item.rating,
        category=item.category,
        comment=item.comment,
        suggestion=item.suggestion,
        status=item.status,
        admin_note=item.admin_note,
        created_at=item.created_at,
        updated_at=item.updated_at,
        user_email=item.user.email if getattr(item, "user", None) else None,
    )


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def create_feedback(
    payload: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FeedbackResponse:
    category = _normalize_category(payload.category) if payload.category else "general"
    existing_rating_result = await db.execute(
        select(Feedback.rating)
        .where(Feedback.user_id == current_user.id)
        .order_by(Feedback.created_at.asc())
        .limit(1)
    )
    locked_rating = existing_rating_result.scalar_one_or_none()

    feedback = Feedback(
        user_id=current_user.id,
        rating=locked_rating if locked_rating is not None else payload.rating,
        category=category,
        comment=payload.comment.strip(),
        suggestion=payload.suggestion.strip() if payload.suggestion else None,
        status="new",
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return _serialize_feedback(feedback)


@router.get("/me", response_model=list[FeedbackResponse])
async def get_my_feedback(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[FeedbackResponse]:
    result = await db.execute(
        select(Feedback)
        .where(Feedback.user_id == current_user.id)
        .order_by(Feedback.created_at.desc())
    )
    rows = list(result.scalars().all())
    return [_serialize_feedback(item) for item in rows]


@router.get("/admin", response_model=list[FeedbackResponse])
async def admin_list_feedback(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[FeedbackResponse]:
    stmt = (
        select(Feedback)
        .options(selectinload(Feedback.user))
        .order_by(Feedback.created_at.desc())
        .limit(limit)
    )
    if status_filter:
        normalized = _normalize_status(status_filter)
        stmt = stmt.where(Feedback.status == normalized)

    result = await db.execute(stmt)
    rows = list(result.scalars().all())
    return [_serialize_feedback(item) for item in rows]


@router.put("/admin/{feedback_id}", response_model=FeedbackResponse)
async def admin_update_feedback(
    feedback_id: UUID,
    payload: FeedbackAdminUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> FeedbackResponse:
    result = await db.execute(
        select(Feedback)
        .options(selectinload(Feedback.user))
        .where(Feedback.id == feedback_id)
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    fields_set = payload.model_fields_set
    if "status" in fields_set and payload.status is not None:
        normalized_status = _normalize_status(payload.status)
        if normalized_status not in ALLOWED_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Allowed: {', '.join(sorted(ALLOWED_STATUSES))}",
            )
        item.status = normalized_status
    if "admin_note" in fields_set:
        item.admin_note = payload.admin_note.strip() if payload.admin_note else None

    await db.commit()
    await db.refresh(item)
    return _serialize_feedback(item)
