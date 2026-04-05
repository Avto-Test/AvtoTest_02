from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import get_current_user
from api.ml_data.schemas import (
    UserExamResultCreateRequest,
    UserExamResultResponse,
    UserExamResultsResponse,
)
from database.session import get_db
from models.user import User
from models.user_exam_result import UserExamResult

router = APIRouter(prefix="/ml-data", tags=["ml-data"])


@router.get("/exam-results", response_model=UserExamResultsResponse)
async def get_user_exam_results(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserExamResultsResponse:
    results = (
        await db.execute(
            select(UserExamResult)
            .where(UserExamResult.user_id == current_user.id)
            .order_by(UserExamResult.exam_date.desc(), UserExamResult.created_at.desc())
        )
    ).scalars().all()
    return UserExamResultsResponse(items=results)


@router.post("/exam-results", response_model=UserExamResultResponse)
async def create_user_exam_result(
    payload: UserExamResultCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserExamResultResponse:
    result = UserExamResult(
        user_id=current_user.id,
        exam_result=int(payload.exam_result),
        exam_date=payload.exam_date,
    )
    db.add(result)
    await db.commit()
    await db.refresh(result)
    return result
