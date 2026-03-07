"""
AUTOTEST Public Test Router
Endpoints for browsing and viewing tests
"""

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
import logging
from math import exp
from uuid import UUID
import random

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import Float, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.attempts.schemas import AdaptiveStartResponse
from api.tests.schemas import FreeTestStatus, PublicTestDetail, PublicTestList
from api.auth.router import get_current_user
from models.user import User
from database.session import get_db
from models.question import Question
from models.question_category import QuestionCategory
from models.attempt import Attempt
from models.attempt_answer import AttemptAnswer
from models.test import Test
from models.user_adaptive_profile import UserAdaptiveProfile
from models.user_question_history import UserQuestionHistory
from models.user_skill import UserSkill
from core.config import settings
from analytics.pass_probability import calculate_pass_probability

router = APIRouter(prefix="/tests", tags=["tests"])
logger = logging.getLogger(__name__)

ALLOWED_QUESTION_COUNTS = {20, 30, 40, 50}
QUESTION_COUNT_TO_MINUTES = {
    20: 25,
    30: 38,
    40: 50,
    50: 62,
}
FREE_RANDOM_QUESTION_COUNT = 20


def _sanitize_option_text(text_value: str) -> str:
    text = text_value.strip()
    if text.lower().endswith("/t"):
        return text[:-2].rstrip()
    return text


async def _get_free_attempt_status(current_user: User, db: AsyncSession) -> FreeTestStatus:
    from api.attempts.router import FREE_MAX_ATTEMPTS_PER_DAY

    if current_user.is_premium or current_user.is_admin:
        return FreeTestStatus(
            attempts_used_today=0,
            attempts_limit=0,
            attempts_remaining=999999,
            limit_reached=False,
            is_premium=True,
        )

    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    attempts_today_result = await db.execute(
        select(func.count(Attempt.id)).where(
            Attempt.user_id == current_user.id,
            Attempt.started_at >= start_of_day,
        )
    )
    attempts_used_today = int(attempts_today_result.scalar_one() or 0)
    attempts_limit = FREE_MAX_ATTEMPTS_PER_DAY
    attempts_remaining = max(0, attempts_limit - attempts_used_today)
    return FreeTestStatus(
        attempts_used_today=attempts_used_today,
        attempts_limit=attempts_limit,
        attempts_remaining=attempts_remaining,
        limit_reached=attempts_used_today >= attempts_limit,
        is_premium=False,
    )


def _build_balanced_random_selection(
    all_questions: list[Question],
    total_questions: int,
) -> list[Question]:
    if len(all_questions) < total_questions:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough questions for requested count ({total_questions}).",
        )

    grouped_questions: dict[str, list[Question]] = defaultdict(list)
    for question in all_questions:
        group_key = (
            str(question.category_id)
            if question.category_id
            else (question.topic or question.category or "__general__").strip().lower()
        )
        grouped_questions[group_key].append(question)

    group_items = list(grouped_questions.items())
    random.shuffle(group_items)
    for _, group in group_items:
        random.shuffle(group)

    selected: list[Question] = []
    selected_ids: set[UUID] = set()

    while len(selected) < total_questions:
        progressed = False
        for _, group in group_items:
            while group:
                question = group.pop()
                if question.id in selected_ids:
                    continue
                selected.append(question)
                selected_ids.add(question.id)
                progressed = True
                break
            if len(selected) >= total_questions:
                break
        if not progressed:
            break

    if len(selected) < total_questions:
        remaining = [question for question in all_questions if question.id not in selected_ids]
        random.shuffle(remaining)
        selected.extend(remaining[: total_questions - len(selected)])

    return selected[:total_questions]


class AdaptiveStartRequest(BaseModel):
    question_count: int = 20
    pressure_mode: bool = False


def _public_question_payload(question: Question) -> dict:
    options = list(question.answer_options)
    random.shuffle(options)
    return {
        "id": question.id,
        "text": question.text,
        "image_url": question.image_url,
        "video_url": question.video_url,
        "media_type": question.media_type,
        "topic": question.topic,
        "category": question.category,
        "difficulty": question.difficulty,
        "answer_options": [{"id": option.id, "text": _sanitize_option_text(option.text)} for option in options],
    }


def _question_difficulty_percent(question: Question) -> int:
    if question.difficulty_percent is not None:
        return max(0, min(100, int(question.difficulty_percent)))
    if question.difficulty == "hard":
        return 30
    if question.difficulty == "easy":
        return 70
    return 50


def _difficulty_band(question: Question) -> str:
    difficulty_percent = _question_difficulty_percent(question)
    if difficulty_percent >= 67:
        return "easy"
    if difficulty_percent <= 33:
        return "hard"
    return "medium"


def _is_dev_mode() -> bool:
    return bool(settings.DEBUG)


def _build_weighted_quotas(
    weights: dict[str, float],
    total_questions: int,
    min_ratio: float = 0.10,
    max_ratio: float = 0.45,
) -> dict[str, int]:
    if not weights:
        return {}
    keys = list(weights.keys())
    key_count = len(keys)
    if key_count == 1:
        return {keys[0]: total_questions}

    min_quota = int(total_questions * min_ratio)
    max_quota = int(total_questions * max_ratio)

    if min_quota * key_count > total_questions:
        min_quota = total_questions // key_count
    if max_quota < min_quota:
        max_quota = min_quota

    theoretical_max_floor = total_questions // key_count
    if max_quota * key_count < total_questions:
        max_quota = max(max_quota, theoretical_max_floor + 1)

    quotas = {k: min_quota for k in keys}
    remaining = total_questions - (min_quota * key_count)
    if remaining <= 0:
        return quotas

    total_weight = sum(max(0.01, v) for v in weights.values())
    fractions: list[tuple[str, float]] = []

    for key in keys:
        capacity = max(0, max_quota - quotas[key])
        ideal = (max(0.01, weights[key]) / total_weight) * remaining
        allocated = min(capacity, int(ideal))
        quotas[key] += allocated
        fractions.append((key, ideal - int(ideal)))

    used = sum(quotas.values())
    left = total_questions - used
    if left > 0:
        fractions.sort(key=lambda item: item[1], reverse=True)
        index = 0
        guard = 0
        while left > 0 and guard < 2000:
            key = fractions[index % len(fractions)][0]
            if quotas[key] < max_quota:
                quotas[key] += 1
                left -= 1
            index += 1
            guard += 1
            if guard > len(fractions) * 2 and all(quotas[k] >= max_quota for k in keys):
                # Safety fallback when constraints are saturated.
                richest = max(keys, key=lambda k: weights[k])
                quotas[richest] += left
                left = 0
                break
    return quotas


@router.get("", response_model=list[PublicTestList])
async def get_tests(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """
    Get list of active tests.
    Legacy non-adaptive list is still exposed for compatibility.
    """
    stmt = (
        select(
            Test.id,
            Test.title,
            Test.description,
            Test.difficulty,
            Test.is_premium,
            Test.duration,
            Test.created_at,
            func.count(Question.id).label("question_count"),
        )
        .outerjoin(Question, Question.test_id == Test.id)
        .where(Test.is_active == True)
        .where(Test.difficulty != "Adaptive")
        .group_by(Test.id)
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        PublicTestList(
            id=row.id,
            title=row.title,
            description=row.description,
            difficulty=row.difficulty,
            is_premium=row.is_premium,
            duration=row.duration,
            question_count=row.question_count,
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.get("/free-status", response_model=FreeTestStatus)
async def get_free_test_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FreeTestStatus:
    return await _get_free_attempt_status(current_user, db)


async def _get_or_create_adaptive_profile(current_user: User, db: AsyncSession) -> UserAdaptiveProfile:
    result = await db.execute(
        select(UserAdaptiveProfile).where(UserAdaptiveProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if profile is not None:
        return profile

    profile = UserAdaptiveProfile(user_id=current_user.id, target_difficulty_percent=50)
    db.add(profile)
    await db.flush()
    return profile


@router.post("/adaptive/start", response_model=AdaptiveStartResponse)
async def start_adaptive_test(
    payload: AdaptiveStartRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Start adaptive test from question bank using weighted adaptive selection.
    """
    from api.attempts.router import check_attempt_limit

    await check_attempt_limit(current_user, db)

    if not (current_user.is_premium or current_user.is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required to start adaptive mode.",
        )

    request_payload = payload or AdaptiveStartRequest()
    requested_count = request_payload.question_count
    if requested_count not in ALLOWED_QUESTION_COUNTS:
        raise HTTPException(
            status_code=400,
            detail="question_count must be one of: 20, 30, 40, 50.",
        )

    profile = await _get_or_create_adaptive_profile(current_user, db)
    target_percent = max(0, min(100, int(profile.target_difficulty_percent)))

    categories_result = await db.execute(
        select(QuestionCategory)
        .where(QuestionCategory.is_active == True)  # noqa: E712
        .order_by(QuestionCategory.name.asc())
    )
    categories = list(categories_result.scalars().all())
    active_category_ids = {category.id for category in categories}

    questions_result = await db.execute(
        select(Question)
        .options(selectinload(Question.answer_options))
        .where(Question.answer_options.any())
    )
    all_questions = list(questions_result.scalars().all())

    if not all_questions:
        raise HTTPException(status_code=404, detail="No questions available")
    if len(all_questions) < requested_count:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough questions for requested count ({requested_count}).",
        )

    # Adaptive index for progressive pressure.
    adaptive_idx_result = await db.execute(
        select(func.count(Attempt.id)).where(
            Attempt.user_id == current_user.id,
            Attempt.mode == "adaptive",
            Attempt.finished_at.is_not(None),
        )
    )
    adaptive_test_idx = int(adaptive_idx_result.scalar_one() or 0) + 1
    adaptive_boost = adaptive_test_idx >= 4

    # Topic weakness + decay signals from user skill table.
    skill_rows = (
        await db.execute(
            select(UserSkill.topic, UserSkill.skill_score, UserSkill.last_practice_at).where(
                UserSkill.user_id == current_user.id
            )
        )
    ).all()
    now_utc = datetime.now(timezone.utc)
    topic_signals: list[tuple[str, float, float, float]] = []
    for row in skill_rows:
        if not row.topic:
            continue
        topic_key = row.topic.strip().lower()
        if not topic_key:
            continue
        if row.last_practice_at is None:
            days_since = 30.0
        else:
            last_practice = row.last_practice_at
            if last_practice.tzinfo is None:
                last_practice = last_practice.replace(tzinfo=timezone.utc)
            days_since = max(0.0, (now_utc - last_practice).total_seconds() / 86400.0)
        decay_factor = exp(-0.05 * days_since)
        effective_skill = max(0.0, min(1.0, float(row.skill_score) * decay_factor))
        weakness_score = ((1.0 - effective_skill) * 0.7) + ((1.0 - decay_factor) * 0.3)
        topic_signals.append((topic_key, weakness_score, decay_factor, days_since))

    # Topic momentum: recent accuracy - long-term skill (per topic/category key).
    # Negative momentum means recent drop and should increase selection weight.
    recent_topic_rows = (
        await db.execute(
            select(Question.topic, Question.category, AttemptAnswer.is_correct)
            .join(AttemptAnswer, AttemptAnswer.question_id == Question.id)
            .join(Attempt, Attempt.id == AttemptAnswer.attempt_id)
            .where(
                Attempt.user_id == current_user.id,
                Attempt.finished_at.is_not(None),
            )
            .order_by(Attempt.finished_at.desc())
            .limit(600)
        )
    ).all()
    topic_recent: dict[str, list[int]] = defaultdict(list)
    topic_long_term: dict[str, list[float]] = defaultdict(list)
    for row in recent_topic_rows:
        result_value = 1 if bool(row.is_correct) else 0
        keys = set()
        if row.topic:
            keys.add(row.topic.strip().lower())
        if row.category:
            keys.add(row.category.strip().lower())
        for key in keys:
            topic_recent[key].append(result_value)
    for row in skill_rows:
        if not row.topic:
            continue
        key = row.topic.strip().lower()
        if key:
            topic_long_term[key].append(max(0.0, min(1.0, float(row.skill_score))))

    def _topic_momentum(topic_key: str) -> float:
        recent_values = topic_recent.get(topic_key, [])
        if not recent_values:
            return 0.0
        recent_window = recent_values[:20]
        recent_accuracy = sum(recent_window) / len(recent_window)
        long_term_values = topic_long_term.get(topic_key, [])
        if long_term_values:
            long_term_accuracy = sum(long_term_values) / len(long_term_values)
        else:
            long_term_accuracy = recent_accuracy
        return recent_accuracy - long_term_accuracy

    topic_signals.sort(key=lambda item: item[1], reverse=True)
    weak_topics = {topic for topic, _, _, _ in topic_signals[:3]}
    stale_topics = {topic for topic, _, decay_factor, days_since in topic_signals if days_since >= 7 or decay_factor <= 0.70}

    # User question history for repeat-penalty and mastery suppression.
    recent_attempt_rows = (
        await db.execute(
            select(Attempt.question_ids)
            .where(
                Attempt.user_id == current_user.id,
                Attempt.mode == "adaptive",
            )
            .order_by(Attempt.started_at.desc())
            .limit(30)
        )
    ).all()
    seen_frequency: dict[UUID, int] = {}
    for row in recent_attempt_rows:
        for raw_qid in row.question_ids or []:
            try:
                qid = UUID(str(raw_qid))
            except ValueError:
                continue
            seen_frequency[qid] = seen_frequency.get(qid, 0) + 1

    all_question_ids = [question.id for question in all_questions]
    history_rows = (
        await db.execute(
            select(
                UserQuestionHistory.question_id,
                UserQuestionHistory.correct_count,
                UserQuestionHistory.attempt_count,
            ).where(
                UserQuestionHistory.user_id == current_user.id,
                UserQuestionHistory.question_id.in_(all_question_ids),
            )
        )
    ).all() if all_question_ids else []
    history_map: dict[UUID, tuple[int, int]] = {
        row.question_id: (int(row.correct_count), int(row.attempt_count))
        for row in history_rows
    }

    recent_answer_rows = (
        await db.execute(
            select(AttemptAnswer.question_id, AttemptAnswer.is_correct)
            .join(Attempt, Attempt.id == AttemptAnswer.attempt_id)
            .where(
                Attempt.user_id == current_user.id,
                Attempt.finished_at.is_not(None),
                AttemptAnswer.question_id.in_(all_question_ids),
            )
            .order_by(AttemptAnswer.question_id.asc(), Attempt.finished_at.desc())
        )
    ).all() if all_question_ids else []

    recent_two_results: dict[UUID, list[bool]] = {}
    for row in recent_answer_rows:
        bucket = recent_two_results.setdefault(row.question_id, [])
        if len(bucket) < 2:
            bucket.append(bool(row.is_correct))

    mastered_question_ids: set[UUID] = set()
    for qid, (correct_count, _) in history_map.items():
        last_two = recent_two_results.get(qid, [])
        if correct_count >= 2 and len(last_two) >= 2 and all(last_two):
            mastered_question_ids.add(qid)

    # Pool questions by category key.
    category_name_by_id = {str(category.id): category.name for category in categories}
    category_pools: dict[str, list[Question]] = {}
    if active_category_ids:
        for category in categories:
            category_pools[str(category.id)] = []
        for question in all_questions:
            if question.category_id and question.category_id in active_category_ids:
                category_pools[str(question.category_id)].append(question)
        category_pools = {key: pool for key, pool in category_pools.items() if pool}
    if not category_pools:
        category_pools = {"__all__": all_questions[:]}

    pool_meta: dict[str, dict[str, object]] = {}
    weak_topic_rank = {topic: idx for idx, (topic, _, _, _) in enumerate(topic_signals)}
    for key, pool in category_pools.items():
        topic_keys: set[str] = set()
        for question in pool:
            if question.topic:
                topic_keys.add(question.topic.strip().lower())
            if question.category:
                topic_keys.add(question.category.strip().lower())
        if key in category_name_by_id:
            topic_keys.add(category_name_by_id[key].strip().lower())
        is_weak = any(topic in weak_topics for topic in topic_keys)
        is_stale = any(topic in stale_topics for topic in topic_keys)
        weak_rank_candidates = [weak_topic_rank[topic] for topic in topic_keys if topic in weak_topic_rank]
        weak_rank = min(weak_rank_candidates) if weak_rank_candidates else None
        pool_meta[key] = {
            "topic_keys": topic_keys,
            "is_weak": is_weak,
            "is_stale": is_stale,
            "weak_rank": weak_rank,
            "display": category_name_by_id.get(key, "General bank"),
        }

    weak_multiplier = 1.4 if adaptive_boost else 1.0
    stale_multiplier = 1.2 if adaptive_boost else 1.0
    category_weights: dict[str, float] = {}
    for key in category_pools.keys():
        weight = 1.0
        if bool(pool_meta[key]["is_weak"]):
            weight *= 2.2 * weak_multiplier
            weak_rank = pool_meta[key].get("weak_rank")
            if weak_rank == 0:
                weight *= 1.2
            elif weak_rank == 1:
                weight *= 1.1
        if bool(pool_meta[key]["is_stale"]):
            weight *= 1.5 * stale_multiplier
        topic_momentums = [_topic_momentum(topic) for topic in pool_meta[key]["topic_keys"]]
        momentum = min(topic_momentums) if topic_momentums else 0.0
        momentum_boost = 1.0 + max(0.0, -momentum) * 0.5
        weight *= momentum_boost
        pool_meta[key]["momentum"] = momentum
        pool_meta[key]["momentum_boost"] = momentum_boost
        category_weights[key] = weight

    category_quotas = _build_weighted_quotas(
        weights=category_weights,
        total_questions=requested_count,
        min_ratio=0.10,
        max_ratio=0.45,
    )

    easy_target = max(1, int(round(requested_count * 0.20)))
    medium_target = max(1, int(round(requested_count * 0.50)))
    hard_target = max(0, requested_count - easy_target - medium_target)
    stage_targets = {"easy": easy_target, "medium": medium_target, "hard": hard_target}

    selected: list[Question] = []
    selected_ids: set[UUID] = set()
    selected_per_category: dict[str, int] = {key: 0 for key in category_quotas.keys()}
    selected_per_band: dict[str, int] = {"easy": 0, "medium": 0, "hard": 0}

    def _repeat_penalty_for_question(question_id: UUID) -> float:
        seen_freq = seen_frequency.get(question_id, 0)
        return min(3.5, 1.2 ** seen_freq)

    def question_priority(question: Question, category_key: str) -> float:
        distance_to_target = abs(_question_difficulty_percent(question) - target_percent)
        repeat_penalty = _repeat_penalty_for_question(question.id)
        randomness = random.uniform(0.90, 1.10)
        weakness_bonus = 8.0 if bool(pool_meta[category_key]["is_weak"]) else 0.0
        decay_bonus = 5.0 if bool(pool_meta[category_key]["is_stale"]) else 0.0
        mastery_bonus = 8.0 if question.id in mastered_question_ids else 0.0
        reinforcement_bonus = (
            4.0
            if seen_frequency.get(question.id, 0) > 0 and question.id not in mastered_question_ids
            else 0.0
        )
        return (
            (distance_to_target * repeat_penalty * randomness)
            - weakness_bonus
            - decay_bonus
            - mastery_bonus
            - reinforcement_bonus
        )

    def pop_best_question(
        band: str,
        category_key: str,
    ) -> Question | None:
        candidates = []
        for question in category_pools[category_key]:
            if question.id in selected_ids:
                continue
            if selected_per_category[category_key] >= category_quotas[category_key]:
                continue
            if _difficulty_band(question) != band:
                continue
            candidates.append(question)
        if not candidates:
            return None
        candidates.sort(key=lambda q: question_priority(q, category_key))
        return candidates[0]

    def choose_category_for_stage(band: str) -> str | None:
        eligible_keys = []
        for key in category_quotas.keys():
            if selected_per_category[key] >= category_quotas[key]:
                continue
            if any(
                q.id not in selected_ids and _difficulty_band(q) == band
                for q in category_pools[key]
            ):
                eligible_keys.append(key)
        if not eligible_keys:
            return None
        best_key: str | None = None
        best_score = float("-inf")
        for key in eligible_keys:
            remaining_quota_ratio = (
                (category_quotas[key] - selected_per_category[key]) / max(1, category_quotas[key])
            )
            category_noise = random.uniform(0.98, 1.02)
            priority = remaining_quota_ratio * category_weights.get(key, 1.0) * category_noise
            if priority > best_score:
                best_score = priority
                best_key = key
        return best_key

    for stage in ("easy", "medium", "hard"):
        needed = stage_targets[stage]
        while selected_per_band[stage] < needed and len(selected) < requested_count:
            chosen_category = choose_category_for_stage(stage)
            if not chosen_category:
                break
            picked = pop_best_question(stage, chosen_category)
            if not picked:
                break
            selected.append(picked)
            selected_ids.add(picked.id)
            selected_per_category[chosen_category] += 1
            selected_per_band[stage] += 1

    # Fill missing stage deficits while respecting category quotas.
    for stage in ("easy", "medium", "hard"):
        deficit = stage_targets[stage] - selected_per_band[stage]
        while deficit > 0 and len(selected) < requested_count:
            candidates: list[tuple[str, Question]] = []
            for category_key in category_quotas.keys():
                if selected_per_category[category_key] >= category_quotas[category_key]:
                    continue
                for question in category_pools[category_key]:
                    if question.id in selected_ids:
                        continue
                    if _difficulty_band(question) != stage:
                        continue
                    candidates.append((category_key, question))
            if not candidates:
                break
            candidates.sort(key=lambda item: question_priority(item[1], item[0]))
            category_key, question = candidates[0]
            selected.append(question)
            selected_ids.add(question.id)
            selected_per_category[category_key] += 1
            selected_per_band[stage] += 1
            deficit -= 1

    # Fallback 1: fill remaining quota by priority regardless of stage band.
    if len(selected) < requested_count:
        for category_key in category_quotas.keys():
            if selected_per_category[category_key] >= category_quotas[category_key]:
                continue
            candidates = [
                q for q in category_pools[category_key]
                if q.id not in selected_ids
            ]
            candidates.sort(key=lambda q: question_priority(q, category_key))
            for question in candidates:
                if len(selected) >= requested_count:
                    break
                if selected_per_category[category_key] >= category_quotas[category_key]:
                    break
                selected.append(question)
                selected_ids.add(question.id)
                selected_per_category[category_key] += 1
                selected_per_band[_difficulty_band(question)] += 1

    # Fallback 2: global fill when category pools are exhausted.
    if len(selected) < requested_count:
        remaining = [q for q in all_questions if q.id not in selected_ids]
        remaining.sort(key=lambda q: abs(_question_difficulty_percent(q) - target_percent))
        for question in remaining:
            if len(selected) >= requested_count:
                break
            category_key = str(question.category_id) if question.category_id else "__all__"
            if category_key in selected_per_category and selected_per_category[category_key] >= category_quotas.get(category_key, requested_count):
                continue
            selected.append(question)
            selected_ids.add(question.id)
            selected_per_band[_difficulty_band(question)] += 1
            if category_key in selected_per_category:
                selected_per_category[category_key] += 1

    # Last-resort fill only if strict category caps block completion.
    if len(selected) < requested_count:
        overflow_remaining = [q for q in all_questions if q.id not in selected_ids]
        overflow_remaining.sort(key=lambda q: abs(_question_difficulty_percent(q) - target_percent))
        for question in overflow_remaining[: requested_count - len(selected)]:
            selected.append(question)
            selected_ids.add(question.id)
            selected_per_band[_difficulty_band(question)] += 1

    questions = selected[:requested_count]
    # Keep stage progression order in final set.
    questions.sort(key=lambda q: {"easy": 0, "medium": 1, "hard": 2}[_difficulty_band(q)])

    if _is_dev_mode():
        difficulty_distribution = Counter(_difficulty_band(question) for question in questions)
        category_distribution = Counter()
        weak_bonus_applied = 8.0
        decay_bonus_applied = 5.0
        for question in questions:
            category_key = str(question.category_id) if question.category_id else "__all__"
            category_distribution[str(pool_meta.get(category_key, {}).get("display", "General bank"))] += 1
        chunk_size = max(1, len(questions) // 4)
        first_chunk = questions[:chunk_size]
        last_chunk = questions[-chunk_size:]
        first_chunk_avg = round(sum(_question_difficulty_percent(q) for q in first_chunk) / len(first_chunk), 2)
        last_chunk_avg = round(sum(_question_difficulty_percent(q) for q in last_chunk) / len(last_chunk), 2)
        avg_question_difficulty = round(sum(_question_difficulty_percent(q) for q in questions) / len(questions), 2)
        repeat_penalty_average = round(
            sum(_repeat_penalty_for_question(q.id) for q in questions) / len(questions),
            2,
        )
        mastered_question_count = sum(1 for q in questions if q.id in mastered_question_ids)
        weak_weight_values = [
            category_weights[key]
            for key in category_weights.keys()
            if bool(pool_meta[key]["is_weak"])
        ]
        weak_topic_weight_average = round(
            (sum(weak_weight_values) / len(weak_weight_values)) if weak_weight_values else 0.0,
            2,
        )
        momentum_values = {
            str(pool_meta[key].get("display", key)): round(float(pool_meta[key].get("momentum", 0.0)), 3)
            for key in category_weights.keys()
        }
        difficulty_trend = round(last_chunk_avg - first_chunk_avg, 2)
        probability_prediction = await calculate_pass_probability(current_user.id, db)
        pass_probability_prediction = round(probability_prediction.pass_probability, 4)
        logger.info(
            "TEST_GENERATION | selected_questions=%s | difficulty_distribution=%s | category_distribution=%s | "
            "weak_topics=%s | stale_topics=%s | weak_influence_bonus=%s | decay_influence_bonus=%s | "
            "target_difficulty=%s | average_question_difficulty=%s | first_chunk_avg_difficulty=%s | "
            "last_chunk_avg_difficulty=%s | adaptive_test_index=%s | repeat_penalty_average=%s | "
            "mastered_question_count=%s | weak_topic_weight_average=%s | momentum_values=%s | "
            "difficulty_trend=%s | pass_probability_prediction=%s",
            len(questions),
            {
                "easy": difficulty_distribution.get("easy", 0),
                "medium": difficulty_distribution.get("medium", 0),
                "hard": difficulty_distribution.get("hard", 0),
            },
            dict(category_distribution),
            sorted(weak_topics),
            sorted(stale_topics),
            weak_bonus_applied,
            decay_bonus_applied,
            target_percent,
            avg_question_difficulty,
            first_chunk_avg,
            last_chunk_avg,
            adaptive_test_idx,
            repeat_penalty_average,
            mastered_question_count,
            weak_topic_weight_average,
            momentum_values,
            difficulty_trend,
            pass_probability_prediction,
        )

    adaptive_title = "Adaptive Practice Mode"
    test_result = await db.execute(select(Test).where(Test.title == adaptive_title))
    adaptive_test = test_result.scalar_one_or_none()

    duration_minutes = QUESTION_COUNT_TO_MINUTES.get(
        requested_count,
        max(10, int(round(requested_count * 1.25))),
    )
    if request_payload.pressure_mode:
        duration_minutes = max(5, int(round(duration_minutes * 0.8)))

    if not adaptive_test:
        adaptive_test = Test(
            title=adaptive_title,
            description="Generated adaptive test based on your performance.",
            difficulty="Adaptive",
            duration=duration_minutes,
            is_active=True,
            is_premium=True,
        )
        db.add(adaptive_test)
        await db.flush()
    elif adaptive_test.duration != duration_minutes:
        adaptive_test.duration = duration_minutes

    if target_percent <= 35:
        training_level = "advanced"
    elif target_percent <= 65:
        training_level = "intermediate"
    else:
        training_level = "beginner"

    attempt = Attempt(
        user_id=current_user.id,
        test_id=adaptive_test.id,
        mode="adaptive",
        training_level=training_level,
        pressure_mode=request_payload.pressure_mode,
        pressure_score_modifier=0.85 if request_payload.pressure_mode else 1.0,
        question_ids=[str(question.id) for question in questions],
        question_count=len(questions),
        time_limit_seconds=duration_minutes * 60,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    return AdaptiveStartResponse(
        id=attempt.id,
        test_id=attempt.test_id,
        score=attempt.score,
        started_at=attempt.started_at.isoformat(),
        finished_at=None,
        questions=[_public_question_payload(question) for question in questions],
        question_count=len(questions),
        duration_minutes=duration_minutes,
        attempt_mode="adaptive",
    )


@router.get("/free-random", response_model=AdaptiveStartResponse)
async def start_free_random_test(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AdaptiveStartResponse:
    usage = await _get_free_attempt_status(current_user, db)

    if usage.is_premium:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Premium users should use adaptive mode instead of free random mode.",
        )

    if usage.limit_reached:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "DAILY_LIMIT_REACHED",
                "attempts_used_today": usage.attempts_used_today,
                "attempts_limit": usage.attempts_limit,
                "attempts_remaining": usage.attempts_remaining,
            },
        )

    questions_result = await db.execute(
        select(Question)
        .options(selectinload(Question.answer_options))
        .where(Question.answer_options.any())
    )
    all_questions = list(questions_result.scalars().all())
    questions = _build_balanced_random_selection(all_questions, FREE_RANDOM_QUESTION_COUNT)

    free_test_result = await db.execute(
        select(Test).where(Test.title == "Free Random Practice")
    )
    free_test = free_test_result.scalar_one_or_none()
    duration_minutes = QUESTION_COUNT_TO_MINUTES[FREE_RANDOM_QUESTION_COUNT]

    if free_test is None:
        free_test = Test(
            title="Free Random Practice",
            description="Randomized daily practice for free users.",
            difficulty="Random",
            duration=duration_minutes,
            is_active=True,
            is_premium=False,
        )
        db.add(free_test)
        await db.flush()
    elif free_test.duration != duration_minutes:
        free_test.duration = duration_minutes

    attempt = Attempt(
        user_id=current_user.id,
        test_id=free_test.id,
        mode="free_random",
        pressure_mode=False,
        pressure_score_modifier=1.0,
        question_ids=[str(question.id) for question in questions],
        question_count=len(questions),
        time_limit_seconds=duration_minutes * 60,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    refreshed_usage = await _get_free_attempt_status(current_user, db)

    return AdaptiveStartResponse(
        id=attempt.id,
        test_id=attempt.test_id,
        score=attempt.score,
        started_at=attempt.started_at.isoformat(),
        finished_at=None,
        questions=[_public_question_payload(question) for question in questions],
        question_count=len(questions),
        duration_minutes=duration_minutes,
        attempt_mode="free_random",
        attempts_used_today=refreshed_usage.attempts_used_today,
        attempts_limit=refreshed_usage.attempts_limit,
        attempts_remaining=refreshed_usage.attempts_remaining,
    )


@router.get("/{test_id}", response_model=PublicTestDetail)
async def get_test_detail(
    test_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Get full test detail for taking a test.
    Includes questions and answer options (without is_correct).
    """
    stmt = (
        select(Test)
        .options(
            selectinload(Test.questions).selectinload(Question.answer_options)
        )
        .where(Test.id == test_id)
        .where(Test.is_active == True)
    )

    result = await db.execute(stmt)
    test = result.scalar_one_or_none()

    if not test:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test not found",
        )

    return {
        "id": test.id,
        "title": test.title,
        "description": test.description,
        "difficulty": test.difficulty,
        "is_premium": test.is_premium,
        "duration": test.duration,
        "questions": [_public_question_payload(question) for question in test.questions],
        "created_at": test.created_at,
    }
