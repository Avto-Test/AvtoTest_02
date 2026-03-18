"""
AUTOTEST Simulation Router
Dedicated simulation exam lifecycle endpoints.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.auth.router import get_current_user
from api.simulation.schemas import (
    SimulationHistoryEntry,
    SimulationHistoryResponse,
    SimulationStartResponse,
)
from api.tests.router import (
    QUESTION_COUNT_TO_MINUTES,
    _build_balanced_random_selection,
    _public_question_payload,
)
from api.analytics.user_router import get_dashboard
from database.session import get_db
from models.analytics_event import AnalyticsEvent
from models.attempt import Attempt
from models.exam_simulation_attempt import ExamSimulationAttempt
from models.question import Question
from models.test import Test
from models.user import User
from services.gamification.economy import get_active_simulation_fast_unlock

router = APIRouter(prefix="/simulation", tags=["simulation"])

SIMULATION_TEST_TITLE = "Exam Simulation"
SIMULATION_TEST_DESCRIPTION = "Dedicated exam simulation mode."


async def _get_or_create_simulation_test(db: AsyncSession, *, duration_minutes: int) -> Test:
    result = await db.execute(select(Test).where(Test.title == SIMULATION_TEST_TITLE))
    test = result.scalar_one_or_none()
    if test is not None:
        if test.duration != duration_minutes:
            test.duration = duration_minutes
        if not test.is_active:
            test.is_active = True
        if not test.is_premium:
            test.is_premium = True
        return test

    test = Test(
        title=SIMULATION_TEST_TITLE,
        description=SIMULATION_TEST_DESCRIPTION,
        difficulty="Simulation",
        duration=duration_minutes,
        is_active=True,
        is_premium=True,
    )
    db.add(test)
    await db.flush()
    return test


async def _load_attempt_questions(db: AsyncSession, attempt: Attempt):
    question_ids = []
    try:
        question_ids = [uuid.UUID(str(value)) for value in (attempt.question_ids or [])]
    except (TypeError, ValueError):
        question_ids = []

    if not question_ids:
        raise HTTPException(status_code=500, detail="Simulation attempt question set is missing.")

    question_result = await db.execute(
        select(Question)
        .options(selectinload(Question.answer_options))
        .where(Question.id.in_(question_ids))
    )
    question_map = {question.id: question for question in question_result.scalars().all()}
    ordered_questions = [question_map[question_id] for question_id in question_ids if question_id in question_map]
    if len(ordered_questions) != len(question_ids):
        raise HTTPException(status_code=500, detail="Simulation question set could not be restored.")
    return ordered_questions


@router.post("/start", response_model=SimulationStartResponse, status_code=status.HTTP_201_CREATED)
async def start_simulation(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SimulationStartResponse:
    existing_result = await db.execute(
        select(ExamSimulationAttempt)
        .options(selectinload(ExamSimulationAttempt.attempt))
        .where(
            ExamSimulationAttempt.user_id == current_user.id,
            ExamSimulationAttempt.finished_at.is_(None),
            ExamSimulationAttempt.started_at.is_not(None),
        )
        .order_by(ExamSimulationAttempt.started_at.desc())
        .limit(1)
    )
    existing_simulation = existing_result.scalar_one_or_none()
    if existing_simulation is not None and existing_simulation.attempt is not None:
        questions = await _load_attempt_questions(db, existing_simulation.attempt)
        duration_minutes = QUESTION_COUNT_TO_MINUTES.get(existing_simulation.question_count, 40)
        duration_minutes = max(5, int(round(duration_minutes * 0.8))) if existing_simulation.pressure_mode else duration_minutes
        return SimulationStartResponse(
            id=existing_simulation.id,
            question_count=existing_simulation.question_count,
            duration_minutes=duration_minutes,
            questions=[_public_question_payload(question) for question in questions],
            scheduled_at=existing_simulation.scheduled_at,
            started_at=existing_simulation.started_at,
        )

    dashboard = await get_dashboard(current_user=current_user, db=db)
    simulation_status = dashboard.simulation_status
    active_fast_unlock = await get_active_simulation_fast_unlock(db, user_id=current_user.id)
    has_coin_unlock = active_fast_unlock is not None
    if simulation_status is None or (not simulation_status.launch_ready and not has_coin_unlock):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "SIMULATION_LOCKED",
                "message": "Simulyatsiya hali ochilmagan. Learning Pathni davom ettiring yoki coin bilan tez oching.",
                "readiness_score": dashboard.overview.readiness_score,
                "pass_probability": dashboard.overview.pass_probability,
                "simulation_status": simulation_status.model_dump() if simulation_status else None,
            },
        )

    question_count = simulation_status.recommended_question_count
    pressure_mode = simulation_status.recommended_pressure_mode
    duration_minutes = QUESTION_COUNT_TO_MINUTES.get(question_count, max(10, int(round(question_count * 1.25))))
    if pressure_mode:
        duration_minutes = max(5, int(round(duration_minutes * 0.8)))

    questions_result = await db.execute(
        select(Question)
        .options(selectinload(Question.answer_options))
        .where(Question.answer_options.any())
    )
    all_questions = list(questions_result.scalars().all())
    if len(all_questions) < question_count:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation question bank is not available.",
        )

    selected_questions = _build_balanced_random_selection(all_questions, question_count)
    simulation_test = await _get_or_create_simulation_test(db, duration_minutes=duration_minutes)
    now_utc = datetime.now(timezone.utc)
    attempt_id = uuid.uuid4()

    attempt = Attempt(
        id=attempt_id,
        user_id=current_user.id,
        test_id=simulation_test.id,
        mode="simulation",
        training_level="simulation",
        pressure_mode=pressure_mode,
        pressure_score_modifier=1.0,
        question_ids=[str(question.id) for question in selected_questions],
        question_count=question_count,
        time_limit_seconds=duration_minutes * 60,
        started_at=now_utc,
    )
    simulation = ExamSimulationAttempt(
        id=attempt_id,
        user_id=current_user.id,
        scheduled_at=now_utc,
        started_at=now_utc,
        readiness_snapshot=dashboard.overview.readiness_score,
        pass_probability_snapshot=dashboard.overview.pass_probability,
        question_count=question_count,
        pressure_mode=pressure_mode,
    )

    db.add(attempt)
    db.add(simulation)
    db.add(
        AnalyticsEvent(
            user_id=current_user.id,
            event_name="simulation_started",
            metadata_json={
                "simulation_id": str(attempt_id),
                "readiness_snapshot": dashboard.overview.readiness_score,
                "pass_probability_snapshot": dashboard.overview.pass_probability,
                "question_count": question_count,
                "pressure_mode": pressure_mode,
            },
        )
    )

    await db.commit()
    await db.refresh(simulation)

    return SimulationStartResponse(
        id=attempt_id,
        question_count=question_count,
        duration_minutes=duration_minutes,
        questions=[_public_question_payload(question) for question in selected_questions],
        scheduled_at=simulation.scheduled_at,
        started_at=simulation.started_at,
    )


@router.get("/history", response_model=SimulationHistoryResponse)
async def get_simulation_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SimulationHistoryResponse:
    result = await db.execute(
        select(ExamSimulationAttempt, Attempt)
        .join(Attempt, Attempt.id == ExamSimulationAttempt.id)
        .where(
            ExamSimulationAttempt.user_id == current_user.id,
            ExamSimulationAttempt.finished_at.is_not(None),
        )
        .order_by(ExamSimulationAttempt.finished_at.desc())
        .limit(10)
    )
    rows = result.all()

    items = []
    for simulation, attempt in rows:
        score_percent = round((float(attempt.score) / max(1, simulation.question_count)) * 100.0, 1)
        items.append(
            SimulationHistoryEntry(
                attempt_id=simulation.id,
                date=simulation.finished_at or simulation.started_at or simulation.scheduled_at,
                score=score_percent,
                mistakes=simulation.mistake_count,
                pass_probability_snapshot=simulation.pass_probability_snapshot,
                passed=simulation.passed,
            )
        )

    return SimulationHistoryResponse(items=items)
