"""
AUTOTEST ML Feature Engineering — Phase 2.5
Extracts numeric feature vectors from the Learning Engine tables.

Sources (Phase 2.5):
    - Attempt           → attempt history and response times
    - UserTopicStats    → per-topic accuracy and recency
    - ReviewQueue       → spaced-repetition state
    - QuestionDifficulty (indirect via Attempt + Question joins)

Legacy source REMOVED:
    - UserSkill (was used for BKT/retention/SRS — replaced by learning engine tables)
"""

import numpy as np
from datetime import datetime, timezone
from math import exp, log1p
from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.attempt import Attempt
from models.review_queue import ReviewQueue
from models.user_topic_stats import UserTopicStats

# ─────────────────────────────────────────────
# Feature manifest — any change here requires bumping FEATURE_VERSION
# and retraining the model.
# ─────────────────────────────────────────────
FEATURE_VERSION = 2  # bumped from 1 → Phase 2.5 migration
FEATURE_COUNT = 20

FEATURE_NAMES = [
    # Attempt-based (preserved from v1)
    "readiness_score",          # 0 — avg score% last 5 attempts
    "avg_topic_accuracy",       # 1 — avg accuracy_rate across user_topic_stats
    "avg_retention_days",       # 2 — avg retention decay from last_attempt_at
    "consolidation_factor",     # 3 — avg_topic_accuracy × avg_retention_days
    "adaptive_consistency_score",  # 4 — 100 - std(last 5 scores)
    "training_level_encoded",   # 5 — 0/1/2 from adaptive attempt performance
    "pressure_resilience",      # 6 — 1 - norm_variance of response times
    "avg_response_time",        # 7 — avg response time ms
    "response_time_variance_log",  # 8 — log1p(variance)
    "total_attempts_log",       # 9 — log1p(total finished attempts)
    "last_5_score_mean",        # 10 — mean raw score last 5 attempts
    "last_5_score_std",         # 11 — std raw score last 5 attempts
    # Review queue (replaces UserSkill SRS fields)
    "review_queue_size",        # 12 — count of overdue review_queue entries
    "avg_interval_days",        # 13 — avg interval_days from review_queue
    "avg_last_result_score",    # 14 — avg (correct=1.0, wrong=0.0) in review_queue
    # Topic accuracy distribution (replaces UserSkill BKT fields)
    "topic_entropy",            # 15 — Shannon entropy of accuracy_rate distribution
    "weakest_topic_accuracy",   # 16 — min accuracy_rate
    "strongest_topic_accuracy", # 17 — max accuracy_rate
    # Attempt recency
    "time_since_last_attempt",  # 18 — days since most recent finished attempt
    # Review pressure
    "overdue_ratio",            # 19 — overdue items / total review_queue entries
]


def _safe_float(value, default: float = 0.0) -> float:
    """Null/NaN/Inf-safe float conversion."""
    try:
        if value is None:
            return default
        v = float(value)
        return default if (v != v or v == float("inf") or v == float("-inf")) else v
    except (TypeError, ValueError):
        return default


def _retention_decay(last_at: datetime | None, now: datetime, rate: float = 0.015) -> float:
    """Ebbinghaus-style decay: e^(-rate * days_since). Returns 0.5 if no data."""
    if last_at is None:
        return 0.5
    if last_at.tzinfo is None:
        last_at = last_at.replace(tzinfo=timezone.utc)
    days = max(0.0, (now - last_at).total_seconds() / 86400.0)
    return max(0.2, min(1.0, exp(-rate * days)))


async def get_user_feature_vector(
    db: AsyncSession,
    user_id: str,
    before_at: datetime | None = None,
) -> Optional[List[float]]:
    """
    Extract exactly 20 numeric features for a user from Learning Engine tables.

    Returns None if the user has < 1 finished attempt (cold-start guard).
    NaN and Inf values are replaced with 0.0 before return.
    """
    try:
        now = datetime.now(timezone.utc)

        # ── 1. Attempt history ─────────────────────────────────────────────
        stmt_attempts = (
            select(
                Attempt.score,
                Attempt.finished_at,
                Attempt.mode,
                Attempt.avg_response_time,
                Attempt.response_time_variance,
            )
            .where(Attempt.user_id == user_id, Attempt.finished_at.is_not(None))
        )
        if before_at:
            stmt_attempts = stmt_attempts.where(Attempt.finished_at < before_at)
        stmt_attempts = stmt_attempts.order_by(Attempt.finished_at.desc())

        res_attempts = await db.execute(stmt_attempts)
        attempts = res_attempts.all()

        if not attempts:
            return None

        total_attempts_raw = len(attempts)
        scores = [_safe_float(a.score) for a in attempts]
        # Normalise to percentage (question_count not stored per row — assume 20)
        scores_pct = [(s / 20.0) * 100.0 for s in scores]

        # ── 2. UserTopicStats — per-topic accuracy ─────────────────────────
        stmt_topics = select(UserTopicStats).where(UserTopicStats.user_id == user_id)
        res_topics = await db.execute(stmt_topics)
        topic_rows = res_topics.scalars().all()

        # ── 3. ReviewQueue — SRS state ─────────────────────────────────────
        stmt_rq = select(ReviewQueue).where(ReviewQueue.user_id == user_id)
        res_rq = await db.execute(stmt_rq)
        rq_rows = res_rq.scalars().all()

        # ════════════════════════════════════════════════
        # FEATURE CALCULATIONS
        # ════════════════════════════════════════════════

        # F0 — readiness_score: avg score% of last 5 attempts
        last_5_pct = scores_pct[:5]
        readiness_score = sum(last_5_pct) / len(last_5_pct) if last_5_pct else 0.0

        # F1 — avg_topic_accuracy: simple average of accuracy_rate across topics
        accuracy_rates = [_safe_float(t.accuracy_rate) for t in topic_rows]
        avg_topic_accuracy = (
            sum(accuracy_rates) / len(accuracy_rates) if accuracy_rates else 0.0
        )

        # F2 — avg_retention_days: mean Ebbinghaus decay from last_attempt_at
        retention_values = [
            _retention_decay(t.last_attempt_at, now) for t in topic_rows
        ]
        avg_retention_days = (
            sum(retention_values) / len(retention_values) if retention_values else 0.5
        )

        # F3 — consolidation_factor: accuracy × retention
        consolidation_factor = avg_topic_accuracy * avg_retention_days

        # F4 — adaptive_consistency_score: 100 - std(last 5 scores)
        adaptive_consistency_score = 100.0
        if len(last_5_pct) >= 2:
            std = float(np.std(last_5_pct))
            adaptive_consistency_score = max(0.0, 100.0 - std)

        # F5 — training_level_encoded: 0=beginner, 1=intermediate, 2=advanced
        adaptive_scores = [
            _safe_float(a.score)
            for a in attempts
            if a.mode == "adaptive"
        ][:3]
        training_level_encoded = 0.0
        if len(adaptive_scores) >= 2:
            avg_adaptive = (sum(adaptive_scores) / len(adaptive_scores) / 20.0) * 100
            if avg_adaptive >= 85:
                training_level_encoded = 2.0
            elif avg_adaptive >= 60:
                training_level_encoded = 1.0

        # F6 — pressure_resilience: 1 - normalised variance of response time
        last_a = attempts[0]
        pressure_resilience = 1.0
        rt = _safe_float(last_a.avg_response_time)
        rtv = _safe_float(last_a.response_time_variance)
        if rt > 0 and rtv > 0:
            pressure_resilience = max(0.0, min(1.0, 1.0 - rtv / (rt ** 2)))

        # F7 — avg_response_time
        avg_response_time = rt

        # F8 — response_time_variance_log
        response_time_variance_log = log1p(_safe_float(last_a.response_time_variance))

        # F9 — total_attempts_log
        total_attempts_log = log1p(total_attempts_raw)

        # F10 — last_5_score_mean (raw scores)
        last_5_raw = scores[:5]
        last_5_score_mean = float(np.mean(last_5_raw)) if last_5_raw else 0.0

        # F11 — last_5_score_std
        last_5_score_std = (
            float(np.std(last_5_raw)) if len(last_5_raw) >= 2 else 0.0
        )

        # F12 — review_queue_size: count of overdue items
        overdue_items = [r for r in rq_rows if r.next_review_at is not None]
        overdue_now = []
        for r in overdue_items:
            nra = r.next_review_at
            if nra.tzinfo is None:
                nra = nra.replace(tzinfo=timezone.utc)
            if nra <= now:
                overdue_now.append(r)
        review_queue_size = float(len(overdue_now))

        # F13 — avg_interval_days
        interval_values = [_safe_float(r.interval_days, 1.0) for r in rq_rows]
        avg_interval_days = (
            sum(interval_values) / len(interval_values) if interval_values else 0.0
        )

        # F14 — avg_last_result_score: "correct"=1.0, anything else=0.0
        result_scores = [1.0 if r.last_result == "correct" else 0.0 for r in rq_rows]
        avg_last_result_score = (
            sum(result_scores) / len(result_scores) if result_scores else 0.0
        )

        # F15 — topic_entropy: Shannon entropy of accuracy_rate distribution
        topic_entropy = 0.0
        if accuracy_rates:
            total_acc = sum(accuracy_rates)
            if total_acc > 0:
                probs = [p / total_acc for p in accuracy_rates if p > 0]
                topic_entropy = -sum(p * np.log(p) for p in probs if p > 0)

        # F16 — weakest_topic_accuracy
        weakest_topic_accuracy = min(accuracy_rates) if accuracy_rates else 0.0

        # F17 — strongest_topic_accuracy
        strongest_topic_accuracy = max(accuracy_rates) if accuracy_rates else 0.0

        # F18 — time_since_last_attempt (days)
        time_since_last_attempt = 1.0
        if last_a.finished_at:
            fat = last_a.finished_at
            if fat.tzinfo is None:
                fat = fat.replace(tzinfo=timezone.utc)
            time_since_last_attempt = max(0.0, (now - fat).total_seconds() / 86400.0)

        # F19 — overdue_ratio
        overdue_ratio = (
            len(overdue_now) / len(rq_rows) if rq_rows else 0.0
        )

        # ── Assemble vector ────────────────────────────────────────────────
        vector = [
            float(readiness_score),
            float(avg_topic_accuracy),
            float(avg_retention_days),
            float(consolidation_factor),
            float(adaptive_consistency_score),
            float(training_level_encoded),
            float(pressure_resilience),
            float(avg_response_time),
            float(response_time_variance_log),
            float(total_attempts_log),
            float(last_5_score_mean),
            float(last_5_score_std),
            float(review_queue_size),
            float(avg_interval_days),
            float(avg_last_result_score),
            float(topic_entropy),
            float(weakest_topic_accuracy),
            float(strongest_topic_accuracy),
            float(time_since_last_attempt),
            float(overdue_ratio),
        ]

        # Replace any remaining NaN / Inf with 0.0
        vector = [0.0 if (v != v or v == float("inf") or v == float("-inf")) else v for v in vector]
        return vector

    except Exception:
        import traceback
        traceback.print_exc()
        return None
