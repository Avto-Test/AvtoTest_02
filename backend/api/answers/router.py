"""Locked answer submission endpoints for focused practice sessions."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.answers.schemas import SubmitLockedAnswerRequest, SubmitLockedAnswerResponse
from api.auth.router import get_current_user
from database.session import get_db
from models.attempt import Attempt
from models.attempt_answer import AttemptAnswer
from models.exam_simulation_attempt import ExamSimulationAttempt
from models.question import Question
from models.user import User
from services.learning.coach_feedback import build_question_feedback, sanitize_option_text
from services.learning.simulation_service import resolve_simulation_limits, terminate_simulation_attempt
from services.ml_data.answer_logging import apply_attempt_answer_metadata
from services.ml_data.session_tracking import complete_attempt_session, touch_attempt_session

router = APIRouter(prefix="/answers", tags=["answers"])


async def _get_attempt_question(
    *,
    attempt_id,
    question_id,
    current_user: User,
    db: AsyncSession,
) -> tuple[Attempt, Question]:
    attempt = (
        await db.execute(select(Attempt).where(Attempt.id == attempt_id))
    ).scalar_one_or_none()
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found.")
    if attempt.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this attempt.")
    if attempt.finished_at is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Attempt is already finished.")

    question_ids = {str(value) for value in (attempt.question_ids or [])}
    if question_ids and str(question_id) not in question_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question not assigned to this attempt.")

    question = (
        await db.execute(
            select(Question)
            .options(
                selectinload(Question.answer_options),
                selectinload(Question.category_ref),
            )
            .where(Question.id == question_id)
        )
    ).scalar_one_or_none()
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

    return attempt, question


async def _get_simulation_attempt(
    *,
    attempt_id,
    db: AsyncSession,
) -> ExamSimulationAttempt | None:
    return await db.get(ExamSimulationAttempt, attempt_id)


def _build_locked_response(
    *,
    answer: AttemptAnswer,
    question: Question,
    selected_option,
    correct_option,
    correct_option_id,
    already_answered: bool,
    simulation: ExamSimulationAttempt | None = None,
) -> SubmitLockedAnswerResponse:
    mistake_limit, violation_limit = resolve_simulation_limits(simulation)
    feedback = build_question_feedback(
        question=question,
        selected_option=selected_option,
        correct_option=correct_option,
        is_correct=bool(answer.is_correct),
    )
    return SubmitLockedAnswerResponse(
        answer_id=answer.id,
        attempt_id=answer.attempt_id,
        question_id=answer.question_id,
        question=question.text,
        options=[{"id": option.id, "text": sanitize_option_text(option.text)} for option in question.answer_options],
        selected_option_id=answer.selected_option_id,
        correct_option_id=correct_option_id,
        is_correct=bool(answer.is_correct),
        correct_answer=feedback["correct_answer"],
        explanation=feedback["explanation"],
        ai_coach=feedback["ai_coach"],
        recommendations=feedback["recommendations"],
        locked=True,
        already_answered=already_answered,
        mistake_count=int(simulation.mistake_count or 0) if simulation is not None else 0,
        mistake_limit=mistake_limit if simulation is not None else 0,
        violation_count=int(simulation.violation_count or 0) if simulation is not None else 0,
        violation_limit=violation_limit if simulation is not None else 0,
        attempt_finished=bool(simulation is not None and simulation.finished_at is not None),
        passed=simulation.passed if simulation is not None and simulation.finished_at is not None else None,
        disqualified=bool(simulation.disqualified) if simulation is not None else False,
        disqualification_reason=simulation.disqualification_reason if simulation is not None else None,
    )


@router.post("/submit", response_model=SubmitLockedAnswerResponse, status_code=status.HTTP_201_CREATED)
async def submit_locked_answer(
    payload: SubmitLockedAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SubmitLockedAnswerResponse:
    attempt, question = await _get_attempt_question(
        attempt_id=payload.attempt_id,
        question_id=payload.question_id,
        current_user=current_user,
        db=db,
    )

    option_map = {option.id: option for option in question.answer_options}
    selected_option = option_map.get(payload.selected_option_id)
    if selected_option is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Answer option not found for this question.")

    correct_option = next((option for option in question.answer_options if option.is_correct), None)
    if correct_option is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Correct option is not configured.")

    simulation = await _get_simulation_attempt(attempt_id=attempt.id, db=db) if attempt.mode == "simulation" else None

    existing_answer = (
        await db.execute(
            select(AttemptAnswer).where(
                AttemptAnswer.attempt_id == attempt.id,
                AttemptAnswer.question_id == question.id,
            )
        )
    ).scalar_one_or_none()
    if existing_answer is not None:
        existing_selected_option = option_map.get(existing_answer.selected_option_id)
        if existing_selected_option is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Stored answer option is missing.")
        await touch_attempt_session(db, attempt.id, activity_time=datetime.now(timezone.utc))
        return _build_locked_response(
            answer=existing_answer,
            question=question,
            selected_option=existing_selected_option,
            correct_option=correct_option,
            correct_option_id=correct_option.id,
            already_answered=True,
            simulation=simulation,
        )

    answer = AttemptAnswer(
        attempt_id=attempt.id,
        question_id=question.id,
        selected_option_id=selected_option.id,
        is_correct=bool(selected_option.is_correct),
    )
    answered_at = datetime.now(timezone.utc)
    apply_attempt_answer_metadata(
        answer,
        attempt=attempt,
        question=question,
        answered_at=answered_at,
        response_time_ms=payload.response_time_ms,
    )
    db.add(answer)
    await touch_attempt_session(db, attempt.id, activity_time=answered_at)
    if simulation is not None and not bool(selected_option.is_correct):
        simulation.mistake_count = int(simulation.mistake_count or 0) + 1
        mistake_limit, _ = resolve_simulation_limits(simulation)
        if simulation.mistake_count >= mistake_limit:
            await terminate_simulation_attempt(
                db,
                attempt,
                finished_at=datetime.now(timezone.utc),
                reason="mistake_limit_reached",
                disqualified=False,
            )
    if attempt.finished_at is not None:
        await complete_attempt_session(
            db,
            attempt,
            finished_at=attempt.finished_at,
            metadata={
                "score": int(attempt.score or 0),
                "question_count": int(attempt.question_count or len(attempt.question_ids or [])),
                "passed": bool(simulation.passed) if simulation is not None else False,
                "mode": attempt.mode,
            },
        )
        try:
            from ml.model_registry import capture_inference_snapshot

            await capture_inference_snapshot(db, attempt.id, str(current_user.id))
        except Exception:
            pass
    await db.commit()
    await db.refresh(answer)
    if simulation is not None:
        await db.refresh(simulation)

    return _build_locked_response(
        answer=answer,
        question=question,
        selected_option=selected_option,
        correct_option=correct_option,
        correct_option_id=correct_option.id,
        already_answered=False,
        simulation=simulation,
    )
