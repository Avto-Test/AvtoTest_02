"""
AUTOTEST Violations Router
Endpoints for logging proctoring/violation events
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import resolve_user_from_access_token
from database.session import get_db
from models.attempt import Attempt
from models.exam_simulation_attempt import ExamSimulationAttempt
from models.user import User
from models.user_notification import UserNotification
from models.violation_log import ViolationLog
from services.gamification.economy import CoinSpendService
from services.learning.simulation_service import resolve_simulation_limits, terminate_simulation_attempt

router = APIRouter(prefix="/violations", tags=["violations"])
VIOLATION_COIN_PENALTY = 20


def _normalize_uuid(value: object | None) -> UUID | None:
    if value is None:
        return None
    if isinstance(value, UUID):
        return value
    try:
        return UUID(str(value))
    except (ValueError, TypeError):
        return None


async def _get_user_from_request(request: Request, db: AsyncSession) -> User | None:
    token: str | None = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    else:
        # Frontend may send auth token via cookie for lightweight fetch clients.
        token = request.cookies.get("access_token")

    if not token:
        return None

    return await resolve_user_from_access_token(token, db=db, include_subscription=False)


@router.post("/log")
async def log_violation(
    request: Request,
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    event_type = payload.get("event_type")
    if not event_type or not isinstance(event_type, str):
        raise HTTPException(status_code=400, detail="event_type is required")

    user = await _get_user_from_request(request, db)
    guest_id = request.cookies.get("guest_id")
    details = payload.get("details") or {}
    if not isinstance(details, dict):
        details = {"raw_details": details}

    raw_test_id = payload.get("test_id")
    raw_attempt_id = payload.get("attempt_id")
    test_id = _normalize_uuid(raw_test_id)
    attempt_id = _normalize_uuid(raw_attempt_id)

    # Preserve non-UUID identifiers for debugging while keeping DB writes safe.
    if raw_test_id is not None and test_id is None:
        details["test_ref"] = str(raw_test_id)
    if raw_attempt_id is not None and attempt_id is None:
        details["attempt_ref"] = str(raw_attempt_id)

    log = ViolationLog(
        user_id=user.id if user else None,
        guest_id=guest_id,
        test_id=test_id,
        attempt_id=attempt_id,
        event_type=event_type,
        details=details,
    )
    db.add(log)
    await db.flush()

    coins_penalized = 0
    coin_balance: int | None = None
    if user is not None:
        wallet, _, coins_penalized = await CoinSpendService(db).spend_available_coins(
            user.id,
            VIOLATION_COIN_PENALTY,
            f"violation_penalty:{log.id}",
            occurred_at=log.created_at,
        )
        coin_balance = int(wallet.balance)
        log.details = {
            **details,
            "coins_penalized": coins_penalized,
            "coin_balance_after_penalty": coin_balance,
        }

    simulation: ExamSimulationAttempt | None = None
    attempt: Attempt | None = None
    if attempt_id is not None:
        attempt = await db.get(Attempt, attempt_id)
        if attempt is not None and attempt.mode == "simulation":
            simulation = await db.get(ExamSimulationAttempt, attempt_id)
            if simulation is not None and simulation.finished_at is None:
                simulation.violation_count = int(simulation.violation_count or 0) + 1
                _, violation_limit = resolve_simulation_limits(simulation)
                if simulation.violation_count >= violation_limit:
                    await terminate_simulation_attempt(
                        db,
                        attempt,
                        finished_at=log.created_at,
                        reason=f"violation_limit_reached:{event_type}",
                        disqualified=True,
                    )

    if user is not None:
        payload_data = {
            "event_type": event_type,
            "test_id": str(test_id) if test_id else None,
            "attempt_id": str(attempt_id) if attempt_id else None,
            "details": details,
            "coins_penalized": coins_penalized,
            "coin_balance": coin_balance,
        }
        db.add(
            UserNotification(
                user_id=user.id,
                notification_type="violation",
                title="Qoidabuzarlik aniqlandi",
                message=(
                    f"Test paytida '{event_type}' hodisasi qayd etildi. "
                    + (
                        f"Jarima sifatida {coins_penalized} coin yechildi."
                        if coins_penalized > 0
                        else "Coin balans 0 bo'lgani uchun jarima qo'llanmadi."
                    )
                ),
                payload=payload_data,
            )
        )

        admins_result = await db.execute(
            select(User).where(
                User.is_admin.is_(True),
                User.id != user.id,
            )
        )
        admins = list(admins_result.scalars().all())
        for admin in admins:
            db.add(
                UserNotification(
                    user_id=admin.id,
                    notification_type="violation_admin",
                    title="Yangi qoidabuzarlik",
                    message=f"{user.email} foydalanuvchisi testda '{event_type}' hodisasini keltirib chiqardi.",
                    payload={
                        **payload_data,
                        "violator_user_id": str(user.id),
                        "violator_email": user.email,
                    },
                )
            )

    await db.commit()
    if simulation is not None:
        await db.refresh(simulation)
        _, violation_limit = resolve_simulation_limits(simulation)
        return {
            "success": True,
            "violation_count": int(simulation.violation_count or 0),
            "violation_limit": violation_limit,
            "attempt_finished": simulation.finished_at is not None,
            "disqualified": bool(simulation.disqualified),
            "disqualification_reason": simulation.disqualification_reason,
            "coins_penalized": coins_penalized,
            "coin_balance": coin_balance,
        }
    return {
        "success": True,
        "coins_penalized": coins_penalized,
        "coin_balance": coin_balance,
    }
