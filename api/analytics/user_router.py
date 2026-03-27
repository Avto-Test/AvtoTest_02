"""
AUTOTEST User Analytics Router
Analytics endpoints for authenticated users
"""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, case, literal
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone, timedelta
from math import exp, sqrt

from api.analytics.schemas import (
    UserAnalyticsSummary,
    UserAttemptSummary,
    UserTestAnalytics,
    AnalyticsOverview,
    TopicAccuracy,
    Recommendation,
    DashboardResponse,
    ReviewQueueResponse,
    DueTopic,
    TopicRetention,
    TopicSkill,
    KnowledgeMastery,
    IntelligenceSnapshot,
    LessonRecommendation,
    TestBankMastery,
    PassProbabilityBreakdown,
    PassProbabilityFactor,
    SimulationStatus,
    TrendPoint,
    ActivityPoint,
)
from api.auth.router import get_current_user
from database.session import get_db
from models.attempt import Attempt
from models.lesson import Lesson
from models.question_category import QuestionCategory
from models.review_queue import ReviewQueue
from models.test import Test
from models.user import User
from models.user_topic_stats import UserTopicStats
from services.gamification.economy import get_active_simulation_fast_unlock, get_simulation_fast_unlock_expiry
from services.gamification.reward_policy import build_reward_policy_preview
from services.learning.intelligence_metrics import (
    attempt_score_percent,
    clamp,
    difficulty_adaptation_score,
    pass_prediction_label,
    pressure_resilience_ratio,
    training_level_from_percent,
    training_level_weight,
)
from services.learning.simulation_service import build_simulation_availability
from services.learning.taxonomy import (
    CANONICAL_LEARNING_TOPIC_LABELS,
    canonical_learning_label,
    learning_topic_aliases,
    normalize_learning_key,
    question_learning_key,
)
from analytics.pass_probability import calculate_pass_probability_from_signals

# Phase 12B Imports
from ml.features import get_user_feature_vector
from ml.model_registry import get_inference_engine

router = APIRouter(prefix="/analytics/me", tags=["analytics"])
logger = logging.getLogger(__name__)

LESSON_MATCH_STOPWORDS = {"va", "the", "and", "for", "of"}

def _ensure_utc(dt: datetime | None) -> datetime | None:
    """Normalize DB datetimes to UTC-aware to prevent naive/aware comparison crashes."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _is_due(next_review_at: datetime | None, now_utc: datetime) -> bool:
    review_at = _ensure_utc(next_review_at)
    return review_at is not None and review_at <= now_utc


def _safe_float(value: object, default: float = 0.0) -> float:
    """Null/NaN-safe float conversion for analytics calculations."""
    try:
        if value is None:
            return default
        numeric = float(value)
        if not (numeric == numeric):  # NaN guard
            return default
        return numeric
    except (TypeError, ValueError):
        return default


def _resolve_review_question_count(
    *,
    total_due: int,
    repeated_wrong_count: int = 0,
    weakest_accuracy: float | None = None,
    mode: str,
) -> int:
    count = 6

    if total_due > 0:
        count = max(count, min(10, total_due))

    if mode == "repeated_mistake":
        severity_boost = 0
        if repeated_wrong_count >= 5:
            severity_boost = 2
        elif repeated_wrong_count >= 3:
            severity_boost = 1
        count = max(count, 6 + severity_boost)
        if weakest_accuracy is not None and weakest_accuracy < 55:
            count = max(count, 8)
    elif mode == "weak_topic":
        if weakest_accuracy is not None:
            severity = max(0.0, min(1.0, (70.0 - weakest_accuracy) / 25.0))
            count = max(count, 7 + int(round(severity * 3)))
        else:
            count = max(count, 8)
    else:
        count = max(count, 8 if total_due == 0 else min(9, total_due))

    return max(6, min(10, count))


def _retention_decay(last_at: datetime | None, now_utc: datetime, rate: float = 0.015) -> float:
    if last_at is None:
        return 0.5
    normalized = _ensure_utc(last_at)
    days = max(0.0, (now_utc - normalized).total_seconds() / 86400.0) if normalized else 0.0
    return max(0.2, min(1.0, exp(-rate * days)))


def _stem_learning_token(token: str) -> str:
    for suffix in ("lari", "lar", "ning", "ni", "ga", "da", "dan"):
        if token.endswith(suffix) and len(token) > len(suffix) + 2:
            return token[: -len(suffix)]
    return token


def _learning_token_set(*values: str | None) -> set[str]:
    tokens: set[str] = set()

    for value in values:
        normalized_aliases = learning_topic_aliases(value)
        if normalized_aliases == {"general"}:
            continue

        for normalized in normalized_aliases:
            tokens.add(normalized)
            raw_tokens = [part for part in normalized.split() if part and part not in LESSON_MATCH_STOPWORDS]
            for token in raw_tokens:
                tokens.add(token)
                simplified = _stem_learning_token(token)
                if simplified:
                    tokens.add(simplified)

    return tokens


def _lesson_match_score(*, lesson: Lesson, focus_key: str, focus_label: str) -> float:
    focus_tokens = _learning_token_set(focus_key, focus_label)
    lesson_tokens = _learning_token_set(lesson.topic, lesson.section)
    if not focus_tokens or not lesson_tokens:
        return 0.0

    lesson_topic_key = normalize_learning_key(lesson.topic)
    lesson_section_key = normalize_learning_key(lesson.section)
    focus_normalized = normalize_learning_key(focus_label)
    if focus_normalized in {lesson_topic_key, lesson_section_key} or focus_key in {lesson_topic_key, lesson_section_key}:
        return 1.0

    shared_tokens = focus_tokens & lesson_tokens
    if shared_tokens:
        return min(0.94, 0.55 + (0.1 * len(shared_tokens)))

    for left in focus_tokens:
        if len(left) < 4:
            continue
        for right in lesson_tokens:
            if len(right) < 4:
                continue
            if left in right or right in left:
                return 0.4

    return 0.0


def _compute_focus_topics(
    topic_stats: list[tuple[str, int, int]],
    topic_review_state: dict[str, tuple[int, int]],
) -> list[tuple[str, float]]:
    """
    Build prioritized weak-topic list using a shared taxonomy key.
    Score combines low accuracy and spaced-repetition urgency.
    """
    topic_priority: dict[str, float] = {}

    for topic_key, total, correct in topic_stats:
        key = normalize_learning_key(topic_key)
        if total <= 0:
            continue
        accuracy = (correct / total) * 100
        # More answers + lower accuracy -> stronger priority.
        coverage = min(1.0, total / 12)
        weakness = max(0.0, (100 - accuracy) / 100)
        topic_priority[key] = max(topic_priority.get(key, 0.0), weakness * (0.7 + 0.3 * coverage))

    for key, (due_count, total_count) in topic_review_state.items():
        due_ratio = due_count / max(1, total_count)
        due_priority = min(1.0, (0.6 * due_ratio) + (0.08 * min(due_count, 5)))
        topic_priority[key] = max(topic_priority.get(key, 0.0), due_priority)

    ranked = sorted(topic_priority.items(), key=lambda item: item[1], reverse=True)
    return ranked[:3]


@router.get("/summary", response_model=UserAnalyticsSummary)
async def get_user_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserAnalyticsSummary:
    """
    Get summary of current user's performance.
    Returns total attempts, average score, and last 5 attempts.
    """
    # Total attempts
    total_attempts = await db.scalar(
        select(func.count(Attempt.id)).where(Attempt.user_id == current_user.id)
    ) or 0
    
    # Average score
    average_score = await db.scalar(
        select(func.avg(Attempt.score)).where(Attempt.user_id == current_user.id)
    ) or 0.0
    
    # Last 5 attempts
    result = await db.execute(
        select(Attempt)
        .where(Attempt.user_id == current_user.id)
        .order_by(Attempt.finished_at.desc().nulls_last())
        .limit(5)
        .options(selectinload(Attempt.test))
    )
    attempts = result.scalars().all()
    
    last_attempts = [
        UserAttemptSummary(
            id=attempt.id,
            test_title=attempt.test.title,
            score=attempt.score,
            finished_at=attempt.finished_at,
        )
        for attempt in attempts
    ]
    
    return UserAnalyticsSummary(
        total_attempts=total_attempts,
        average_score=round(float(average_score), 2),
        last_attempts=last_attempts,
    )


@router.get("/tests", response_model=list[UserTestAnalytics])
async def get_user_test_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[UserTestAnalytics]:
    """
    Get user's performance grouped by test.
    Returns attempts count, best score, and average score per test.
    """
    # Group attempts by test_id
    stmt = (
        select(
            Attempt.test_id,
            Test.title,
            func.count(Attempt.id).label("attempts_count"),
            func.max(Attempt.score).label("best_score"),
            func.avg(Attempt.score).label("average_score"),
        )
        .join(Test, Attempt.test_id == Test.id)
        .where(Attempt.user_id == current_user.id)
        .group_by(Attempt.test_id, Test.title, Test.created_at)
        .order_by(Test.created_at.desc())
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    analytics = []
    for row in rows:
        analytics.append(
            UserTestAnalytics(
                test_id=row.test_id,
                title=row.title,
                attempts_count=row.attempts_count,
                best_score=row.best_score,
                average_score=round(float(row.average_score or 0.0), 2),
            )
        )
        
    return analytics

@router.get("/review-queue", response_model=ReviewQueueResponse)
async def get_review_queue(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get topics due for spaced repetition review."""
    
    now_utc = datetime.now(timezone.utc)
    queue_rows = (
        await db.execute(
            select(ReviewQueue, Question, QuestionCategory)
            .join(Question, ReviewQueue.question_id == Question.id)
            .outerjoin(QuestionCategory, Question.category_id == QuestionCategory.id)
            .where(
                ReviewQueue.user_id == current_user.id,
                ReviewQueue.next_review_at <= now_utc,
            )
            .order_by(ReviewQueue.next_review_at.asc())
        )
    ).all()

    topic_ids = {
        question.category_id
        for _, question, _ in queue_rows
        if question.category_id is not None
    }
    topic_stats_rows = (
        await db.execute(
            select(UserTopicStats).where(
                UserTopicStats.user_id == current_user.id,
                UserTopicStats.topic_id.in_(topic_ids),
            )
        )
    ).scalars().all() if topic_ids else []
    topic_stats_map = {row.topic_id: row for row in topic_stats_rows}

    due_topics = []
    for review_row, question, category in queue_rows:
        label = category.name if category is not None else canonical_learning_label(question.topic or question.category)
        stats = topic_stats_map.get(question.category_id) if question.category_id is not None else None
        retention = 0.5
        knowledge = 0.0
        if stats is not None:
            retention = _retention_decay(stats.last_attempt_at, now_utc)
            knowledge = _safe_float(stats.accuracy_rate, 0.0)

        due_topics.append(DueTopic(
            topic=label,
            next_review_at=review_row.next_review_at.isoformat() if review_row.next_review_at else now_utc.isoformat(),
            retention_score=round(retention, 2),
            bkt_prob=round(knowledge, 2)
        ))
    
    return ReviewQueueResponse(
        due_topics=due_topics,
        total_due=len(due_topics)
    )

@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardResponse:
    """
    Get consolidated dashboard analytics in a single request.
    Includes overview, training level, recommendation, and topic breakdown.
    """
    from collections import defaultdict
    from models.attempt_answer import AttemptAnswer
    from models.question import Question
    from sqlalchemy import case

    def _attempt_pct(row) -> float:
        return attempt_score_percent(
            getattr(row, "score", 0),
            getattr(row, "question_count", None),
        )

    def _canonical_category(raw: str) -> str:
        return canonical_learning_label(raw)

    # 1) General attempts and score trend.
    # Production safety: if some optional columns are missing in a legacy DB,
    # fallback to a compatible projection instead of returning HTTP 500.
    base_attempt_stmt = (
        select(
            Attempt.id.label("id"),
            Attempt.score.label("score"),
            Attempt.question_count.label("question_count"),
            Attempt.finished_at.label("finished_at"),
        )
        .where(
            Attempt.user_id == current_user.id,
            Attempt.finished_at.is_not(None),
        )
        .order_by(Attempt.finished_at.desc())
    )

    try:
        stmt_general = base_attempt_stmt.add_columns(
            Attempt.mode.label("mode"),
            Attempt.pressure_mode.label("pressure_mode"),
            Attempt.avg_response_time.label("avg_response_time"),
            Attempt.response_time_variance.label("response_time_variance"),
        )
        res_general = await db.execute(stmt_general)
        rows_general = res_general.all()
    except SQLAlchemyError as exc:
        logger.warning(
            "Dashboard query fallback for user_id=%s due to legacy attempt schema: %s",
            current_user.id,
            exc,
        )
        stmt_general_legacy = base_attempt_stmt.add_columns(
            literal("adaptive").label("mode"),
            literal(False).label("pressure_mode"),
            literal(0.0).label("avg_response_time"),
            literal(0.0).label("response_time_variance"),
        )
        res_general = await db.execute(stmt_general_legacy)
        rows_general = res_general.all()

    total_attempts = len(rows_general)
    score_pcts = [_attempt_pct(row) for row in rows_general]
    avg_score = sum(score_pcts) / total_attempts if total_attempts else 0.0
    best_score = max(score_pcts) if score_pcts else 0.0
    recent_scores = [round(v, 1) for v in score_pcts[:10][::-1]]

    improvement_delta = 0.0
    improvement_direction = "stable"
    if len(score_pcts) >= 2:
        diff = score_pcts[0] - score_pcts[1]
        improvement_delta = round(abs(diff), 1)
        if abs(diff) < 2:
            improvement_direction = "stable"
        elif diff > 0:
            improvement_direction = "up"
        else:
            improvement_direction = "down"

    adaptive_rows = [row for row in rows_general if row.mode == "adaptive"][:3]
    current_training_level = "beginner"
    avg_adaptive = 0.0
    if adaptive_rows:
        adaptive_scores = [_attempt_pct(row) for row in adaptive_rows]
        avg_adaptive = sum(adaptive_scores) / len(adaptive_scores)
        current_training_level = training_level_from_percent(avg_adaptive)

    # 2) Topic stats
    stmt_topics = (
        select(
            Question.topic.label("topic"),
            Question.category.label("category"),
            func.count(AttemptAnswer.id).label("total"),
            func.sum(case((AttemptAnswer.is_correct == True, 1), else_=0)).label("correct"),
        )
        .join(Attempt, AttemptAnswer.attempt_id == Attempt.id)
        .join(Question, AttemptAnswer.question_id == Question.id)
        .where(Attempt.user_id == current_user.id)
        .group_by(Question.topic, Question.category)
    )
    res_topics = await db.execute(stmt_topics)
    rows_topics = res_topics.all()

    # Detailed map for recommendation engine
    aggregated_topics: dict[str, dict[str, float | str]] = {}
    topic_stats_for_focus: list[tuple[str, int, int]] = []
    for row in rows_topics:
        topic_key = question_learning_key(row.topic, row.category)
        display_name = canonical_learning_label(row.topic or row.category)
        item = aggregated_topics.setdefault(
            topic_key,
            {"label": display_name, "total": 0.0, "correct": 0.0},
        )
        item["total"] = float(item["total"]) + float(row.total or 0)
        item["correct"] = float(item["correct"]) + float(row.correct or 0)

    # Canonical category breakdown for user dashboard
    canonical_categories = list(CANONICAL_LEARNING_TOPIC_LABELS)
    category_accumulator: dict[str, dict[str, float]] = {
        cat: {"total": 0.0, "correct": 0.0} for cat in canonical_categories
    }

    for topic_key, item in aggregated_topics.items():
        total = int(item["total"])
        correct = int(item["correct"])
        label = str(item["label"])
        topic_stats_for_focus.append((topic_key, total, correct))

        canonical_name = _canonical_category(label)
        if canonical_name not in category_accumulator:
            canonical_categories.append(canonical_name)
            category_accumulator[canonical_name] = {"total": 0.0, "correct": 0.0}
        category_accumulator[canonical_name]["total"] += total
        category_accumulator[canonical_name]["correct"] += correct

    topic_breakdown: list[TopicAccuracy] = []
    weakest_topic = None
    weakest_acc = 101.0
    covered_accuracies: list[float] = []

    for category_name in canonical_categories:
        totals = category_accumulator[category_name]["total"]
        corrects = category_accumulator[category_name]["correct"]
        accuracy = (corrects / totals * 100) if totals > 0 else 0.0
        accuracy = round(accuracy, 1)
        topic_breakdown.append(TopicAccuracy(topic=category_name, accuracy=accuracy))
        if totals > 0:
            covered_accuracies.append(accuracy)
            if accuracy < weakest_acc:
                weakest_acc = accuracy
                weakest_topic = category_name

    topic_accuracy_lookup = {item.topic: item.accuracy for item in topic_breakdown}
    recent_attempt_ids = [row.id for row in rows_general[:3]]
    repeated_topic: str | None = None
    repeated_topic_accuracy: float | None = None
    repeated_topic_wrong_count = 0

    if recent_attempt_ids:
        recent_wrong_rows = (
            await db.execute(
                select(
                    AttemptAnswer.attempt_id.label("attempt_id"),
                    Question.topic.label("topic"),
                    Question.category.label("category"),
                )
                .join(Question, AttemptAnswer.question_id == Question.id)
                .where(
                    AttemptAnswer.attempt_id.in_(recent_attempt_ids),
                    AttemptAnswer.is_correct == False,
                )
            )
        ).all()

        repeated_topic_map: dict[str, dict[str, object]] = {}
        for row in recent_wrong_rows:
            canonical_topic = _canonical_category(row.topic or row.category or "Umumiy")
            entry = repeated_topic_map.setdefault(
                canonical_topic,
                {
                    "wrong_count": 0,
                    "attempt_ids": set(),
                },
            )
            entry["wrong_count"] = int(entry["wrong_count"]) + 1
            cast_attempt_ids = entry["attempt_ids"]
            if isinstance(cast_attempt_ids, set):
                cast_attempt_ids.add(row.attempt_id)

        ranked_repeated_topics = sorted(
            (
                (
                    topic,
                    int(entry["wrong_count"]),
                    len(entry["attempt_ids"]) if isinstance(entry["attempt_ids"], set) else 0,
                )
                for topic, entry in repeated_topic_map.items()
            ),
            key=lambda item: (item[1], item[2], -(topic_accuracy_lookup.get(item[0], 100.0))),
            reverse=True,
        )
        for topic_name, wrong_count, attempt_count in ranked_repeated_topics:
            if wrong_count >= 2 and (attempt_count >= 2 or wrong_count >= 3):
                repeated_topic = topic_name
                repeated_topic_accuracy = topic_accuracy_lookup.get(topic_name)
                repeated_topic_wrong_count = wrong_count
                break

    # 3) Skills / retention
    now_utc = datetime.now(timezone.utc)
    topic_stats_rows = (
        await db.execute(
            select(UserTopicStats, QuestionCategory)
            .outerjoin(QuestionCategory, UserTopicStats.topic_id == QuestionCategory.id)
            .where(UserTopicStats.user_id == current_user.id)
        )
    ).all()
    review_rows = (
        await db.execute(
            select(ReviewQueue, Question)
            .join(Question, ReviewQueue.question_id == Question.id)
            .where(ReviewQueue.user_id == current_user.id)
        )
    ).all()

    review_state: dict[str, tuple[int, int]] = {}
    due_by_topic: dict[str, int] = {}
    total_by_topic: dict[str, int] = {}
    for review_row, question in review_rows:
        topic_key = normalize_learning_key(question_learning_key(question.topic, question.category))
        total_by_topic[topic_key] = total_by_topic.get(topic_key, 0) + 1
        if _is_due(review_row.next_review_at, now_utc):
            due_by_topic[topic_key] = due_by_topic.get(topic_key, 0) + 1
    review_state = {
        key: (due_by_topic.get(key, 0), total_by_topic.get(key, 0))
        for key in set(total_by_topic) | set(due_by_topic)
    }

    total_due = sum(due_by_topic.values())
    recommendation = Recommendation(
        kind="general_practice",
        question_count=_resolve_review_question_count(
            total_due=total_due,
            weakest_accuracy=round(avg_score, 1),
            mode="general_practice",
        ),
    )
    if repeated_topic is not None:
        repeated_count = _resolve_review_question_count(
            total_due=total_due,
            repeated_wrong_count=repeated_topic_wrong_count,
            weakest_accuracy=repeated_topic_accuracy,
            mode="repeated_mistake",
        )
        recommendation = Recommendation(
            topic=repeated_topic,
            accuracy=round(repeated_topic_accuracy or 0.0, 1) if repeated_topic_accuracy is not None else None,
            action_label=f"{repeated_topic} bo'yicha {repeated_count} ta review savolini ishlang",
            kind="repeated_mistake",
            reason=f"So'nggi urinishlarda {repeated_topic} mavzusida {repeated_topic_wrong_count} ta xato takrorlandi.",
            question_count=repeated_count,
        )
    elif weakest_topic is not None and weakest_acc < 70:
        weak_topic_count = _resolve_review_question_count(
            total_due=total_due,
            weakest_accuracy=weakest_acc,
            mode="weak_topic",
        )
        recommendation = Recommendation(
            topic=weakest_topic,
            accuracy=round(weakest_acc, 1),
            action_label=f"{weakest_topic} bo'yicha {weak_topic_count} ta review savolini ishlang",
            kind="weak_topic",
            reason=f"{weakest_topic} hozir eng zaif mavzu bo'lib turibdi.",
            question_count=weak_topic_count,
        )
    else:
        general_count = _resolve_review_question_count(
            total_due=total_due,
            weakest_accuracy=round(avg_score, 1),
            mode="general_practice",
        )
        recommendation = Recommendation(
            topic=weakest_topic,
            accuracy=round(weakest_acc, 1) if weakest_topic is not None else round(avg_score, 1),
            action_label=f"{general_count} ta adaptiv review mashqini boshlang",
            kind="general_practice",
            reason="Hozir asosiy maqsad xatolarni mustahkamlash va unutilayotgan savollarni qayta ko'rish.",
            question_count=general_count,
        )

    skill_vector = []
    knowledge_mastery = []
    retention_vector = []
    for row, category in topic_stats_rows:
        category_name = category.name if category is not None else "Umumiy"
        normalized_key = normalize_learning_key(category_name)
        retention_ratio = _retention_decay(row.last_attempt_at, now_utc)
        due_count, _total_count = review_state.get(normalized_key, (0, 0))
        mastery_probability = clamp(((row.accuracy_rate or 0.0) * 0.7 + retention_ratio * 0.3) * 100.0, 0.0, 100.0)

        skill_vector.append(
            TopicSkill(topic=category_name, skill=round(_safe_float(row.accuracy_rate, 0.0) * 100.0, 1))
        )
        knowledge_mastery.append(
            KnowledgeMastery(topic=category_name, probability=round(mastery_probability, 1))
        )
        retention_vector.append(
            TopicRetention(
                topic=category_name,
                retention=round(max(0.0, min(1.0, retention_ratio - (0.05 * due_count))), 2),
            )
        )

    # 4) Lesson recommendations
    focus_topics = _compute_focus_topics(topic_stats_for_focus, review_state)
    focus_topic_scores = {topic: score for topic, score in focus_topics}
    focus_topic_labels = {key: str(data["label"]) for key, data in aggregated_topics.items()}

    lesson_recommendations: list[LessonRecommendation] = []
    if focus_topic_scores:
        lesson_stmt = select(Lesson).where(Lesson.is_active == True)
        if not (current_user.is_premium or current_user.is_admin):
            lesson_stmt = lesson_stmt.where(Lesson.is_premium == False)

        lesson_result = await db.execute(
            lesson_stmt.order_by(Lesson.sort_order.asc(), Lesson.created_at.desc())
        )
        lessons = list(lesson_result.scalars().all())

        scored_lessons: list[tuple[float, Lesson, str]] = []
        for lesson in lessons:
            best_match: tuple[float, str] | None = None
            for focus_key, focus_score in focus_topic_scores.items():
                focus_label = focus_topic_labels.get(focus_key, focus_key.title())
                lesson_match_score = _lesson_match_score(
                    lesson=lesson,
                    focus_key=focus_key,
                    focus_label=focus_label,
                )
                if lesson_match_score <= 0:
                    continue

                combined_score = (focus_score * 0.72) + (lesson_match_score * 0.28)
                if best_match is None or combined_score > best_match[0]:
                    best_match = (combined_score, focus_label)

            if best_match is None:
                continue

            scored_lessons.append((best_match[0], lesson, best_match[1]))

        scored_lessons.sort(
            key=lambda item: (
                item[0],
                -item[1].sort_order,
                item[1].created_at.timestamp() if item[1].created_at else 0,
            ),
            reverse=True,
        )

        if scored_lessons:
            lesson_recommendations = [
                LessonRecommendation(
                    lesson_id=lesson.id,
                    title=lesson.title,
                    content_type=lesson.content_type,
                    content_url=lesson.content_url,
                    topic=lesson.topic,
                    section=lesson.section,
                    reason=f"{reason_topic} mavzusida xatolar ko'p",
                    match_score=round(score, 2),
                )
                for score, lesson, reason_topic in scored_lessons[:6]
            ]
        elif lessons:
            fallback_focus_topic = focus_topic_labels.get(focus_topics[0][0], focus_topics[0][0].title()) if focus_topics else "Bugungi mashq"
            lesson_recommendations = [
                LessonRecommendation(
                    lesson_id=lesson.id,
                    title=lesson.title,
                    content_type=lesson.content_type,
                    content_url=lesson.content_url,
                    topic=lesson.topic,
                    section=lesson.section,
                    reason=f"{fallback_focus_topic} uchun mos qo'shimcha dars",
                    match_score=0.2,
                )
                for lesson in lessons[:3]
            ]

    # 5) Test bank mastery
    total_questions = await db.scalar(select(func.count(Question.id))) or 0
    bank_stmt = (
        select(
            AttemptAnswer.question_id,
            AttemptAnswer.is_correct,
            AttemptAnswer.attempt_id,
        )
        .join(Attempt, AttemptAnswer.attempt_id == Attempt.id)
        .where(
            Attempt.user_id == current_user.id,
            Attempt.finished_at.is_not(None),
        )
    )
    bank_res = await db.execute(bank_stmt)
    bank_rows = bank_res.all()

    seen_questions: set = set()
    correct_questions: set = set()
    correct_sessions_by_question: dict = defaultdict(set)

    for row in bank_rows:
        q_id = row.question_id
        seen_questions.add(q_id)
        if row.is_correct:
            correct_questions.add(q_id)
            correct_sessions_by_question[q_id].add(row.attempt_id)

    mastered_questions = {q_id for q_id, sessions in correct_sessions_by_question.items() if len(sessions) >= 2}
    needs_review_count = max(0, len(seen_questions) - len(mastered_questions))

    question_bank_mastery = TestBankMastery(
        total_questions=int(total_questions),
        seen_questions=len(seen_questions),
        correct_questions=len(correct_questions),
        mastered_questions=len(mastered_questions),
        needs_review_questions=needs_review_count,
    )

    # 6) Chart series
    progress_trend: list[TrendPoint] = []
    recent_attempts_for_chart = rows_general[:12][::-1]
    for idx, row in enumerate(recent_attempts_for_chart, start=1):
        label = row.finished_at.strftime("%d.%m") if row.finished_at else f"Test {idx}"
        progress_trend.append(TrendPoint(label=label, value=round(_attempt_pct(row), 1)))

    daily_counts: dict = defaultdict(int)
    for row in rows_general:
        if row.finished_at:
            daily_counts[row.finished_at.date()] += 1

    test_activity: list[ActivityPoint] = []
    today = now_utc.date()
    for offset in range(13, -1, -1):
        day = today - timedelta(days=offset)
        test_activity.append(
            ActivityPoint(
                label=day.strftime("%d.%m"),
                tests_count=int(daily_counts.get(day, 0)),
            )
        )

    # 7) Pass probability factors (logistic model + transparent breakdown)
    avg_recent_pct = sum(_attempt_pct(row) for row in rows_general[:5]) / max(1, min(len(rows_general), 5))
    accuracy_score = max(0.0, min(100.0, avg_recent_pct))
    mastery_score = (question_bank_mastery.mastered_questions / max(1, question_bank_mastery.total_questions)) * 100
    mastery_coverage = max(0.0, min(1.0, mastery_score / 100.0))

    category_balance_score = 0.0
    if len(covered_accuracies) >= 2:
        mean_acc = sum(covered_accuracies) / len(covered_accuracies)
        variance = sum((value - mean_acc) ** 2 for value in covered_accuracies) / len(covered_accuracies)
        category_balance_score = max(0.0, min(100.0, 100.0 - sqrt(variance)))
    elif len(covered_accuracies) == 1:
        category_balance_score = covered_accuracies[0]

    last_row = rows_general[0] if rows_general else None
    pressure_resilience = 1.0
    last_avg_response_time = _safe_float(getattr(last_row, "avg_response_time", 0.0), 0.0) if last_row else 0.0
    last_response_time_variance = _safe_float(getattr(last_row, "response_time_variance", 0.0), 0.0) if last_row else 0.0
    if last_row and last_avg_response_time > 0 and last_response_time_variance > 0:
        pressure_resilience = pressure_resilience_ratio(last_avg_response_time, last_response_time_variance)

    retention_percent_values = []
    for point in retention_vector:
        value = point.retention
        retention_percent_values.append(value * 100 if value <= 1 else value)
    retention_avg = sum(retention_percent_values) / len(retention_percent_values) if retention_percent_values else 50.0
    knowledge_stability_score = max(0.0, min(100.0, pressure_resilience * 55 + retention_avg * 0.45))

    trend_score = 50.0
    learning_trend = 0.0
    if len(score_pcts) >= 6:
        latest_avg = sum(score_pcts[:3]) / 3
        previous_avg = sum(score_pcts[3:6]) / 3
        trend_score = max(0.0, min(100.0, 50 + (latest_avg - previous_avg) * 2.2))
        learning_trend = max(-1.0, min(1.0, (latest_avg - previous_avg) / 50.0))
    elif len(score_pcts) >= 2:
        trend_score = max(0.0, min(100.0, 50 + (score_pcts[0] - score_pcts[1]) * 2.5))
        learning_trend = max(-1.0, min(1.0, (score_pcts[0] - score_pcts[1]) / 50.0))
    elif len(score_pcts) == 1:
        trend_score = score_pcts[0]

    try:
        hard_stmt = (
            select(
                func.count(AttemptAnswer.id).label("total"),
                func.sum(case((AttemptAnswer.is_correct == True, 1), else_=0)).label("correct"),
            )
            .join(Attempt, AttemptAnswer.attempt_id == Attempt.id)
            .join(Question, AttemptAnswer.question_id == Question.id)
            .where(
                Attempt.user_id == current_user.id,
                Attempt.finished_at.is_not(None),
                ((Question.difficulty_percent.is_not(None)) & (Question.difficulty_percent <= 33))
                | ((Question.difficulty_percent.is_(None)) & (Question.difficulty == "hard")),
            )
        )
        hard_row = (await db.execute(hard_stmt)).one()
    except SQLAlchemyError as exc:
        logger.warning(
            "Dashboard hard-question fallback for user_id=%s due to legacy question schema: %s",
            current_user.id,
            exc,
        )
        try:
            hard_stmt = (
                select(
                    func.count(AttemptAnswer.id).label("total"),
                    func.sum(case((AttemptAnswer.is_correct == True, 1), else_=0)).label("correct"),
                )
                .join(Attempt, AttemptAnswer.attempt_id == Attempt.id)
                .join(Question, AttemptAnswer.question_id == Question.id)
                .where(
                    Attempt.user_id == current_user.id,
                    Attempt.finished_at.is_not(None),
                    Question.difficulty == "hard",
                )
            )
            hard_row = (await db.execute(hard_stmt)).one()
        except SQLAlchemyError:
            hard_row = type("HardRow", (), {"total": 0, "correct": 0})()
    hard_total = int(hard_row.total or 0)
    hard_correct = int(hard_row.correct or 0)
    difficulty_performance = max(0.0, min(1.0, (hard_correct / hard_total) if hard_total else 0.0))

    weak_topics_count = sum(1 for value in covered_accuracies if value < 60.0)
    weak_topic_ratio = max(0.0, min(1.0, weak_topics_count / max(1, len(canonical_categories))))

    pass_probability_norm = calculate_pass_probability_from_signals(
        recent_accuracy=max(0.0, min(1.0, accuracy_score / 100.0)),
        mastery_coverage=mastery_coverage,
        retention_strength=max(0.0, min(1.0, retention_avg / 100.0)),
        difficulty_performance=difficulty_performance,
        weak_topic_ratio=weak_topic_ratio,
        learning_trend=learning_trend,
        topic_balance=max(0.0, min(1.0, category_balance_score / 100.0)),
    )
    pass_probability = round(pass_probability_norm * 100.0, 1) if total_attempts > 0 else 0.0

    factor_specs = [
        ("recent_accuracy", "So'nggi aniqlik", 35.0, accuracy_score),
        ("mastery_coverage", "Savollar qamrovi", 25.0, mastery_score),
        ("retention_strength", "Eslab qolish", 25.0, retention_avg),
        ("hard_accuracy", "Qiyin savollar natijasi", 10.0, difficulty_performance * 100.0),
        ("learning_trend", "Rivojlanish trendi", 5.0, (learning_trend + 1.0) * 50.0),
    ]

    factor_models: list[PassProbabilityFactor] = []
    weighted_total = 0.0
    for key, label, weight, score in factor_specs:
        weighted = weight * score / 100
        weighted_total += weighted
        factor_models.append(
            PassProbabilityFactor(
                key=key,
                label=label,
                weight=round(weight, 1),
                score=round(max(0.0, min(100.0, score)), 1),
                weighted_score=round(weighted, 1),
            )
        )

    # keep weighted transparency score for card explanations (0..100).
    weighted_total = round(max(0.0, min(100.0, weighted_total)), 1)
    readiness_score = round((accuracy_score * 0.5 + category_balance_score * 0.3 + trend_score * 0.2), 1)
    adaptive_intelligence_strength = round((mastery_score * 0.4 + knowledge_stability_score * 0.6), 1)

    # 8) ML inference — Phase 2.5
    # safe_ml_inference never raises; returns None if model missing or feature extraction fails.
    from ml.model_registry import safe_ml_inference, get_inference_engine

    ml_prob_raw: float | None = await safe_ml_inference(db, str(current_user.id))

    # Compute final blended probability
    rule_prob_0_1 = pass_probability_norm  # already 0.0–1.0
    if ml_prob_raw is not None:
        engine_inst = get_inference_engine()
        auc_score = engine_inst.auc_score if engine_inst.status == "active" else 0.0
        ml_model_version = engine_inst.version

        if auc_score >= 0.85:
            ml_weight = 0.75
        elif auc_score >= 0.75:
            ml_weight = 0.60
        else:
            ml_weight = 0.40

        final_0_1 = ml_weight * ml_prob_raw + (1.0 - ml_weight) * rule_prob_0_1
        final_0_1 = max(0.0, min(1.0, final_0_1))
        ml_status_value = "ml_active"
        pass_probability_ml_display = round(ml_prob_raw * 100.0, 1)
    else:
        final_0_1 = rule_prob_0_1
        ml_model_version = "v2-transparent"
        ml_status_value = "rule_only"
        pass_probability_ml_display = None

    pass_probability_final_display = round(final_0_1 * 100.0, 1) if total_attempts > 0 else 0.0
    pass_probability = pass_probability_final_display

    pass_prediction_label_value = pass_prediction_label(pass_probability)

    if knowledge_stability_score >= 85:
        cognitive_stability = "Yuqori"
    elif knowledge_stability_score >= 65:
        cognitive_stability = "O'rtacha"
    else:
        cognitive_stability = "Past"

    pass_probability_breakdown = PassProbabilityBreakdown(
        explanation="O'tish ehtimoli hozirgi aniqlik, savollar qamrovi va eslab qolish kuchi asosida hisoblanadi.",
        factors=factor_models,
    )

    confidence_score = min(0.98, 0.35 + min(total_attempts, 20) / 40 + mastery_score / 250)
    active_fast_unlock = await get_active_simulation_fast_unlock(db, user_id=current_user.id, now_utc=now_utc)
    fast_unlock_expiry = (
        get_simulation_fast_unlock_expiry(active_fast_unlock)
        if active_fast_unlock is not None
        else None
    )

    simulation_availability = await build_simulation_availability(
        db,
        user_id=current_user.id,
        readiness_score=readiness_score,
        pass_probability=pass_probability,
        fast_unlock_active=active_fast_unlock is not None,
        fast_unlock_expires_at=fast_unlock_expiry,
        now_utc=now_utc,
    )

    return DashboardResponse(
        overview=AnalyticsOverview(
            total_attempts=total_attempts,
            average_score=round(float(avg_score), 2),
            best_score=float(round(best_score, 1)),
            improvement_delta=improvement_delta,
            improvement_direction=improvement_direction,
            current_training_level=current_training_level,
            readiness_score=readiness_score,
            pass_probability=pass_probability,
            pass_prediction_label=pass_prediction_label_value,
            adaptive_intelligence_strength=adaptive_intelligence_strength,
            total_due=total_due,
            avg_response_time=last_avg_response_time,
            cognitive_stability=cognitive_stability,
            pressure_resilience=round(pressure_resilience * 100, 1),
            pass_probability_ml=pass_probability_ml_display,
            pass_probability_rule=weighted_total,
            pass_probability_final=pass_probability_final_display,
            confidence_score=round(confidence_score, 2),
            model_version=ml_model_version,
            ml_status=ml_status_value,
        ),
        recommendation=recommendation,
        recent_scores=[int(round(v)) for v in recent_scores],
        topic_breakdown=topic_breakdown,
        skill_vector=skill_vector,
        knowledge_mastery=knowledge_mastery,
        retention_vector=retention_vector,
        lesson_recommendations=lesson_recommendations,
        progress_trend=progress_trend,
        test_activity=test_activity,
        question_bank_mastery=question_bank_mastery,
        simulation_status=SimulationStatus(
            cooldown_days=simulation_availability.cooldown_days,
            cooldown_progress=simulation_availability.cooldown_progress,
            cooldown_remaining_seconds=simulation_availability.cooldown_remaining_seconds,
            next_available_at=simulation_availability.next_available_at,
            last_simulation_at=simulation_availability.last_simulation_at,
            readiness_gate_score=simulation_availability.readiness_gate_score,
            readiness_ready=simulation_availability.readiness_ready,
            cooldown_ready=simulation_availability.cooldown_ready,
            launch_ready=simulation_availability.launch_ready,
            fast_unlock_active=simulation_availability.fast_unlock_active,
            fast_unlock_expires_at=simulation_availability.fast_unlock_expires_at,
            unlock_source=simulation_availability.unlock_source,
            recommended_question_count=simulation_availability.recommended_question_count,
            recommended_pressure_mode=simulation_availability.recommended_pressure_mode,
            label=simulation_availability.label,
            readiness_threshold=simulation_availability.readiness_threshold,
            pass_threshold=simulation_availability.pass_threshold,
            lock_reasons=simulation_availability.lock_reasons,
            warning_message=simulation_availability.warning_message,
        ),
        pass_probability_breakdown=pass_probability_breakdown,
        reward_policy=build_reward_policy_preview(),
    )



@router.get("/intelligence-history", response_model=list[IntelligenceSnapshot])
async def get_intelligence_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[IntelligenceSnapshot]:
    """
    Get historical intelligence snapshots for each completed attempt.
    Reconstructs probability and readiness using production logic.
    """
    from ml.model_registry import (
        calculate_readiness_score,
        calculate_hybrid_probability,
        get_inference_engine
    )
    from ml.features import get_user_feature_vector
    import numpy as np

    engine = get_inference_engine()
    history = []
    user_id = current_user.id

    MAX_HISTORY_ATTEMPTS = 100
    
    # 1. Fetch last 100 completed attempts ASC (chronological) with snapshots
    stmt = (
        select(Attempt)
        .options(selectinload(Attempt.inference_snapshot))
        .where(Attempt.user_id == user_id, Attempt.finished_at.is_not(None))
        .order_by(Attempt.finished_at.desc()) # Fetch newest first to apply cap correctly
        .limit(MAX_HISTORY_ATTEMPTS + 1) # Fetch one extra to detect truncation
    )
    res = await db.execute(stmt)
    attempts_raw = res.scalars().all()

    if not attempts_raw:
        return []

    if len(attempts_raw) > MAX_HISTORY_ATTEMPTS:
        import logging
        logging.getLogger(__name__).warning(f"Intelligence history for user {user_id} truncated to {MAX_HISTORY_ATTEMPTS}")
        attempts_raw = attempts_raw[:MAX_HISTORY_ATTEMPTS]

    # Reverse to restore chronological order for the history list
    attempts = attempts_raw[::-1]

    # Optimization: We'll need historical scores often
    
    reconstruction_count = 0
    MAX_RECONSTRUCTIONS = 20 # Limit expensive rule reconstructions per request
    
    for i, att in enumerate(attempts):
        # att is an Attempt object
        
        # Check for Snapshot (Phase 20)
        snapshot = getattr(att, "inference_snapshot", None)
        
        if snapshot:
            history.append(IntelligenceSnapshot(
                attempt_id=att.id,
                date=att.finished_at,
                score=float(att.score),
                pass_probability=snapshot.pass_probability,
                probability_source=snapshot.probability_source,
                confidence=snapshot.confidence,
                readiness_score=snapshot.readiness_score,
                cognitive_stability=snapshot.cognitive_stability,
                retention_score=snapshot.retention_score,
                drift_state=snapshot.drift_state,
                model_version=snapshot.model_version
            ))
            continue

        # --- FALLBACK: RECONSTRUCT RULE VARIABLES ---
        if reconstruction_count >= MAX_RECONSTRUCTIONS:
            # Skip expensive reconstruction for very old legacy data if limit reached
            continue
            
        reconstruction_count += 1
        history_slice = attempts[:i+1]
        # 1. Readiness Variables
        recent_attempts = history_slice[-5:]
        recent_pcts = [
            attempt_score_percent(a.score, a.question_count)
            for a in recent_attempts
        ]
        avg_recent_pct = sum(recent_pcts) / len(recent_pcts) if recent_pcts else 0.0
        
        topic_consistency_score = 100.0
        if len(recent_pcts) >= 2:
            std = np.std(recent_pcts)
            topic_consistency_score = max(0.0, 100.0 - std)

        # difficulty_adaptation
        adaptive_attempts = [a for a in history_slice if a.mode == "adaptive"][-3:]
        avg_adaptive_check = 0.0
        if len(adaptive_attempts) >= 2:
            adaptive_pcts = [
                attempt_score_percent(a.score, a.question_count)
                for a in adaptive_attempts
            ]
            avg_adaptive_check = sum(adaptive_pcts) / len(adaptive_pcts)
        
        difficulty_adaptation = difficulty_adaptation_score(avg_adaptive_check)

        readiness = calculate_readiness_score(avg_recent_pct, topic_consistency_score, difficulty_adaptation)

        # 2. Probability Variables
        adaptive_performance_score = readiness
        if len(adaptive_attempts) >= 2:
            adaptive_performance_score = avg_adaptive_check
            
        consistency_score_pp = topic_consistency_score

        training_level_weight_value = training_level_weight(att.training_level or "beginner")
        
        # Pressure resilience
        pressure_res = 1.0
        if att.avg_response_time and att.response_time_variance:
            pressure_res = pressure_resilience_ratio(att.avg_response_time, att.response_time_variance)

        # --- RECONSTRUCT ML ---
        ml_prob = None
        retention_snapshot = 0.5
        if i >= 9:
            from datetime import timedelta
            vector = await get_user_feature_vector(db, user_id, before_at=att.finished_at + timedelta(seconds=1))
            if vector:
                ml_prob = engine.predict(vector)
                retention_snapshot = round(max(0.0, min(1.0, float(vector[2]))), 2)

        # --- BLEND ---
        blend_res = calculate_hybrid_probability(
            readiness,
            adaptive_performance_score,
            consistency_score_pp,
            training_level_weight_value,
            pressure_res,
            ml_prob,
            engine.auc_score,
            engine.drift_status
        )

        history.append(IntelligenceSnapshot(
            attempt_id=att.id,
            date=att.finished_at,
            score=float(att.score),
            pass_probability=blend_res["pass_probability"],
            probability_source=blend_res["source"],
            confidence=blend_res["confidence_score"],
            readiness_score=round(readiness, 1),
            cognitive_stability=round(pressure_res * 100, 1),
            retention_score=retention_snapshot,
            drift_state=engine.drift_status,
            model_version=engine.version
        ))

    return history

