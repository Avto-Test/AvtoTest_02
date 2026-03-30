"""Friendly rule explanations for answered practice questions."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from uuid import UUID

from api.ai_coach.schemas import CoachExplanationResponse
from api.auth.router import get_current_user
from database.session import get_db
from models.attempt import Attempt
from models.attempt_answer import AttemptAnswer
from models.question import Question
from models.user import User
from services.learning.coach_feedback import build_question_feedback

router = APIRouter(prefix="/ai-coach", tags=["ai-coach"])


@router.get("/explanation", response_model=CoachExplanationResponse)
async def get_explanation(
    attempt_id: UUID = Query(...),
    question_id: UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CoachExplanationResponse:
    attempt = (
        await db.execute(select(Attempt).where(Attempt.id == attempt_id))
    ).scalar_one_or_none()
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found.")
    if attempt.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this attempt.")

    question = (
        await db.execute(
            select(Question)
            .options(selectinload(Question.answer_options))
            .where(Question.id == question_id)
        )
    ).scalar_one_or_none()
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

    answer = (
        await db.execute(
            select(AttemptAnswer).where(
                AttemptAnswer.attempt_id == attempt_id,
                AttemptAnswer.question_id == question_id,
            )
        )
    ).scalar_one_or_none()
    if answer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Answer not found.")

    option_map = {option.id: option for option in question.answer_options}
    selected_option = option_map.get(answer.selected_option_id)
    correct_option = next((option for option in question.answer_options if option.is_correct), None)
    if selected_option is None or correct_option is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Question options are incomplete.")

    feedback = build_question_feedback(
        question=question,
        selected_option=selected_option,
        correct_option=correct_option,
        is_correct=bool(answer.is_correct),
    )

    return CoachExplanationResponse(
        explanation=feedback["explanation"],
        selected_feedback=None if answer.is_correct else feedback["ai_coach"]["mistake_analysis"],
        driving_tip=feedback["ai_coach"]["tip"],
        motivation=feedback["ai_coach"]["recommendation"],
    )
