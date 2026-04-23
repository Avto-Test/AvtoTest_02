"""
AUTOTEST Lessons Router
Authenticated lessons feed for users.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import get_current_user
from api.lessons.schemas import (
    LessonItemResponse,
    LessonsFeedResponse,
    LessonSectionResponse,
)
from database.session import get_db
from models.lesson import Lesson
from models.user import User

router = APIRouter(prefix="/lessons", tags=["lessons"])


def _section_key(lesson: Lesson) -> str:
    return (lesson.section or lesson.topic or "General").strip() or "General"


@router.get("", response_model=LessonsFeedResponse)
async def get_lessons_feed(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LessonsFeedResponse:
    """
    Return active lessons for authenticated users.
    Premium users receive additional grouped sections for better navigation.
    """
    stmt = select(Lesson).where(Lesson.is_active == True)
    if not (current_user.is_premium or current_user.is_admin):
        stmt = stmt.where(Lesson.is_premium == False)

    result = await db.execute(
        stmt.order_by(
            Lesson.sort_order.asc(),
            Lesson.created_at.desc(),
        )
    )
    lessons = list(result.scalars().all())
    lesson_items = [LessonItemResponse.model_validate(lesson) for lesson in lessons]

    sections: list[LessonSectionResponse] = []
    if current_user.is_premium:
        grouped: dict[str, list[LessonItemResponse]] = {}
        for lesson in lessons:
            key = _section_key(lesson)
            grouped.setdefault(key, []).append(LessonItemResponse.model_validate(lesson))

        sections = [
            LessonSectionResponse(
                key=key.lower().replace(" ", "-"),
                title=key,
                lessons=items,
            )
            for key, items in sorted(grouped.items(), key=lambda pair: pair[0].lower())
        ]

    return LessonsFeedResponse(
        is_premium_user=current_user.is_premium,
        lessons=lesson_items,
        sections=sections,
    )
