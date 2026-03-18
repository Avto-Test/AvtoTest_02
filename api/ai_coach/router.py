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

router = APIRouter(prefix="/ai-coach", tags=["ai-coach"])


def _sanitize_option_text(text: str) -> str:
    value = text.strip()
    if value.lower().endswith("/t"):
        return value[:-2].rstrip()
    return value


def _topic_label(question: Question) -> str:
    return (question.topic or question.category or "this traffic rule").strip() or "this traffic rule"


def _pick_driving_tip(question: Question) -> str:
    haystack = f"{question.text} {question.topic or ''} {question.category or ''}".lower()
    keyword_tips = (
        (("distance", "interval", "following"), "Keep a full safety gap and increase it whenever speed or stopping distance grows."),
        (("rain", "wet", "fog", "visibility"), "When visibility drops, slow down early and leave extra room for braking."),
        (("intersection", "yield", "priority", "right of way", "chorraha"), "At intersections, scan early and confirm right-of-way before you commit."),
        (("speed", "curve", "brake"), "Choose a safe speed before the hazard, not after you enter it."),
        (("sign", "marking", "belgi", "chiziq"), "Road signs and lane markings usually settle the safest answer first."),
    )
    for keywords, tip in keyword_tips:
        if any(keyword in haystack for keyword in keywords):
            return tip
    return "Look for visibility, distance, and right-of-way clues before making your final choice."


def _build_motivation(is_correct: bool, question: Question) -> str:
    topic = _topic_label(question)
    if is_correct:
        return "Good job. Keep the streak alive."
    return f"Almost there. Stay calm and keep checking the safest {topic.lower()} clue first."


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

    topic_label = _topic_label(question)
    correct_text = _sanitize_option_text(correct_option.text)
    selected_text = _sanitize_option_text(selected_option.text)
    explanation = (
        f'The correct answer is "{correct_text}" because it matches the safest rule for {topic_label.lower()}. '
        "Focus on the rule that protects visibility, space, and right-of-way first."
    )
    selected_feedback = None
    if not answer.is_correct:
        selected_feedback = (
            f'You chose "{selected_text}". That is a common trap when the wording feels familiar, '
            "but the safer decision still comes from the main rule in the scene."
        )

    return CoachExplanationResponse(
        explanation=explanation,
        selected_feedback=selected_feedback,
        driving_tip=_pick_driving_tip(question),
        motivation=_build_motivation(bool(answer.is_correct), question),
    )
