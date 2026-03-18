"""
AUTOTEST Economy Router
Coin spending mechanics for boosts, simulation cooldown, and focus packs.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import get_current_user
from api.economy.schemas import (
    ActiveXPBoostResponse,
    CooldownReductionRequest,
    CooldownReductionResponse,
    EconomyOverviewResponse,
    FocusPackRequest,
    FocusPackResponse,
    SimulationFastUnlockResponse,
    XPBoostActivationResponse,
)
from api.learning.router import _get_or_create_learning_test, _public_question_payload
from database.session import get_db
from models.analytics_event import AnalyticsEvent
from models.attempt import Attempt
from models.question_category import QuestionCategory
from models.user import User
from services.gamification.economy import (
    FOCUS_PACK_COST,
    XP_BOOST_COST,
    activate_xp_boost,
    build_economy_overview,
    unlock_simulation_fast_track,
    reduce_simulation_cooldown,
    CoinSpendService,
    EconomyError,
)
from services.gamification.rewards import ensure_wallets, serialize_active_xp_boost
from services.learning.adaptive_engine import generate_adaptive_session

router = APIRouter(prefix="/economy", tags=["economy"])


def _raise_economy_error(error: EconomyError) -> None:
    raise HTTPException(status_code=error.status_code, detail={"error": error.code, "message": error.message})


@router.get("/overview", response_model=EconomyOverviewResponse)
async def get_economy_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EconomyOverviewResponse:
    payload = await build_economy_overview(db, user_id=current_user.id)
    await db.commit()
    return EconomyOverviewResponse(**payload)


@router.post("/simulation/reduce-cooldown", response_model=CooldownReductionResponse)
async def spend_for_simulation_cooldown(
    payload: CooldownReductionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CooldownReductionResponse:
    try:
        result = await reduce_simulation_cooldown(db, user_id=current_user.id, days=payload.days)
        _, wallet, _ = await ensure_wallets(db, current_user.id)
    except EconomyError as error:
        _raise_economy_error(error)

    db.add(
        AnalyticsEvent(
            user_id=current_user.id,
            event_name="simulation_cooldown_reduced",
            metadata_json={
                "simulation_id": str(result.simulation.id),
                "days_applied": result.days_applied,
                "coins_spent": result.coins_spent,
            },
        )
    )
    await db.commit()
    return CooldownReductionResponse(
        coin_balance=int(wallet.balance),
        coins_spent=result.coins_spent,
        days_applied=result.days_applied,
        cooldown_remaining_seconds=result.remaining_seconds,
        next_available_at=result.simulation.next_available_at,
    )


@router.post("/simulation/unlock", response_model=SimulationFastUnlockResponse)
async def spend_for_simulation_fast_unlock(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SimulationFastUnlockResponse:
    try:
        result = await unlock_simulation_fast_track(db, user_id=current_user.id)
    except EconomyError as error:
        _raise_economy_error(error)

    if not result.already_active:
        db.add(
            AnalyticsEvent(
                user_id=current_user.id,
                event_name="simulation_fast_unlock_purchased",
                metadata_json={
                    "coins_spent": result.coins_spent,
                    "expires_at": result.expires_at.isoformat(),
                },
            )
        )
    await db.commit()
    return SimulationFastUnlockResponse(
        coin_balance=result.coin_balance,
        coins_spent=result.coins_spent,
        expires_at=result.expires_at,
        active=True,
        already_active=result.already_active,
    )


@router.post("/xp-boost/activate", response_model=XPBoostActivationResponse)
async def spend_for_xp_boost(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> XPBoostActivationResponse:
    try:
        wallet, boost = await activate_xp_boost(db, user_id=current_user.id)
    except EconomyError as error:
        _raise_economy_error(error)

    db.add(
        AnalyticsEvent(
            user_id=current_user.id,
            event_name="xp_boost_activated",
            metadata_json={
                "boost_id": str(boost.id),
                "multiplier": float(boost.multiplier),
                "expires_at": boost.expires_at.isoformat(),
            },
        )
    )
    await db.commit()
    boost_payload = serialize_active_xp_boost(boost, now_utc=datetime.now(timezone.utc))
    if boost_payload is None:
        raise HTTPException(status_code=500, detail="XP boost holatini yaratib bo'lmadi.")
    return XPBoostActivationResponse(
        coin_balance=int(wallet.balance),
        coins_spent=XP_BOOST_COST,
        boost=ActiveXPBoostResponse(**boost_payload),
    )


@router.post("/focus-pack", response_model=FocusPackResponse, status_code=status.HTTP_201_CREATED)
async def unlock_focus_pack(
    payload: FocusPackRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FocusPackResponse:
    topic_result = await db.execute(
        select(QuestionCategory).where(QuestionCategory.name.ilike(payload.topic.strip()))
    )
    topic = topic_result.scalar_one_or_none()
    if topic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "TOPIC_NOT_FOUND", "message": "Tanlangan weak topic topilmadi."},
        )

    try:
        wallet, _ = await CoinSpendService(db).spend_coins(
            current_user.id,
            FOCUS_PACK_COST,
            f"focus_pack:{topic.id}:{payload.question_count}:{datetime.now(timezone.utc).isoformat()}",
        )
    except EconomyError as error:
        _raise_economy_error(error)

    plan = await generate_adaptive_session(
        current_user.id,
        db=db,
        question_count=payload.question_count,
        focus_topic_ids=[topic.id],
    )
    if not plan.questions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "FOCUS_PACK_EMPTY", "message": "Focus pack uchun savollar topilmadi."},
        )

    learning_test = await _get_or_create_learning_test(db)
    attempt = Attempt(
        user_id=current_user.id,
        test_id=learning_test.id,
        mode="learning",
        training_level="focus_pack",
        question_ids=[str(question.id) for question in plan.questions],
        question_count=len(plan.questions),
        time_limit_seconds=25 * 60,
    )
    db.add(attempt)
    db.add(
        AnalyticsEvent(
            user_id=current_user.id,
            event_name="focus_pack_unlocked",
            metadata_json={
                "session_id": str(attempt.id),
                "topic_id": str(topic.id),
                "topic": topic.name,
                "question_count": len(plan.questions),
                "coins_spent": FOCUS_PACK_COST,
            },
        )
    )
    db.add(
        AnalyticsEvent(
            user_id=current_user.id,
            event_name="learning_session_started",
            metadata_json={
                "session_id": str(attempt.id),
                "question_count": len(plan.questions),
                "weak_topic_ids": [str(topic_id) for topic_id in plan.weak_topic_ids],
                "source": "focus_pack",
            },
        )
    )
    await db.commit()
    await db.refresh(attempt)

    return FocusPackResponse(
        session_id=attempt.id,
        topic=topic.name,
        question_count=len(plan.questions),
        coin_balance=int(wallet.balance),
        coins_spent=FOCUS_PACK_COST,
        questions=[_public_question_payload(question) for question in plan.questions],
    )
