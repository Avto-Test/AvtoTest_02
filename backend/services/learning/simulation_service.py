"""
Simulation service helpers.
Provides dedicated simulation cooldown and availability logic.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.attempt_answer import AttemptAnswer
from models.exam_simulation_attempt import ExamSimulationAttempt
from models.simulation_exam_setting import SimulationExamSetting
from models.user_notification import UserNotification

if TYPE_CHECKING:
    from models.attempt import Attempt

DEFAULT_SIMULATION_COOLDOWN_DAYS = 14
SIMULATION_READYNESS_THRESHOLD = 70.0
SIMULATION_PASS_THRESHOLD = 65.0
DEFAULT_SIMULATION_QUESTION_COUNT = 40
DEFAULT_SIMULATION_DURATION_MINUTES = 40
DEFAULT_SIMULATION_MISTAKE_LIMIT = 3
DEFAULT_SIMULATION_VIOLATION_LIMIT = 2
DEFAULT_SIMULATION_FAST_UNLOCK_PRICE = 120


@dataclass(slots=True)
class SimulationAvailability:
    cooldown_days: int
    cooldown_progress: float
    cooldown_remaining_seconds: int
    next_available_at: datetime | None
    last_simulation_at: datetime | None
    readiness_gate_score: float
    readiness_ready: bool
    cooldown_ready: bool
    launch_ready: bool
    fast_unlock_active: bool
    fast_unlock_expires_at: datetime | None
    unlock_source: str | None
    recommended_question_count: int
    recommended_pressure_mode: bool
    label: str
    readiness_threshold: float = SIMULATION_READYNESS_THRESHOLD
    pass_threshold: float = SIMULATION_PASS_THRESHOLD
    lock_reasons: list[str] = field(default_factory=list)
    warning_message: str | None = None


def ensure_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


async def get_or_create_simulation_exam_settings(db: AsyncSession) -> SimulationExamSetting:
    result = await db.execute(select(SimulationExamSetting).where(SimulationExamSetting.id == 1))
    settings = result.scalar_one_or_none()
    if settings is None:
        settings = SimulationExamSetting(
            id=1,
            question_count=DEFAULT_SIMULATION_QUESTION_COUNT,
            duration_minutes=DEFAULT_SIMULATION_DURATION_MINUTES,
            mistake_limit=DEFAULT_SIMULATION_MISTAKE_LIMIT,
            violation_limit=DEFAULT_SIMULATION_VIOLATION_LIMIT,
            cooldown_days=DEFAULT_SIMULATION_COOLDOWN_DAYS,
            fast_unlock_price=DEFAULT_SIMULATION_FAST_UNLOCK_PRICE,
        )
        db.add(settings)
        await db.flush()
        await db.refresh(settings)
    return settings


def resolve_simulation_limits(
    simulation: ExamSimulationAttempt | None,
    settings: SimulationExamSetting | None = None,
) -> tuple[int, int]:
    mistake_limit = int(
        simulation.mistake_limit
        if simulation is not None and simulation.mistake_limit
        else settings.mistake_limit
        if settings is not None
        else DEFAULT_SIMULATION_MISTAKE_LIMIT
    )
    violation_limit = int(
        simulation.violation_limit
        if simulation is not None and simulation.violation_limit
        else settings.violation_limit
        if settings is not None
        else DEFAULT_SIMULATION_VIOLATION_LIMIT
    )
    return max(1, mistake_limit), max(1, violation_limit)


def resolve_simulation_question_count(settings: SimulationExamSetting | None = None) -> int:
    question_count = int(
        settings.question_count
        if settings is not None and settings.question_count
        else DEFAULT_SIMULATION_QUESTION_COUNT
    )
    return max(10, question_count)


def resolve_simulation_duration_minutes(settings: SimulationExamSetting | None = None) -> int:
    duration_minutes = int(
        settings.duration_minutes
        if settings is not None and settings.duration_minutes
        else DEFAULT_SIMULATION_DURATION_MINUTES
    )
    return max(5, duration_minutes)


def resolve_simulation_cooldown_days(settings: SimulationExamSetting | None = None) -> int:
    cooldown_days = int(
        settings.cooldown_days
        if settings is not None and settings.cooldown_days
        else DEFAULT_SIMULATION_COOLDOWN_DAYS
    )
    return max(1, cooldown_days)


def resolve_simulation_fast_unlock_price(settings: SimulationExamSetting | None = None) -> int:
    fast_unlock_price = int(
        settings.fast_unlock_price
        if settings is not None and settings.fast_unlock_price
        else DEFAULT_SIMULATION_FAST_UNLOCK_PRICE
    )
    return max(1, fast_unlock_price)


def _simulation_violation_label(event_type: str | None) -> str:
    return {
        "screenshot_attempt": "screenshot urinish",
        "page_leave_attempt": "sahifani tark etish urinish",
        "navigation_blocked": "boshqa sahifaga o'tish urinish",
        "devtools_blocked": "developer tools ochish urinish",
        "devtools_detected": "developer tools ochilgani",
        "copy_blocked": "nusxa olish urinish",
        "clipboard_shortcut_blocked": "clipboard shortcut urinish",
        "selection_blocked": "matnni belgilash urinish",
        "context_menu_blocked": "context menu urinish",
        "drag_blocked": "drag urinish",
        "cut_blocked": "kesib olish urinish",
        "paste_blocked": "joylashtirish urinish",
    }.get(event_type or "", "qoidabuzarlik")


def humanize_simulation_failure_reason(reason: str | None) -> str:
    if not reason:
        return "Imtihon qoidasi tufayli yakunlandi."

    if reason == "mistake_limit_reached":
        return "Xato limiti to'ldi. Imtihon darhol to'xtatildi va yiqilgan deb belgilandi."

    if reason.startswith("violation_limit_reached"):
        _, _, raw_event = reason.partition(":")
        event_label = _simulation_violation_label(raw_event)
        return (
            f"Qoidabuzarlik limiti to'ldi ({event_label}). "
            "Imtihon darhol to'xtatildi va yiqilgan deb belgilandi."
        )

    return "Imtihon qoidasi tufayli yakunlandi."


async def get_latest_exam_simulation(
    db: AsyncSession,
    user_id,
    *,
    include_unfinished: bool = True,
) -> ExamSimulationAttempt | None:
    stmt = select(ExamSimulationAttempt).where(ExamSimulationAttempt.user_id == user_id)
    if not include_unfinished:
        stmt = stmt.where(ExamSimulationAttempt.finished_at.is_not(None))
    stmt = stmt.order_by(
        ExamSimulationAttempt.finished_at.desc().nullslast(),
        ExamSimulationAttempt.started_at.desc().nullslast(),
        ExamSimulationAttempt.scheduled_at.desc(),
    ).limit(1)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_in_progress_exam_simulation(
    db: AsyncSession,
    user_id,
) -> ExamSimulationAttempt | None:
    stmt = (
        select(ExamSimulationAttempt)
        .where(
            ExamSimulationAttempt.user_id == user_id,
            ExamSimulationAttempt.finished_at.is_(None),
            ExamSimulationAttempt.started_at.is_not(None),
        )
        .order_by(ExamSimulationAttempt.started_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def build_simulation_availability(
    db: AsyncSession,
    *,
    user_id,
    readiness_score: float,
    pass_probability: float,
    fast_unlock_active: bool = False,
    fast_unlock_expires_at: datetime | None = None,
    now_utc: datetime | None = None,
) -> SimulationAvailability:
    now_utc = now_utc or datetime.now(timezone.utc)
    settings = await get_or_create_simulation_exam_settings(db)
    question_count = resolve_simulation_question_count(settings)
    cooldown_days = resolve_simulation_cooldown_days(settings)
    latest_simulation = await get_latest_exam_simulation(db, user_id, include_unfinished=False)

    cooldown_total_seconds = cooldown_days * 24 * 60 * 60
    last_simulation_at = ensure_utc(
        latest_simulation.finished_at if latest_simulation is not None else None
    )
    next_available_at = ensure_utc(
        latest_simulation.next_available_at if latest_simulation is not None else None
    )

    if latest_simulation is not None and next_available_at is None and last_simulation_at is not None:
        next_available_at = last_simulation_at + timedelta(days=cooldown_days)

    if next_available_at is None or next_available_at <= now_utc:
        cooldown_remaining_seconds = 0
        cooldown_progress = 100.0
        next_available_at = None
    else:
        cooldown_remaining_seconds = max(0, int((next_available_at - now_utc).total_seconds()))
        elapsed_seconds = max(0, cooldown_total_seconds - cooldown_remaining_seconds)
        cooldown_progress = round(
            min(100.0, (elapsed_seconds / cooldown_total_seconds) * 100.0),
            1,
        )

    readiness_gate_score = round(readiness_score * 0.55 + pass_probability * 0.45, 1)
    cooldown_ready = cooldown_remaining_seconds == 0
    readiness_ready = readiness_score >= SIMULATION_READYNESS_THRESHOLD
    launch_ready = fast_unlock_active or (cooldown_ready and readiness_ready)

    lock_reasons: list[str] = []
    if not fast_unlock_active and not cooldown_ready:
        lock_reasons.append("Avval cooldown muddati tugashi kerak.")
    if not fast_unlock_active and readiness_score < SIMULATION_READYNESS_THRESHOLD:
        lock_reasons.append(
            f"Readiness kamida {int(SIMULATION_READYNESS_THRESHOLD)}% bo'lishi kerak."
        )

    warning_message: str | None = None
    if fast_unlock_active and readiness_score < SIMULATION_READYNESS_THRESHOLD:
        warning_message = (
            f"Tayyorlik darajangiz: {int(round(readiness_score))}%\n"
            "Tavsiya: Learning Pathni tugating (+15 coin bonus)"
        )
    elif readiness_ready and pass_probability < SIMULATION_PASS_THRESHOLD:
        warning_message = (
            "Tayyorgarlik darajangiz yetarli, lekin barqarorlikni oshirish uchun yana bir necha "
            "learning-path mashqi tavsiya etiladi."
        )

    if fast_unlock_active:
        simulation_label = "Coin bilan ochilgan"
        unlock_source = "coins"
    elif launch_ready:
        simulation_label = "Simulyatsiya oynasi ochiq"
        unlock_source = "learning_path"
    elif not cooldown_ready:
        simulation_label = "Cooldown davom etmoqda"
        unlock_source = None
    elif readiness_ready:
        simulation_label = "Boshlash mumkin"
        unlock_source = None
    else:
        simulation_label = "Tayyorgarlikni kuchaytiring"
        unlock_source = None

    return SimulationAvailability(
        cooldown_days=cooldown_days,
        cooldown_progress=cooldown_progress,
        cooldown_remaining_seconds=cooldown_remaining_seconds,
        next_available_at=next_available_at,
        last_simulation_at=last_simulation_at,
        readiness_gate_score=readiness_gate_score,
        readiness_ready=readiness_ready,
        cooldown_ready=cooldown_ready,
        launch_ready=launch_ready,
        fast_unlock_active=fast_unlock_active,
        fast_unlock_expires_at=fast_unlock_expires_at,
        unlock_source=unlock_source,
        recommended_question_count=question_count,
        recommended_pressure_mode=True,
        label=simulation_label,
        readiness_threshold=SIMULATION_READYNESS_THRESHOLD,
        pass_threshold=SIMULATION_PASS_THRESHOLD,
        lock_reasons=lock_reasons,
        warning_message=warning_message,
    )


async def finalize_exam_simulation(
    db: AsyncSession,
    attempt: "Attempt",
    *,
    finished_at: datetime,
    mistake_count: int,
    passed: bool,
    timeout: bool,
    violation_count: int | None = None,
    disqualified: bool | None = None,
    disqualification_reason: str | None = None,
) -> ExamSimulationAttempt | None:
    simulation = await db.get(ExamSimulationAttempt, attempt.id)
    if simulation is None:
        return None

    settings = await get_or_create_simulation_exam_settings(db)
    cooldown_days = resolve_simulation_cooldown_days(settings)
    cooldown_started_at = ensure_utc(finished_at) or datetime.now(timezone.utc)
    simulation.finished_at = cooldown_started_at
    simulation.cooldown_started_at = cooldown_started_at
    simulation.next_available_at = cooldown_started_at + timedelta(days=cooldown_days)
    simulation.mistake_count = max(0, int(mistake_count))
    if violation_count is not None:
        simulation.violation_count = max(0, int(violation_count))
    simulation.timeout = bool(timeout)
    simulation.passed = bool(passed)
    if disqualified is not None:
        simulation.disqualified = bool(disqualified)
    if disqualification_reason is not None or simulation.disqualified:
        simulation.disqualification_reason = disqualification_reason
    return simulation


async def terminate_simulation_attempt(
    db: AsyncSession,
    attempt: "Attempt",
    *,
    finished_at: datetime,
    reason: str,
    disqualified: bool,
) -> ExamSimulationAttempt | None:
    simulation = await db.get(ExamSimulationAttempt, attempt.id)
    if simulation is None:
        return None

    answer_rows = (
        await db.execute(select(AttemptAnswer).where(AttemptAnswer.attempt_id == attempt.id))
    ).scalars().all()
    correct_count = sum(1 for answer in answer_rows if answer.is_correct)
    mistake_count = sum(1 for answer in answer_rows if not answer.is_correct)

    attempt.finished_at = finished_at
    attempt.score = int(correct_count * float(attempt.pressure_score_modifier or 1.0))
    if not attempt.question_count:
        attempt.question_count = len(attempt.question_ids or []) or len(answer_rows)

    await finalize_exam_simulation(
        db,
        attempt,
        finished_at=finished_at,
        mistake_count=mistake_count,
        passed=False,
        timeout=False,
        violation_count=simulation.violation_count,
        disqualified=disqualified,
        disqualification_reason=reason,
    )
    db.add(
        UserNotification(
            user_id=attempt.user_id,
            notification_type="simulation_result",
            title="Simulyatsiya yakunlandi",
            message=humanize_simulation_failure_reason(reason),
            payload={
                "attempt_id": str(attempt.id),
                "reason": reason,
                "disqualified": bool(disqualified),
                "mistake_count": mistake_count,
                "violation_count": int(simulation.violation_count or 0),
            },
        )
    )
    return simulation
