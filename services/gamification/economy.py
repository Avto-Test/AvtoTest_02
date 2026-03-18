"""
AUTOTEST economy services.
Coin spending, purchasable boosts, and simulation cooldown mechanics.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from math import ceil
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.coin_transaction import CoinTransaction
from models.coin_wallet import CoinWallet
from models.exam_simulation_attempt import ExamSimulationAttempt
from models.xp_boost import XPBoost
from services.gamification.rewards import ensure_wallets, get_active_xp_boost, serialize_active_xp_boost
from services.learning.simulation_service import get_latest_exam_simulation

COOLDOWN_REDUCTION_COST_PER_DAY = 40
MAX_COOLDOWN_REDUCTION_DAYS = 5
XP_BOOST_COST = 50
XP_BOOST_MULTIPLIER = 1.2
XP_BOOST_DURATION_MINUTES = 30
FOCUS_PACK_COST = 35
FOCUS_PACK_QUESTION_COUNT = 20
SIMULATION_FAST_UNLOCK_COST = 120
SIMULATION_FAST_UNLOCK_DURATION_HOURS = 24


class EconomyError(Exception):
    """Domain exception for coin spending flows."""

    def __init__(self, code: str, message: str, *, status_code: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


@dataclass(slots=True)
class CooldownReductionResult:
    simulation: ExamSimulationAttempt
    days_applied: int
    coins_spent: int
    remaining_seconds: int


@dataclass(slots=True)
class SimulationFastUnlockResult:
    coin_balance: int
    coins_spent: int
    expires_at: datetime
    already_active: bool = False


class CoinSpendService:
    """Encapsulates balance validation and debit ledger writes."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def validate_balance(self, user_id: UUID, amount: int) -> CoinWallet:
        if amount <= 0:
            raise EconomyError("INVALID_AMOUNT", "Coin miqdori musbat bo'lishi kerak.")

        _, wallet, _ = await ensure_wallets(self.db, user_id)
        if int(wallet.balance) < amount:
            raise EconomyError(
                "INSUFFICIENT_COINS",
                "Coin balans yetarli emas.",
                status_code=403,
            )
        return wallet

    async def record_transaction(
        self,
        user_id: UUID,
        amount: int,
        reason: str,
        *,
        transaction_type: str = "debit",
        occurred_at: datetime | None = None,
    ) -> CoinTransaction:
        if amount <= 0:
            raise EconomyError("INVALID_AMOUNT", "Coin miqdori musbat bo'lishi kerak.")

        event_time = occurred_at or datetime.now(timezone.utc)
        transaction = CoinTransaction(
            user_id=user_id,
            amount=amount,
            type=transaction_type,
            source=reason,
            created_at=event_time,
        )
        self.db.add(transaction)
        await self.db.flush()
        return transaction

    async def spend_coins(
        self,
        user_id: UUID,
        amount: int,
        reason: str,
        *,
        occurred_at: datetime | None = None,
    ) -> tuple[CoinWallet, CoinTransaction]:
        event_time = occurred_at or datetime.now(timezone.utc)
        wallet = await self.validate_balance(user_id, amount)
        transaction = await self.record_transaction(
            user_id,
            amount,
            reason,
            transaction_type="debit",
            occurred_at=event_time,
        )
        wallet.balance = max(0, int(wallet.balance) - amount)
        wallet.last_updated = event_time
        await self.db.flush()
        return wallet, transaction


def _cooldown_remaining_seconds(simulation: ExamSimulationAttempt | None, *, now_utc: datetime) -> int:
    if simulation is None or simulation.next_available_at is None:
        return 0
    next_available_at = simulation.next_available_at
    if next_available_at.tzinfo is None:
        next_available_at = next_available_at.replace(tzinfo=timezone.utc)
    return max(0, int((next_available_at - now_utc).total_seconds()))


def get_simulation_fast_unlock_expiry(transaction: CoinTransaction) -> datetime:
    created_at = transaction.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return created_at + timedelta(hours=SIMULATION_FAST_UNLOCK_DURATION_HOURS)


async def get_active_simulation_fast_unlock(
    db: AsyncSession,
    *,
    user_id: UUID,
    now_utc: datetime | None = None,
) -> CoinTransaction | None:
    now_utc = now_utc or datetime.now(timezone.utc)
    cutoff = now_utc - timedelta(hours=SIMULATION_FAST_UNLOCK_DURATION_HOURS)
    result = await db.execute(
        select(CoinTransaction)
        .where(
            CoinTransaction.user_id == user_id,
            CoinTransaction.type == "debit",
            CoinTransaction.source.like("simulation_fast_unlock:%"),
            CoinTransaction.created_at >= cutoff,
        )
        .order_by(CoinTransaction.created_at.desc())
        .limit(1)
    )
    transaction = result.scalar_one_or_none()
    if transaction is None:
        return None
    if get_simulation_fast_unlock_expiry(transaction) <= now_utc:
        return None
    return transaction


async def build_economy_overview(
    db: AsyncSession,
    *,
    user_id: UUID,
) -> dict[str, object]:
    _, coin_wallet, _ = await ensure_wallets(db, user_id)
    now_utc = datetime.now(timezone.utc)
    latest_simulation = await get_latest_exam_simulation(db, user_id, include_unfinished=False)
    active_boost = serialize_active_xp_boost(await get_active_xp_boost(db, user_id, now_utc=now_utc), now_utc=now_utc)
    active_fast_unlock = await get_active_simulation_fast_unlock(db, user_id=user_id, now_utc=now_utc)
    fast_unlock_expiry = (
        get_simulation_fast_unlock_expiry(active_fast_unlock)
        if active_fast_unlock is not None
        else None
    )

    remaining_seconds = _cooldown_remaining_seconds(latest_simulation, now_utc=now_utc)
    used_days = int(latest_simulation.cooldown_reduction_days_used) if latest_simulation is not None else 0
    reducible_days = 0
    if remaining_seconds > 0:
        reducible_days = min(
            max(0, MAX_COOLDOWN_REDUCTION_DAYS - used_days),
            max(1, ceil(remaining_seconds / 86400)),
        )

    return {
        "coin_balance": int(coin_wallet.balance),
        "active_xp_boost": active_boost,
        "xp_boost_offer": {
            "cost": XP_BOOST_COST,
            "multiplier": XP_BOOST_MULTIPLIER,
            "duration_minutes": XP_BOOST_DURATION_MINUTES,
            "active": active_boost,
        },
        "simulation_cooldown_offer": {
            "cost_per_day": COOLDOWN_REDUCTION_COST_PER_DAY,
            "max_days": MAX_COOLDOWN_REDUCTION_DAYS,
            "available_days": reducible_days,
            "days_used": used_days,
            "cooldown_remaining_seconds": remaining_seconds,
            "next_available_at": latest_simulation.next_available_at if latest_simulation is not None else None,
        },
        "focus_pack_offer": {
            "cost": FOCUS_PACK_COST,
            "question_count": FOCUS_PACK_QUESTION_COUNT,
        },
        "simulation_fast_unlock_offer": {
            "cost": SIMULATION_FAST_UNLOCK_COST,
            "duration_hours": SIMULATION_FAST_UNLOCK_DURATION_HOURS,
            "active": active_fast_unlock is not None,
            "expires_at": fast_unlock_expiry,
        },
    }


async def activate_xp_boost(
    db: AsyncSession,
    *,
    user_id: UUID,
) -> tuple[CoinWallet, XPBoost]:
    now_utc = datetime.now(timezone.utc)
    active = await get_active_xp_boost(db, user_id, now_utc=now_utc)
    if active is not None:
        raise EconomyError(
            "XP_BOOST_ACTIVE",
            "Faol XP boost tugamaguncha yangisini yoqib bo'lmaydi.",
            status_code=409,
        )

    wallet, _ = await CoinSpendService(db).spend_coins(
        user_id,
        XP_BOOST_COST,
        f"xp_boost:{uuid.uuid4()}",
        occurred_at=now_utc,
    )
    boost = XPBoost(
        user_id=user_id,
        multiplier=XP_BOOST_MULTIPLIER,
        source="coin_boost",
        activated_at=now_utc,
        expires_at=now_utc + timedelta(minutes=XP_BOOST_DURATION_MINUTES),
        created_at=now_utc,
    )
    db.add(boost)
    await db.flush()
    return wallet, boost


async def reduce_simulation_cooldown(
    db: AsyncSession,
    *,
    user_id: UUID,
    days: int,
) -> CooldownReductionResult:
    if days <= 0:
        raise EconomyError("INVALID_REDUCTION", "Kamida 1 kun qisqartirish kerak.")

    now_utc = datetime.now(timezone.utc)
    latest_simulation = await get_latest_exam_simulation(db, user_id, include_unfinished=False)
    if latest_simulation is None or latest_simulation.next_available_at is None:
        raise EconomyError("SIMULATION_NOT_FOUND", "Qisqartirish uchun faol cooldown topilmadi.", status_code=404)

    remaining_seconds = _cooldown_remaining_seconds(latest_simulation, now_utc=now_utc)
    if remaining_seconds <= 0:
        raise EconomyError("COOLDOWN_NOT_ACTIVE", "Simulyatsiya cooldowni allaqachon tugagan.", status_code=409)

    used_days = int(latest_simulation.cooldown_reduction_days_used)
    remaining_cap = max(0, MAX_COOLDOWN_REDUCTION_DAYS - used_days)
    if remaining_cap <= 0:
        raise EconomyError("REDUCTION_LIMIT_REACHED", "Bu cooldown uchun maksimal qisqartirish ishlatilgan.", status_code=409)

    max_days_now = min(remaining_cap, max(1, ceil(remaining_seconds / 86400)))
    if days > max_days_now:
        raise EconomyError(
            "REDUCTION_TOO_LARGE",
            f"Hozir ko'pi bilan {max_days_now} kun qisqartirish mumkin.",
            status_code=409,
        )

    coins_spent = days * COOLDOWN_REDUCTION_COST_PER_DAY
    wallet, _ = await CoinSpendService(db).spend_coins(
        user_id,
        coins_spent,
        f"simulation_cooldown_reduction:{latest_simulation.id}:{used_days + days}",
        occurred_at=now_utc,
    )

    updated_next = latest_simulation.next_available_at - timedelta(days=days)
    if updated_next.tzinfo is None:
        updated_next = updated_next.replace(tzinfo=timezone.utc)
    latest_simulation.next_available_at = max(now_utc, updated_next)
    latest_simulation.cooldown_reduction_days_used = used_days + days
    await db.flush()

    return CooldownReductionResult(
        simulation=latest_simulation,
        days_applied=days,
        coins_spent=coins_spent,
        remaining_seconds=_cooldown_remaining_seconds(latest_simulation, now_utc=now_utc),
    )


async def unlock_simulation_fast_track(
    db: AsyncSession,
    *,
    user_id: UUID,
) -> SimulationFastUnlockResult:
    now_utc = datetime.now(timezone.utc)
    _, wallet, _ = await ensure_wallets(db, user_id)
    active_unlock = await get_active_simulation_fast_unlock(db, user_id=user_id, now_utc=now_utc)
    if active_unlock is not None:
        return SimulationFastUnlockResult(
            coin_balance=int(wallet.balance),
            coins_spent=0,
            expires_at=get_simulation_fast_unlock_expiry(active_unlock),
            already_active=True,
        )

    wallet, _ = await CoinSpendService(db).spend_coins(
        user_id,
        SIMULATION_FAST_UNLOCK_COST,
        f"simulation_fast_unlock:{uuid.uuid4()}",
        occurred_at=now_utc,
    )
    expires_at = now_utc + timedelta(hours=SIMULATION_FAST_UNLOCK_DURATION_HOURS)
    return SimulationFastUnlockResult(
        coin_balance=int(wallet.balance),
        coins_spent=SIMULATION_FAST_UNLOCK_COST,
        expires_at=expires_at,
        already_active=False,
    )
