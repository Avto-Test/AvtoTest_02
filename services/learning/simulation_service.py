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

from models.exam_simulation_attempt import ExamSimulationAttempt

if TYPE_CHECKING:
    from models.attempt import Attempt

SIMULATION_COOLDOWN_DAYS = 14
SIMULATION_READYNESS_THRESHOLD = 70.0
SIMULATION_PASS_THRESHOLD = 65.0
SIMULATION_QUESTION_COUNT = 40


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
    latest_simulation = await get_latest_exam_simulation(db, user_id, include_unfinished=False)

    cooldown_total_seconds = SIMULATION_COOLDOWN_DAYS * 24 * 60 * 60
    last_simulation_at = ensure_utc(
        latest_simulation.finished_at if latest_simulation is not None else None
    )
    next_available_at = ensure_utc(
        latest_simulation.next_available_at if latest_simulation is not None else None
    )

    if latest_simulation is not None and next_available_at is None and last_simulation_at is not None:
        next_available_at = last_simulation_at + timedelta(days=SIMULATION_COOLDOWN_DAYS)

    if next_available_at is None or next_available_at <= now_utc:
        cooldown_remaining_seconds = 0
        cooldown_progress = 100.0
        next_available_at = None
    else:
        cooldown_remaining_seconds = max(0, int((next_available_at - now_utc).total_seconds()))
        elapsed_seconds = max(0, cooldown_total_seconds - cooldown_remaining_seconds)
        cooldown_progress = round(min(100.0, (elapsed_seconds / cooldown_total_seconds) * 100.0), 1)

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
            f"⚠️ Tayyorlik darajangiz: {int(round(readiness_score))}%\n"
            "Tavsiya: Learning Pathni tugating (+15 coin bonus)"
        )
    elif readiness_ready and pass_probability < SIMULATION_PASS_THRESHOLD:
        warning_message = (
            "Tayyorgarlik darajangiz yetarli, lekin barqarorlikni oshirish uchun yana bir necha learning-path mashqi tavsiya etiladi."
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
        cooldown_days=SIMULATION_COOLDOWN_DAYS,
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
        recommended_question_count=SIMULATION_QUESTION_COUNT,
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
) -> ExamSimulationAttempt | None:
    simulation = await db.get(ExamSimulationAttempt, attempt.id)
    if simulation is None:
        return None

    cooldown_started_at = ensure_utc(finished_at) or datetime.now(timezone.utc)
    simulation.finished_at = cooldown_started_at
    simulation.cooldown_started_at = cooldown_started_at
    simulation.next_available_at = cooldown_started_at + timedelta(days=SIMULATION_COOLDOWN_DAYS)
    simulation.mistake_count = max(0, int(mistake_count))
    simulation.timeout = bool(timeout)
    simulation.passed = bool(passed)
    return simulation
