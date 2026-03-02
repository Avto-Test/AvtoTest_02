"""
AUTOTEST User Analytics Router
Analytics endpoints for authenticated users
"""

from fastapi import APIRouter, Depends
from sqlalchemy import desc, func, select, case, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone
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
)
from api.auth.router import get_current_user
from database.session import get_db
from models.attempt import Attempt
from models.lesson import Lesson
from models.test import Test
from models.user import User
from models.user_skill import UserSkill
from services.learning.taxonomy import (
    lesson_learning_keys,
    normalize_learning_key,
    question_learning_key,
)

# Phase 12B Imports
from ml.features import get_user_feature_vector
from ml.model_registry import get_inference_engine

router = APIRouter(prefix="/analytics/me", tags=["analytics"])


def _compute_focus_topics(
    topic_stats: list[tuple[str, int, int]],
    user_skills: list[UserSkill],
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

    now_utc = datetime.now(timezone.utc)
    for skill in user_skills:
        key = normalize_learning_key(skill.topic)
        due_boost = 0.0
        if skill.next_review_at and skill.next_review_at <= now_utc:
            due_boost = 0.25
        skill_gap = max(0.0, 1 - float(skill.bkt_knowledge_prob))
        skill_priority = min(1.0, 0.5 * skill_gap + due_boost)
        topic_priority[key] = max(topic_priority.get(key, 0.0), skill_priority)

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
    
    stmt = (
        select(UserSkill)
        .where(
            UserSkill.user_id == current_user.id,
            UserSkill.next_review_at <= now_utc
        )
        .order_by(UserSkill.next_review_at.asc())
    )
    res = await db.execute(stmt)
    due_skills = res.scalars().all()
    
    due_topics = []
    for s in due_skills:
        # Retention Decay logic (Phase 9)
        ret = 1.0
        if s.last_practice_at:
            days = (now_utc - s.last_practice_at).days
            ret = max(0.2, min(1.0, exp(-0.015 * days)))
            
        due_topics.append(DueTopic(
            topic=s.topic,
            next_review_at=s.next_review_at.isoformat() if s.next_review_at else now_utc.isoformat(),
            retention_score=round(ret, 2),
            bkt_prob=round(s.bkt_knowledge_prob, 2)
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
    from models.attempt_answer import AttemptAnswer
    from models.question import Question
    from sqlalchemy import case

    # 1. Fetch Overview Metrics & Recent Scores
    # We need all attempts for general stats
    stmt_general = (
        select(
            Attempt.score,
            Attempt.question_count,
            Attempt.finished_at,
            Attempt.mode,
            Attempt.avg_response_time,
            Attempt.response_time_variance,
        )
        .where(
            Attempt.user_id == current_user.id,
            Attempt.finished_at.is_not(None)
        )
        .order_by(Attempt.finished_at.desc())
    )
    res_general = await db.execute(stmt_general)
    rows_general = res_general.all()
    
    total_attempts = len(rows_general)

    def attempt_pct(row) -> float:
        total = row.question_count if getattr(row, "question_count", None) else 20
        return (row.score / max(1, total)) * 100

    score_pcts = [attempt_pct(r) for r in rows_general]

    avg_score = sum(score_pcts) / total_attempts if total_attempts > 0 else 0.0
    best_score = max(score_pcts) if score_pcts else 0.0
    recent_scores = score_pcts[:5][::-1] # Last 5 chronological
    
    # 2. Improvement Delta (All attempts)
    improvement_delta = 0.0
    improvement_direction = "stable"
    
    if len(score_pcts) >= 2:
        last_score = score_pcts[0]
        prev_score = score_pcts[1]
        
        current_pct = last_score
        prev_pct = prev_score
        
        diff = current_pct - prev_pct
        improvement_delta = round(abs(diff), 1)
        
        if abs(diff) < 2.0:
            improvement_direction = "stable"
        elif diff > 0:
            improvement_direction = "up"
        else:
            improvement_direction = "down"

    # 3. Training Level (Last 3 ADAPTIVE attempts)
    adaptive_rows = [r for r in rows_general if r.mode == "adaptive"][:3]
    current_training_level = "beginner"
    
    if len(adaptive_rows) >= 2:
        # Normalize scores to % before averaging
        adaptive_pcts = [attempt_pct(row) for row in adaptive_rows]
        avg_adaptive = sum(adaptive_pcts) / len(adaptive_pcts)
        
        if avg_adaptive >= 85:
            current_training_level = "advanced"
        elif avg_adaptive >= 60:
            current_training_level = "intermediate"
        else:
            current_training_level = "beginner"
    else:
        current_training_level = "beginner"

    # 4. Topic Breakdown & Recommendation
    # Topic/category are normalized through one shared taxonomy rule.
    stmt_topics = (
        select(
            Question.topic.label("topic"),
            Question.category.label("category"),
            func.count(AttemptAnswer.id).label("total"),
            func.sum(case((AttemptAnswer.is_correct == True, 1), else_=0)).label("correct")
        )
        .join(Attempt, AttemptAnswer.attempt_id == Attempt.id)
        .join(Question, AttemptAnswer.question_id == Question.id)
        .where(Attempt.user_id == current_user.id)
        .group_by(Question.topic, Question.category)
    )
    res_topics = await db.execute(stmt_topics)
    rows_topics = res_topics.all()

    aggregated_topics: dict[str, dict[str, float | str]] = {}
    for row in rows_topics:
        topic_key = question_learning_key(row.topic, row.category)
        display_name = (row.topic or row.category or "General").strip() or "General"
        item = aggregated_topics.setdefault(
            topic_key,
            {"label": display_name, "total": 0.0, "correct": 0.0},
        )
        item["total"] = float(item["total"]) + float(row.total or 0)
        item["correct"] = float(item["correct"]) + float(row.correct or 0)

    topic_breakdown: list[TopicAccuracy] = []
    weakest_topic = None
    prob_min_acc = 101.0
    topic_stats_for_focus: list[tuple[str, int, int]] = []

    for topic_key, item in aggregated_topics.items():
        total = int(item["total"])
        correct = int(item["correct"])
        label = str(item["label"])
        acc = (correct / total * 100) if total > 0 else 0.0
        topic_breakdown.append(TopicAccuracy(topic=label, accuracy=round(acc, 1)))
        topic_stats_for_focus.append((topic_key, total, correct))

        # Identify weakest for recommendation (min 5 answers)
        if total >= 5 and acc < prob_min_acc:
            prob_min_acc = acc
            weakest_topic = label

    recommendation = Recommendation()
    if weakest_topic:
        recommendation = Recommendation(
            topic=weakest_topic,
            accuracy=round(prob_min_acc, 1),
            action_label=f"Practice {weakest_topic}"
        )

    # Calculate Skill Vectors for Dashboard
    now_utc = datetime.now(timezone.utc)
    stmt_skills = (
        select(UserSkill)
        .where(UserSkill.user_id == current_user.id)
    )
    res_skills = await db.execute(stmt_skills)
    user_skills = res_skills.scalars().all()
    
    total_due = sum(1 for s in user_skills if s.next_review_at and s.next_review_at <= now_utc)
    
    skill_vector = [TopicSkill(topic=s.topic, skill=round(s.skill_score * 100, 1)) for s in user_skills]
    knowledge_mastery = [KnowledgeMastery(topic=s.topic, probability=round(s.bkt_knowledge_prob * 100, 1)) for s in user_skills]
    retention_vector = [TopicRetention(topic=s.topic, retention=round(float(s.retention_score), 2)) for s in user_skills]

    # 4b. Premium lesson recommendations from diagnostics.
    focus_topics = _compute_focus_topics(topic_stats_for_focus, user_skills)
    focus_topic_scores = {topic: score for topic, score in focus_topics}
    focus_topic_labels = {
        key: str(data["label"]) for key, data in aggregated_topics.items()
    }

    lesson_recommendations: list[LessonRecommendation] = []
    if (current_user.is_premium or current_user.is_admin) and focus_topic_scores:
        lesson_result = await db.execute(
            select(Lesson)
            .where(
                Lesson.is_active == True,
                Lesson.is_premium == True,
            )
            .order_by(Lesson.sort_order.asc(), Lesson.created_at.desc())
        )
        lessons = list(lesson_result.scalars().all())

        scored_lessons: list[tuple[float, Lesson, str]] = []
        for lesson in lessons:
            keys = lesson_learning_keys(lesson.topic, lesson.section)
            matches = [(key, focus_topic_scores[key]) for key in keys if key in focus_topic_scores]
            if not matches:
                continue
            matched_key, match_score = max(matches, key=lambda item: item[1])
            reason_topic = focus_topic_labels.get(matched_key, matched_key.title())
            scored_lessons.append((match_score, lesson, reason_topic))

        scored_lessons.sort(
            key=lambda item: (
                item[0],
                -item[1].sort_order,
                item[1].created_at.timestamp() if item[1].created_at else 0,
            ),
            reverse=True,
        )

        lesson_recommendations = [
            LessonRecommendation(
                lesson_id=lesson.id,
                title=lesson.title,
                content_type=lesson.content_type,
                content_url=lesson.content_url,
                topic=lesson.topic,
                section=lesson.section,
                reason=f"High mistake rate in {reason_topic}",
                match_score=round(score, 2),
            )
            for score, lesson, reason_topic in scored_lessons[:6]
        ]

    # 5. Calculate Readiness Score (Predictive Engine)
    # Formula: (0.5 * avg_last_5) + (0.3 * consistency) + (0.2 * adaptation)
    
    # Component 1: Recent Performance (50%)
    avg_recent_pct = 0.0
    recent_rows = rows_general[:5]
    if recent_rows:
        avg_recent_pct = sum(attempt_pct(row) for row in recent_rows) / len(recent_rows)

    # Component 2: Topic Consistency (30%)
    topic_consistency_score = 0.0
    if topic_breakdown:
        accuracies = [t.accuracy for t in topic_breakdown]
        if len(accuracies) > 1:
            mean_acc = sum(accuracies) / len(accuracies)
            variance = sum((x - mean_acc) ** 2 for x in accuracies) / len(accuracies)
            std_dev = variance ** 0.5
            # Inverted scale: lower deviation -> higher score
            topic_consistency_score = max(0.0, 100.0 - std_dev)
        else:
            # Single topic or data -> High consistency
            topic_consistency_score = 100.0

    # Component 3: Difficulty Adaptation (20%)
    difficulty_adaptation_score = 0.0
    # avg_adaptive (pct) calculated in block #3?
    # Wait, block #3 variable scope check.
    # 'avg_adaptive' is defined inside if len(adaptive_scores) >= 2 block in existing code.
    # I should re-calculate or safely access it.
    
    avg_adaptive_check = 0.0
    if len(adaptive_rows) >= 2:
        adaptive_pcts = [attempt_pct(row) for row in adaptive_rows]
        avg_adaptive_check = sum(adaptive_pcts) / len(adaptive_pcts)
    
    if avg_adaptive_check >= 75:
        difficulty_adaptation_score = 100.0
    else:
        difficulty_adaptation_score = (avg_adaptive_check / 75) * 100

    # Final Calculation
    from ml.model_registry import (
        calculate_readiness_score, 
        calculate_hybrid_probability,
        safe_ml_inference, 
        get_inference_engine
    )

    readiness_score = 0.0
    if total_attempts > 0:
        readiness_score = calculate_readiness_score(
            avg_recent_pct,
            topic_consistency_score,
            difficulty_adaptation_score
        )

    # 6. Pass Probability Prediction Engine
    # Component A: adaptive_performance_score (last 3 adaptive, fallback to readiness)
    adaptive_performance_score = readiness_score  # fallback
    if len(adaptive_rows) >= 2:
        adaptive_pcts_pp = [attempt_pct(row) for row in adaptive_rows]
        adaptive_performance_score = sum(adaptive_pcts_pp) / len(adaptive_pcts_pp)

    # Component B: consistency_score (100 - stddev of last 5 scores scaled to 0-100)
    consistency_score_pp = 0.0
    last_5_rows = rows_general[:5]
    if len(last_5_rows) >= 2:
        pcts_5 = [attempt_pct(row) for row in last_5_rows]
        mean_5 = sum(pcts_5) / len(pcts_5)
        var_5 = sum((x - mean_5) ** 2 for x in pcts_5) / len(pcts_5)
        std_5 = var_5 ** 0.5
        consistency_score_pp = max(0.0, min(100.0, 100.0 - std_5))
    elif len(last_5_rows) == 1:
        consistency_score_pp = 100.0  # single score = perfectly consistent

    # Cognitive Stability calculation
    cognitive_stability = "Stable"
    if len(score_pcts) >= 5:
        mean_all = sum(score_pcts[:10]) / len(score_pcts[:10])
        var_all = sum((x - mean_all) ** 2 for x in score_pcts[:10]) / len(score_pcts[:10])
        std_all = var_all ** 0.5
        if std_all < 1.5: cognitive_stability = "Very High"
        elif std_all < 3.0: cognitive_stability = "High"
        elif std_all < 5.0: cognitive_stability = "Moderate"
        else: cognitive_stability = "Variable"

    avg_rt_latest = rows_general[0].avg_response_time if rows_general else 0.0
    adaptive_intelligence_strength = difficulty_adaptation_score

    # Component C: training_level_weight
    _training_level_weights = {"beginner": 50.0, "intermediate": 75.0, "advanced": 100.0}
    training_level_weight = _training_level_weights.get(current_training_level, 50.0)

    # Component D: pressure_resilience (from most recent attempt's timing data)
    pressure_resilience = 1.0
    if rows_general:
        last_row = rows_general[0]
        _avg_rt = last_row.avg_response_time
        _rt_var = last_row.response_time_variance
        if _avg_rt and _rt_var and _avg_rt > 0:
            _norm_var = _rt_var / (_avg_rt ** 2)
            pressure_resilience = max(0.0, min(1.0, 1.0 - _norm_var))

    # FINAL PROBABILITY CALCULATION (Hybrid)
    engine = get_inference_engine()
    ml_prob_val = await safe_ml_inference(db, current_user.id)
    
    hybrid_res = calculate_hybrid_probability(
        readiness_score,
        adaptive_performance_score,
        consistency_score_pp,
        training_level_weight,
        pressure_resilience,
        ml_prob_val,
        engine.auc_score,
        engine.drift_status
    )

    pass_probability = hybrid_res["pass_probability"]
    rule_prob = hybrid_res["rule_prob"]
    ml_prob = hybrid_res["ml_prob"]
    confidence_score = hybrid_res["confidence_score"]
    ml_status = engine.status if ml_prob_val is not None else "insufficient_data"
    if engine.drift_status == "severe":
        ml_status = "fallback"
    
    model_version = engine.version

    # Re-evaluate interpretation label
    if pass_probability >= 95:
        pass_prediction_label = "Exam Ready"
    elif pass_probability >= 85:
        pass_prediction_label = "Very Likely to Pass"
    elif pass_probability >= 70:
        pass_prediction_label = "Likely to Pass"
    elif pass_probability >= 50:
        pass_prediction_label = "Needs Improvement"
    else:
        pass_prediction_label = "High Risk of Failing"

    return DashboardResponse(
        overview=AnalyticsOverview(
            total_attempts=total_attempts,
            average_score=round(float(avg_score), 2),
            best_score=float(best_score),
            improvement_delta=improvement_delta,
            improvement_direction=improvement_direction,
            current_training_level=current_training_level,
            readiness_score=round(readiness_score, 1),
            pass_probability=pass_probability,
            pass_prediction_label=pass_prediction_label,
            adaptive_intelligence_strength=adaptive_intelligence_strength,
            total_due=total_due,
            avg_response_time=avg_rt_latest,
            cognitive_stability=cognitive_stability,
            pressure_resilience=round(pressure_resilience * 100, 1),
            # Model fields
            pass_probability_ml=round(ml_prob, 1) if ml_prob is not None else None,
            pass_probability_rule=round(rule_prob, 1),
            pass_probability_final=pass_probability,
            confidence_score=round(confidence_score, 2),
            model_version=model_version,
            ml_status=ml_status
        ),
        recommendation=recommendation,
        recent_scores=recent_scores,
        topic_breakdown=topic_breakdown,
        skill_vector=skill_vector,
        knowledge_mastery=knowledge_mastery,
        retention_vector=retention_vector,
        lesson_recommendations=lesson_recommendations,
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
            (a.score / max(1, a.question_count if a.question_count else 20)) * 100.0
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
                (a.score / max(1, a.question_count if a.question_count else 20)) * 100.0
                for a in adaptive_attempts
            ]
            avg_adaptive_check = sum(adaptive_pcts) / len(adaptive_pcts)
        
        difficulty_adaptation_score = (avg_adaptive_check / 75.0) * 100.0 if avg_adaptive_check < 75 else 100.0

        readiness = calculate_readiness_score(avg_recent_pct, topic_consistency_score, difficulty_adaptation_score)

        # 2. Probability Variables
        adaptive_performance_score = readiness
        if len(adaptive_attempts) >= 2:
            adaptive_performance_score = avg_adaptive_check
            
        consistency_score_pp = topic_consistency_score

        _tlw = {"beginner": 50.0, "intermediate": 75.0, "advanced": 100.0}
        training_level_weight = _tlw.get(att.training_level or "beginner", 50.0)
        
        # Pressure resilience
        pressure_res = 1.0
        if att.avg_response_time and att.response_time_variance:
            norm_var = att.response_time_variance / (att.avg_response_time ** 2) if att.avg_response_time > 0 else 0
            pressure_res = max(0.0, min(1.0, 1.0 - norm_var))

        # --- RECONSTRUCT ML ---
        ml_prob = None
        if i >= 9:
            from datetime import timedelta
            vector = await get_user_feature_vector(db, user_id, before_at=att.finished_at + timedelta(seconds=1))
            if vector:
                ml_prob = engine.predict(vector)

        # --- BLEND ---
        blend_res = calculate_hybrid_probability(
            readiness,
            adaptive_performance_score,
            consistency_score_pp,
            training_level_weight,
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
            retention_score=0.85, 
            drift_state=engine.drift_status,
            model_version=engine.version
        ))

    return history

