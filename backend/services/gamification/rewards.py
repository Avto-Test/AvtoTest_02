"""
AUTOTEST gamification services.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Literal
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.achievement_definition import AchievementDefinition
from models.coin_transaction import CoinTransaction
from models.coin_wallet import CoinWallet
from models.leaderboard_snapshot import LeaderboardSnapshot
from models.review_queue import ReviewQueue
from models.user import User
from models.user_achievement import UserAchievement
from models.user_streak import UserStreak
from models.user_topic_stats import UserTopicStats
from models.xp_boost import XPBoost
from models.xp_event import XPEvent
from models.xp_wallet import XPWallet
from services.gamification.reward_policy import build_learning_step_completion_reward

LeaderboardPeriod = Literal["daily", "weekly", "monthly"]

REWARD_RULES: dict[str, dict[str, int]] = {
    "attempt_completed": {"xp": 12, "coins": 0},
    "learning_sprint_finished": {"xp": 0, "coins": 0},
    "weak_topic_recovered": {"xp": 18, "coins": 4},
    "review_queue_cleared": {"xp": 14, "coins": 3},
    "simulation_passed": {"xp": 40, "coins": 10},
    "daily_login": {"xp": 5, "coins": 1},
    "practice_answer_correct": {"xp": 0, "coins": 0},
    "practice_answer_attempted": {"xp": 0, "coins": 0},
}

ACHIEVEMENT_DEFINITIONS = (
    {
        "name": "Birinchi finish",
        "description": "Birinchi urinishni yakunlang.",
        "icon": "flag",
        "trigger_rule": "attempt_completed:1",
    },
    {
        "name": "Sprint finisher",
        "description": "Learning sprintni muvaffaqiyatli yakunlang.",
        "icon": "zap",
        "trigger_rule": "learning_session_finished:1",
    },
    {
        "name": "Recovery expert",
        "description": "Kamida bitta zaif mavzuni barqaror holatga olib chiqing.",
        "icon": "shield-check",
        "trigger_rule": "weak_topic_recovered:1",
    },
    {
        "name": "Review zero",
        "description": "Bugungi review queue'ni to'liq tozalang.",
        "icon": "clock",
        "trigger_rule": "review_queue_cleared:1",
    },
    {
        "name": "Simulation pass",
        "description": "Simulyatsion imtihondan o'ting.",
        "icon": "graduation-cap",
        "trigger_rule": "simulation_passed:1",
    },
    {
        "name": "7 kun ritm",
        "description": "7 kun ketma-ket platformaga qayting.",
        "icon": "flame",
        "trigger_rule": "streak:7",
    },
    {
        "name": "Level 5",
        "description": "5-darajaga yeting.",
        "icon": "star",
        "trigger_rule": "level:5",
    },
)


@dataclass(slots=True)
class LevelProgress:
    total_xp: int
    level: int
    current_level_xp: int
    next_level_xp: int
    xp_to_next_level: int
    progress_percent: int


@dataclass(slots=True)
class RewardGrant:
    xp_awarded: int = 0
    coins_awarded: int = 0
    unlocked_achievements: list[UserAchievement] = field(default_factory=list)


def _ensure_utc(value: datetime | None) -> datetime:
    current = value or datetime.now(timezone.utc)
    if current.tzinfo is None:
        return current.replace(tzinfo=timezone.utc)
    return current.astimezone(timezone.utc)


def _activity_date(value: datetime | None) -> date:
    return _ensure_utc(value).date()


async def get_active_xp_boost(
    db: AsyncSession,
    user_id: UUID,
    *,
    now_utc: datetime | None = None,
) -> XPBoost | None:
    now_utc = _ensure_utc(now_utc)
    result = await db.execute(
        select(XPBoost)
        .where(
            XPBoost.user_id == user_id,
            XPBoost.expires_at > now_utc,
        )
        .order_by(XPBoost.expires_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


def serialize_active_xp_boost(
    boost: XPBoost | None,
    *,
    now_utc: datetime | None = None,
) -> dict[str, object] | None:
    if boost is None:
        return None

    now_utc = _ensure_utc(now_utc)
    remaining_seconds = max(0, int((boost.expires_at - now_utc).total_seconds()))
    if remaining_seconds == 0:
        return None

    return {
        "multiplier": float(boost.multiplier),
        "source": boost.source,
        "activated_at": boost.activated_at,
        "expires_at": boost.expires_at,
        "remaining_seconds": remaining_seconds,
    }


def xp_required_for_level(level: int) -> int:
    safe_level = max(1, level)
    return int(75 * (safe_level - 1) * safe_level)


def level_from_total_xp(total_xp: int) -> int:
    level = 1
    while xp_required_for_level(level + 1) <= total_xp:
        level += 1
    return level


def build_level_progress(total_xp: int) -> LevelProgress:
    level = level_from_total_xp(total_xp)
    current_floor = xp_required_for_level(level)
    next_floor = xp_required_for_level(level + 1)
    span = max(1, next_floor - current_floor)
    current_level_xp = max(0, total_xp - current_floor)
    xp_to_next_level = max(0, next_floor - total_xp)
    progress_percent = int(round((current_level_xp / span) * 100))
    return LevelProgress(
        total_xp=total_xp,
        level=level,
        current_level_xp=current_level_xp,
        next_level_xp=next_floor,
        xp_to_next_level=xp_to_next_level,
        progress_percent=max(0, min(100, progress_percent)),
    )


async def ensure_default_achievement_definitions(db: AsyncSession) -> list[AchievementDefinition]:
    result = await db.execute(select(AchievementDefinition))
    existing = {definition.trigger_rule: definition for definition in result.scalars().all()}
    created = False
    for seed in ACHIEVEMENT_DEFINITIONS:
        if seed["trigger_rule"] in existing:
            continue
        definition = AchievementDefinition(**seed)
        db.add(definition)
        existing[definition.trigger_rule] = definition
        created = True
    if created:
        await db.flush()
    return list(existing.values())


async def ensure_wallets(db: AsyncSession, user_id: UUID) -> tuple[XPWallet, CoinWallet, UserStreak]:
    xp_wallet = await db.get(XPWallet, user_id)
    if xp_wallet is None:
        xp_wallet = XPWallet(user_id=user_id, total_xp=0, level=1)
        db.add(xp_wallet)

    coin_wallet = await db.get(CoinWallet, user_id)
    if coin_wallet is None:
        coin_wallet = CoinWallet(user_id=user_id, balance=0)
        db.add(coin_wallet)

    streak = await db.get(UserStreak, user_id)
    if streak is None:
        streak = UserStreak(user_id=user_id, current_streak=0, longest_streak=0)
        db.add(streak)

    await db.flush()
    return xp_wallet, coin_wallet, streak


async def touch_user_streak(
    db: AsyncSession,
    user_id: UUID,
    *,
    occurred_at: datetime | None = None,
) -> UserStreak:
    _, _, streak = await ensure_wallets(db, user_id)
    current_day = _activity_date(occurred_at)
    previous_day = current_day - timedelta(days=1)

    if streak.last_activity_date == current_day:
        streak.updated_at = _ensure_utc(occurred_at)
        return streak

    if streak.last_activity_date == previous_day:
        streak.current_streak += 1
    else:
        streak.current_streak = 1

    streak.longest_streak = max(streak.longest_streak, streak.current_streak)
    streak.last_activity_date = current_day
    streak.updated_at = _ensure_utc(occurred_at)
    await db.flush()
    return streak


async def _has_reward_source(db: AsyncSession, user_id: UUID, source: str) -> bool:
    result = await db.execute(
        select(XPEvent.id).where(
            XPEvent.user_id == user_id,
            XPEvent.source == source,
        )
    )
    return result.scalar_one_or_none() is not None


async def evaluate_achievement_unlocks(
    db: AsyncSession,
    user_id: UUID,
    *,
    occurred_at: datetime | None = None,
) -> list[UserAchievement]:
    definitions = await ensure_default_achievement_definitions(db)
    definition_map = {definition.trigger_rule: definition for definition in definitions}

    wallet, _, streak = await ensure_wallets(db, user_id)

    user_achievements = (
        await db.execute(
            select(UserAchievement).where(UserAchievement.user_id == user_id)
        )
    ).scalars().all()
    unlocked_definition_ids = {achievement.achievement_definition_id for achievement in user_achievements}

    event_sources = (
        await db.execute(select(XPEvent.source).where(XPEvent.user_id == user_id))
    ).scalars().all()

    rules_state = {
        "attempt_completed:1": any(source.startswith("attempt_completed:") for source in event_sources),
        "learning_session_finished:1": any(source.startswith("learning_sprint_finished:") for source in event_sources),
        "weak_topic_recovered:1": any(source.startswith("weak_topic_recovered:") for source in event_sources),
        "review_queue_cleared:1": any(source.startswith("review_queue_cleared:") for source in event_sources),
        "simulation_passed:1": any(source.startswith("simulation_passed:") for source in event_sources),
        "streak:7": streak.current_streak >= 7,
        "level:5": wallet.level >= 5,
    }

    unlocked: list[UserAchievement] = []
    awarded_at = _ensure_utc(occurred_at)
    for trigger_rule, satisfied in rules_state.items():
        if not satisfied:
            continue
        definition = definition_map.get(trigger_rule)
        if definition is None or definition.id in unlocked_definition_ids:
            continue
        user_achievement = UserAchievement(
            user_id=user_id,
            achievement_definition_id=definition.id,
            awarded_at=awarded_at,
        )
        db.add(user_achievement)
        unlocked.append(user_achievement)
        unlocked_definition_ids.add(definition.id)

    if unlocked:
        await db.flush()
        for achievement in unlocked:
            await db.refresh(achievement, attribute_names=["achievement_definition"])

    return unlocked


async def award_reward(
    db: AsyncSession,
    user_id: UUID,
    *,
    reward_key: str,
    source: str,
    occurred_at: datetime | None = None,
) -> RewardGrant:
    rule = REWARD_RULES[reward_key]
    return await award_custom_reward(
        db,
        user_id,
        xp_amount=int(rule["xp"]),
        coins_amount=int(rule["coins"]),
        source=source,
        occurred_at=occurred_at,
    )


async def award_custom_reward(
    db: AsyncSession,
    user_id: UUID,
    *,
    xp_amount: int,
    coins_amount: int,
    source: str,
    occurred_at: datetime | None = None,
) -> RewardGrant:
    if await _has_reward_source(db, user_id, source):
        return RewardGrant()

    xp_wallet, coin_wallet, _ = await ensure_wallets(db, user_id)
    event_time = _ensure_utc(occurred_at)

    xp_amount = max(0, int(xp_amount))
    coins_amount = max(0, int(coins_amount))
    active_boost = await get_active_xp_boost(db, user_id, now_utc=event_time)
    if active_boost is not None and xp_amount > 0:
        xp_amount = max(xp_amount, int(round(xp_amount * float(active_boost.multiplier))))

    db.add(
        XPEvent(
            user_id=user_id,
            source=source,
            xp_amount=xp_amount,
            created_at=event_time,
        )
    )
    if coins_amount > 0:
        db.add(
            CoinTransaction(
                user_id=user_id,
                amount=coins_amount,
                type="credit",
                source=source,
                created_at=event_time,
            )
        )

    xp_wallet.total_xp += xp_amount
    xp_wallet.level = level_from_total_xp(xp_wallet.total_xp)
    xp_wallet.last_updated = event_time

    coin_wallet.balance += coins_amount
    coin_wallet.last_updated = event_time

    await db.flush()
    unlocked_achievements = await evaluate_achievement_unlocks(db, user_id, occurred_at=event_time)

    return RewardGrant(
        xp_awarded=xp_amount,
        coins_awarded=coins_amount,
        unlocked_achievements=unlocked_achievements,
    )


async def award_daily_login(
    db: AsyncSession,
    user_id: UUID,
    *,
    occurred_at: datetime | None = None,
) -> RewardGrant:
    activity_time = _ensure_utc(occurred_at)
    await touch_user_streak(db, user_id, occurred_at=activity_time)
    source = f"daily_login:{activity_time.date().isoformat()}"
    return await award_reward(
        db,
        user_id,
        reward_key="daily_login",
        source=source,
        occurred_at=activity_time,
    )


async def award_attempt_completion_rewards(
    db: AsyncSession,
    user_id: UUID,
    *,
    attempt_id: UUID,
    mode: str,
    passed: bool,
    score_percent: float,
    occurred_at: datetime,
    topic_ids: set[UUID],
    pre_topic_state: dict[UUID, tuple[int, float]],
    due_review_count_before: int,
) -> RewardGrant:
    await touch_user_streak(db, user_id, occurred_at=occurred_at)

    total_grant = RewardGrant()

    async def _merge(grant: RewardGrant) -> None:
        total_grant.xp_awarded += grant.xp_awarded
        total_grant.coins_awarded += grant.coins_awarded
        total_grant.unlocked_achievements.extend(grant.unlocked_achievements)

    await _merge(
        await award_reward(
            db,
            user_id,
            reward_key="attempt_completed",
            source=f"attempt_completed:{attempt_id}",
            occurred_at=occurred_at,
        )
    )

    if mode == "learning":
        learning_reward = build_learning_step_completion_reward(score_percent)
        if learning_reward.xp_amount > 0 or learning_reward.coins_amount > 0:
            await _merge(
                await award_custom_reward(
                    db,
                    user_id,
                    xp_amount=learning_reward.xp_amount,
                    coins_amount=learning_reward.coins_amount,
                    source=f"learning_sprint_finished:{attempt_id}",
                    occurred_at=occurred_at,
                )
            )
        if learning_reward.perfect_bonus_coins > 0 or learning_reward.perfect_bonus_xp > 0:
            await _merge(
                await award_custom_reward(
                    db,
                    user_id,
                    xp_amount=learning_reward.perfect_bonus_xp,
                    coins_amount=learning_reward.perfect_bonus_coins,
                    source=f"learning_perfect_bonus:{attempt_id}",
                    occurred_at=occurred_at,
                )
            )

    if mode == "simulation" and passed:
        await _merge(
            await award_reward(
                db,
                user_id,
                reward_key="simulation_passed",
                source=f"simulation_passed:{attempt_id}",
                occurred_at=occurred_at,
            )
        )

    recovered = False
    if topic_ids:
        topic_rows = (
            await db.execute(
                select(UserTopicStats).where(
                    UserTopicStats.user_id == user_id,
                    UserTopicStats.topic_id.in_(topic_ids),
                )
            )
        ).scalars().all()
        for topic_row in topic_rows:
            previous_attempts, previous_accuracy = pre_topic_state.get(topic_row.topic_id, (0, 0.0))
            if previous_attempts < 5:
                continue
            if previous_accuracy >= 0.65:
                continue
            if topic_row.total_attempts >= 10 and topic_row.accuracy_rate >= 0.65:
                recovered = True
                break

    if recovered:
        await _merge(
            await award_reward(
                db,
                user_id,
                reward_key="weak_topic_recovered",
                source=f"weak_topic_recovered:{attempt_id}",
                occurred_at=occurred_at,
            )
        )

    due_review_count_after = int(
        (
            await db.execute(
                select(func.count(ReviewQueue.id)).where(
                    ReviewQueue.user_id == user_id,
                    ReviewQueue.next_review_at <= occurred_at,
                )
            )
        ).scalar_one()
        or 0
    )
    if due_review_count_before > 0 and due_review_count_after == 0:
        await _merge(
            await award_reward(
                db,
                user_id,
                reward_key="review_queue_cleared",
                source=f"review_queue_cleared:{attempt_id}",
                occurred_at=occurred_at,
            )
        )

    return total_grant


async def get_recent_achievements(
    db: AsyncSession,
    user_id: UUID,
    *,
    limit: int = 5,
) -> list[UserAchievement]:
    await ensure_default_achievement_definitions(db)
    result = await db.execute(
        select(UserAchievement)
        .options(selectinload(UserAchievement.achievement_definition))
        .where(UserAchievement.user_id == user_id)
        .order_by(UserAchievement.awarded_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_full_achievements(
    db: AsyncSession,
    user_id: UUID,
) -> list[UserAchievement]:
    await ensure_default_achievement_definitions(db)
    result = await db.execute(
        select(UserAchievement)
        .options(selectinload(UserAchievement.achievement_definition))
        .where(UserAchievement.user_id == user_id)
        .order_by(UserAchievement.awarded_at.desc())
    )
    return list(result.scalars().all())


async def build_gamification_summary(
    db: AsyncSession,
    user_id: UUID,
) -> dict[str, object]:
    xp_wallet, coin_wallet, streak = await ensure_wallets(db, user_id)
    recent_achievements = await get_recent_achievements(db, user_id, limit=4)
    level_progress = build_level_progress(xp_wallet.total_xp)
    active_boost = serialize_active_xp_boost(await get_active_xp_boost(db, user_id))
    return {
        "xp": {
            "total_xp": level_progress.total_xp,
            "level": level_progress.level,
            "current_level_xp": level_progress.current_level_xp,
            "next_level_xp": level_progress.next_level_xp,
            "xp_to_next_level": level_progress.xp_to_next_level,
            "progress_percent": level_progress.progress_percent,
        },
        "coins": {
            "balance": int(coin_wallet.balance),
            "last_updated": coin_wallet.last_updated,
        },
        "streak": {
            "current_streak": int(streak.current_streak),
            "longest_streak": int(streak.longest_streak),
            "last_activity_date": streak.last_activity_date,
        },
        "active_xp_boost": active_boost,
        "recent_achievements": recent_achievements,
    }


def _period_start(period: LeaderboardPeriod, now: datetime) -> datetime:
    if period == "daily":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "weekly":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return start - timedelta(days=start.weekday())
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


async def rebuild_leaderboard_snapshot(
    db: AsyncSession,
    *,
    period: LeaderboardPeriod,
) -> tuple[list[LeaderboardSnapshot], datetime]:
    now = _ensure_utc(None)
    captured_at = now
    start_at = _period_start(period, now)

    rows = (
        await db.execute(
            select(
                XPEvent.user_id,
                func.coalesce(func.sum(XPEvent.xp_amount), 0).label("xp_total"),
            )
            .where(XPEvent.created_at >= start_at)
            .group_by(XPEvent.user_id)
            .order_by(func.coalesce(func.sum(XPEvent.xp_amount), 0).desc(), XPEvent.user_id.asc())
        )
    ).all()

    await db.execute(delete(LeaderboardSnapshot).where(LeaderboardSnapshot.period == period))

    snapshots: list[LeaderboardSnapshot] = []
    for rank, row in enumerate(rows, start=1):
        snapshot = LeaderboardSnapshot(
            user_id=row.user_id,
            xp=int(row.xp_total or 0),
            period=period,
            rank=rank,
            captured_at=captured_at,
        )
        db.add(snapshot)
        snapshots.append(snapshot)

    await db.flush()
    return snapshots, captured_at


async def refresh_all_leaderboard_snapshots(
    db: AsyncSession,
) -> dict[LeaderboardPeriod, datetime]:
    captured_times: dict[LeaderboardPeriod, datetime] = {}
    for period in ("daily", "weekly", "monthly"):
        _, captured_at = await rebuild_leaderboard_snapshot(db, period=period)
        captured_times[period] = captured_at
    return captured_times


async def get_leaderboard_rows(
    db: AsyncSession,
    *,
    period: LeaderboardPeriod,
    limit: int = 20,
) -> tuple[list[tuple[LeaderboardSnapshot, User]], datetime]:
    await ensure_default_achievement_definitions(db)
    captured_at = (
        await db.execute(
            select(func.max(LeaderboardSnapshot.captured_at)).where(LeaderboardSnapshot.period == period)
        )
    ).scalar_one_or_none()
    if captured_at is None:
        return [], _ensure_utc(None)

    result = await db.execute(
        select(LeaderboardSnapshot, User)
        .join(User, User.id == LeaderboardSnapshot.user_id)
        .where(LeaderboardSnapshot.period == period)
        .order_by(LeaderboardSnapshot.rank.asc())
        .limit(limit)
    )
    return list(result.all()), captured_at


async def get_leaderboard_me(
    db: AsyncSession,
    *,
    user_id: UUID,
    period: LeaderboardPeriod,
) -> tuple[LeaderboardSnapshot | None, datetime]:
    captured_at = (
        await db.execute(
            select(func.max(LeaderboardSnapshot.captured_at)).where(LeaderboardSnapshot.period == period)
        )
    ).scalar_one_or_none()
    if captured_at is None:
        return None, _ensure_utc(None)

    result = await db.execute(
        select(LeaderboardSnapshot)
        .where(
            LeaderboardSnapshot.period == period,
            LeaderboardSnapshot.user_id == user_id,
        )
        .limit(1)
    )
    return result.scalar_one_or_none(), captured_at
