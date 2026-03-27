from __future__ import annotations

from datetime import datetime, timedelta as dt_timedelta, timezone
import logging
import uuid
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.attempts.schemas import BulkSubmitResponse, DetailedAnswer, RewardAchievement, RewardSummary
from core.config import settings
from models.analytics_event import AnalyticsEvent
from models.answer_option import AnswerOption
from models.attempt import Attempt
from models.attempt_answer import AttemptAnswer
from models.exam_simulation_attempt import ExamSimulationAttempt
from models.question import Question
from models.review_queue import ReviewQueue
from models.test import Test
from models.user import User
from models.user_adaptive_profile import UserAdaptiveProfile
from models.user_question_history import UserQuestionHistory
from models.user_topic_stats import UserTopicStats
from services.gamification.rewards import award_attempt_completion_rewards
from services.learning.intelligence_metrics import attempt_score_percent, pass_prediction_label
from services.learning.progress_tracking import LearningAnswerRecord, apply_learning_progress_updates
from services.learning.simulation_service import finalize_exam_simulation, resolve_simulation_limits

logger = logging.getLogger(__name__)


def _is_demo_account(user: User) -> bool:
    email = (user.email or "").strip().lower()
    return settings.is_development and email.startswith("demo.") and email.endswith("@example.com")


async def _sync_simulation_completion(
    db: AsyncSession,
    attempt: Attempt,
    *,
    finished_at: datetime,
    mistake_count: int,
    passed: bool,
    timeout: bool,
    violation_count: int | None = None,
    disqualified: bool | None = None,
    disqualification_reason: str | None = None,
) -> None:
    if attempt.mode != "simulation":
        return

    simulation = await finalize_exam_simulation(
        db,
        attempt,
        finished_at=finished_at,
        mistake_count=mistake_count,
        passed=passed,
        timeout=timeout,
        violation_count=violation_count,
        disqualified=disqualified,
        disqualification_reason=disqualification_reason,
    )
    if simulation is None:
        return

    db.add(
        AnalyticsEvent(
            user_id=attempt.user_id,
            event_name="simulation_completed",
            metadata_json={
                "simulation_id": str(attempt.id),
                "mistake_count": int(mistake_count),
                "passed": bool(passed),
                "timeout": bool(timeout),
            },
        )
    )


async def finalize_attempt(
    *,
    db: AsyncSession,
    current_user: User,
    attempt_id: UUID,
    answers: dict[UUID, UUID],
    visited_question_ids: list[UUID] | None = None,
    response_times: list[int] | None = None,
) -> BulkSubmitResponse:
    stmt = (
        select(Attempt)
        .options(selectinload(Attempt.attempt_answers))
        .where(Attempt.id == attempt_id)
    )
    result = await db.execute(stmt)
    attempt = result.scalar_one_or_none()

    if not attempt or attempt.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.finished_at:
        raise HTTPException(status_code=400, detail="Attempt already finished")

    simulation = await db.get(ExamSimulationAttempt, attempt.id) if attempt.mode == "simulation" else None
    mistake_limit = resolve_simulation_limits(simulation)[0] if simulation is not None else (1 if attempt.pressure_mode else 2)
    violation_limit = resolve_simulation_limits(simulation)[1] if simulation is not None else None

    finished_attempts_result = await db.execute(
        select(func.count(Attempt.id)).where(
            Attempt.user_id == current_user.id,
            Attempt.finished_at.is_not(None),
        )
    )
    finished_attempts_before = finished_attempts_result.scalar_one()
    is_first_completed_attempt = finished_attempts_before == 0

    expected_question_ids: list[uuid.UUID] = []
    if attempt.question_ids:
        try:
            expected_question_ids = [uuid.UUID(qid) for qid in attempt.question_ids]
        except (ValueError, TypeError):
            expected_question_ids = []

    if expected_question_ids:
        question_stmt = (
            select(Question)
            .options(selectinload(Question.answer_options))
            .where(Question.id.in_(expected_question_ids))
        )
    else:
        question_stmt = (
            select(Question)
            .options(selectinload(Question.answer_options))
            .where(Question.test_id == attempt.test_id)
        )

    question_result = await db.execute(question_stmt)
    questions = question_result.scalars().all()
    questions_map = {q.id: q for q in questions}
    test_question_ids = {q.id for q in questions}
    submitted_question_ids = {q_id for q_id in answers.keys()}
    visited_ids = set(visited_question_ids or [])

    extra = submitted_question_ids - test_question_ids
    if extra:
        raise HTTPException(status_code=400, detail="Submission contains unknown questions.")

    extra_visited = visited_ids - test_question_ids
    if extra_visited:
        raise HTTPException(status_code=400, detail="Submission contains unknown visited questions.")

    effective_reviewed_ids = (visited_ids | submitted_question_ids) if visited_ids else set(test_question_ids)
    effective_reviewed_ids &= test_question_ids
    reviewed_question_count = len(effective_reviewed_ids) if effective_reviewed_ids else len(questions)
    answered_question_count = len(submitted_question_ids)
    completed_all = answered_question_count == len(questions) and reviewed_question_count == len(questions)

    validated_response_times = list(response_times or [])
    if validated_response_times and len(validated_response_times) not in {len(questions), len(answers), reviewed_question_count}:
        raise HTTPException(
            status_code=400,
            detail="Response times count must match total questions, reviewed questions, or submitted answers.",
        )
    if any(rt < 0 for rt in validated_response_times):
        raise HTTPException(status_code=400, detail="Response times cannot be negative.")

    validated_response_times = [min(rt, 300000) for rt in validated_response_times]
    if len(validated_response_times) == len(answers) and len(questions) > len(answers):
        validated_response_times.extend([0] * (len(questions) - len(answers)))

    avg_rt = sum(validated_response_times) / len(validated_response_times) if validated_response_times else 0
    variance_rt = (
        sum((rt - avg_rt) ** 2 for rt in validated_response_times) / len(validated_response_times)
        if validated_response_times
        else 0
    )
    normalized_variance = variance_rt / (avg_rt ** 2) if avg_rt > 0 else 0
    cognitive_profile = "Stable"
    if avg_rt < 2500 and normalized_variance < 0.35:
        cognitive_profile = "Stable-Fast"
    elif normalized_variance >= 0.35:
        cognitive_profile = "Unstable"
    elif avg_rt >= 4000:
        cognitive_profile = "Slow-Deliberate"

    attempt.avg_response_time = avg_rt
    attempt.response_time_variance = variance_rt

    now = datetime.now(timezone.utc)
    started_at = attempt.started_at
    if not started_at.tzinfo:
        started_at = started_at.replace(tzinfo=timezone.utc)
    elapsed = now - started_at

    if attempt.time_limit_seconds and attempt.time_limit_seconds > 0:
        duration_limit = dt_timedelta(seconds=attempt.time_limit_seconds)
    else:
        test_stmt = select(Test).where(Test.id == attempt.test_id)
        test_res = await db.execute(test_stmt)
        test_obj = test_res.scalar_one()
        duration_limit = dt_timedelta(minutes=test_obj.duration if test_obj.duration else 25)

    time_is_up = elapsed > (duration_limit + dt_timedelta(seconds=30))

    detailed_answer_payloads: list[dict[str, object]] = []
    learning_answer_records: list[LearningAnswerRecord] = []
    correct_count = 0
    adaptive_profile: UserAdaptiveProfile | None = None
    topic_ids = {q.category_id for q in questions if q.category_id is not None}
    pre_topic_rows = (
        await db.execute(
            select(UserTopicStats).where(
                UserTopicStats.user_id == current_user.id,
                UserTopicStats.topic_id.in_(topic_ids),
            )
        )
    ).scalars().all() if topic_ids else []
    pre_topic_state = {
        row.topic_id: (int(row.total_attempts), float(row.accuracy_rate))
        for row in pre_topic_rows
    }
    due_review_count_before = int(
        (
            await db.execute(
                select(func.count(ReviewQueue.id)).where(
                    ReviewQueue.user_id == current_user.id,
                    ReviewQueue.next_review_at <= now,
                )
            )
        ).scalar_one()
        or 0
    )

    if attempt.mode == "adaptive":
        adaptive_profile_result = await db.execute(
            select(UserAdaptiveProfile).where(UserAdaptiveProfile.user_id == current_user.id)
        )
        adaptive_profile = adaptive_profile_result.scalar_one_or_none()
        if adaptive_profile is None:
            adaptive_profile = UserAdaptiveProfile(
                user_id=current_user.id,
                target_difficulty_percent=50,
            )
            db.add(adaptive_profile)
            await db.flush()

    await db.execute(delete(AttemptAnswer).where(AttemptAnswer.attempt_id == attempt.id))

    history_rows = (
        await db.execute(
            select(UserQuestionHistory).where(
                UserQuestionHistory.user_id == current_user.id,
                UserQuestionHistory.question_id.in_(list(answers.keys())),
            )
        )
    ).scalars().all() if answers else []
    history_map = {row.question_id: row for row in history_rows}

    for q_id, opt_id in answers.items():
        question = questions_map[q_id]
        selected_option = next((o for o in question.answer_options if o.id == opt_id), None)
        if selected_option is None:
            raise HTTPException(status_code=400, detail="Invalid answer option submitted.")

        correct_option = next((o for o in question.answer_options if o.is_correct), None)
        correct_option_id = correct_option.id if correct_option else opt_id
        is_correct = selected_option.is_correct
        detailed_answer_payloads.append(
            {
                "question_id": q_id,
                "selected_option_id": opt_id,
                "correct_option_id": correct_option_id,
                "is_correct": is_correct,
            }
        )
        if is_correct:
            correct_count += 1

        db.add(
            AttemptAnswer(
                attempt_id=attempt.id,
                question_id=q_id,
                selected_option_id=opt_id,
                is_correct=is_correct,
            )
        )

        history = history_map.get(q_id)
        if history is None:
            history = UserQuestionHistory(
                user_id=current_user.id,
                question_id=q_id,
                attempt_count=0,
                correct_count=0,
            )
            db.add(history)
            history_map[q_id] = history

        history.attempt_count = int(history.attempt_count) + 1
        history.last_seen_at = now
        if is_correct:
            history.correct_count = int(history.correct_count) + 1
            history.last_correct_at = now

        learning_answer_records.append(
            LearningAnswerRecord(
                question_id=q_id,
                topic_id=question.category_id,
                is_correct=is_correct,
                occurred_at=now,
            )
        )

    if adaptive_profile is not None and questions:
        score_percent = (correct_count / max(1, reviewed_question_count)) * 100.0
        delta = 0
        if score_percent >= 85:
            delta = -4
        elif score_percent >= 70:
            delta = -2
        elif score_percent <= 35:
            delta = +5
        elif score_percent <= 50:
            delta = +3

        recent_scores_rows = (
            await db.execute(
                select(Attempt.score, Attempt.question_count)
                .where(
                    Attempt.user_id == current_user.id,
                    Attempt.mode == "adaptive",
                    Attempt.finished_at.is_not(None),
                    Attempt.score.is_not(None),
                    Attempt.question_count > 0,
                )
                .order_by(Attempt.finished_at.desc())
                .limit(6)
            )
        ).all()
        if len(recent_scores_rows) >= 6:
            recents = [
                (float(row.score) / max(1, int(row.question_count))) * 100.0
                for row in recent_scores_rows[:3]
            ]
            previous = [
                (float(row.score) / max(1, int(row.question_count))) * 100.0
                for row in recent_scores_rows[3:6]
            ]
            trend = (sum(recents) / len(recents)) - (sum(previous) / len(previous))
            if trend > 5.0:
                delta -= 2
            elif trend < -5.0:
                delta += 2

        adaptive_profile.target_difficulty_percent = max(
            0,
            min(100, int(adaptive_profile.target_difficulty_percent) + delta),
        )

    if visited_ids:
        effective_total = max(1, reviewed_question_count)
        mistakes = max(0, answered_question_count - correct_count)
        unanswered_count = max(0, effective_total - answered_question_count)
    else:
        effective_total = len(questions)
        mistakes = effective_total - correct_count
        unanswered_count = max(0, effective_total - answered_question_count)

    attempt.question_count = effective_total
    attempt.score = int(correct_count * attempt.pressure_score_modifier)
    attempt.finished_at = now

    simulation_disqualified = bool(simulation.disqualified) if simulation is not None else False
    violation_count = int(simulation.violation_count or 0) if simulation is not None else None
    disqualification_reason = simulation.disqualification_reason if simulation is not None else None
    passed = completed_all and mistakes <= mistake_limit and not time_is_up and not simulation_disqualified
    if time_is_up:
        passed = False

    await apply_learning_progress_updates(
        db=db,
        user_id=current_user.id,
        answer_records=learning_answer_records,
    )

    refreshed_question_rows = (
        await db.execute(
            select(Question)
            .where(Question.id.in_(list(answers.keys())))
            .execution_options(populate_existing=True)
        )
    ).scalars().all() if answers else []
    refreshed_question_map = {row.id: row for row in refreshed_question_rows}
    detailed_answers = [
        DetailedAnswer(
            question_id=payload["question_id"],
            selected_option_id=payload["selected_option_id"],
            correct_option_id=payload["correct_option_id"],
            is_correct=bool(payload["is_correct"]),
            dynamic_difficulty_score=float(
                refreshed_question_map.get(payload["question_id"]).dynamic_difficulty_score
                if refreshed_question_map.get(payload["question_id"]) is not None
                else 0.5
            ),
        )
        for payload in detailed_answer_payloads
    ]

    if attempt.mode == "learning":
        db.add(
            AnalyticsEvent(
                user_id=current_user.id,
                event_name="learning_session_completed",
                metadata_json={
                    "session_id": str(attempt.id),
                    "score": attempt.score,
                    "total_questions": effective_total,
                    "passed": passed,
                },
            )
        )

    await _sync_simulation_completion(
        db,
        attempt,
        finished_at=now,
        mistake_count=mistakes,
        passed=passed,
        timeout=time_is_up,
        violation_count=violation_count,
        disqualified=simulation_disqualified,
        disqualification_reason=disqualification_reason,
    )
    reward_grant = await award_attempt_completion_rewards(
        db,
        current_user.id,
        attempt_id=attempt.id,
        mode=attempt.mode,
        passed=passed,
        score_percent=(correct_count / max(1, effective_total)) * 100.0,
        occurred_at=now,
        topic_ids={record.topic_id for record in learning_answer_records if record.topic_id is not None},
        pre_topic_state=pre_topic_state,
        due_review_count_before=due_review_count_before,
    )

    try:
        from ml.model_registry import capture_inference_snapshot

        snapshot = await capture_inference_snapshot(db, attempt.id, str(current_user.id))
        if snapshot:
            db.add(snapshot)
    except Exception as exc:  # pragma: no cover - non-blocking fallback
        logger.error("Snapshot storage failed (non-blocking): %s", exc)

    if settings.DRY_RUN:
        await db.flush()
    else:
        await db.commit()
        await db.refresh(attempt)

    pass_prediction_label_value = pass_prediction_label(
        (correct_count / max(1, effective_total)) * 100.0,
    )
    skill_messages: list[str] = []
    fading_topics: list[str] = []
    topic_stability: dict[str, str] = {}

    try:
        topic_label_by_id: dict[uuid.UUID, str] = {}
        for question in questions:
            if question.category_id is None:
                continue
            topic_label_by_id.setdefault(
                question.category_id,
                (question.category or question.topic or "Umumiy").strip(),
            )

        answer_topic_ids = [record.topic_id for record in learning_answer_records if record.topic_id is not None]
        unique_topic_ids = list(dict.fromkeys(answer_topic_ids))
        stats_rows = (
            await db.execute(
                select(UserTopicStats).where(
                    UserTopicStats.user_id == current_user.id,
                    UserTopicStats.topic_id.in_(unique_topic_ids),
                )
            )
        ).scalars().all() if unique_topic_ids else []
        stats_map = {row.topic_id: row for row in stats_rows}

        review_due_rows = (
            await db.execute(
                select(Question.category_id, func.count(ReviewQueue.question_id))
                .join(Question, ReviewQueue.question_id == Question.id)
                .where(
                    ReviewQueue.user_id == current_user.id,
                    ReviewQueue.next_review_at <= now,
                    Question.category_id.in_(unique_topic_ids),
                )
                .group_by(Question.category_id)
            )
        ).all() if unique_topic_ids else []
        due_map = {topic_id: int(count or 0) for topic_id, count in review_due_rows if topic_id is not None}

        topic_accuracy_rows: list[tuple[str, float]] = []
        for topic_id in unique_topic_ids:
            label = topic_label_by_id.get(topic_id, "Umumiy")
            local_results = [
                record.is_correct
                for record in learning_answer_records
                if record.topic_id == topic_id
            ]
            if not local_results:
                continue
            accuracy = (sum(1 for result in local_results if result) / len(local_results)) * 100.0
            topic_accuracy_rows.append((label, accuracy))

            stats = stats_map.get(topic_id)
            total_attempts = int(stats.total_attempts or 0) if stats is not None else len(local_results)
            rolling_accuracy = float(stats.accuracy_rate or 0.0) * 100.0 if stats is not None else accuracy
            due_count = due_map.get(topic_id, 0)

            if rolling_accuracy >= 80.0 and total_attempts >= 10 and due_count == 0:
                topic_stability[label] = "High"
            elif rolling_accuracy >= 60.0 and total_attempts >= 4:
                topic_stability[label] = "Medium"
            else:
                topic_stability[label] = "Low"

            if due_count > 0 or rolling_accuracy < 55.0:
                fading_topics.append(label)

        topic_accuracy_rows.sort(key=lambda item: item[1])
        weakest_topics = topic_accuracy_rows[:2]
        strongest_topic = max(topic_accuracy_rows, key=lambda item: item[1]) if topic_accuracy_rows else None

        for label, accuracy in weakest_topics:
            skill_messages.append(f"{label} bo'yicha natija {accuracy:.0f}% — shu yo'nalishni qayta ko'ring.")
        if strongest_topic is not None and strongest_topic[1] >= 85.0:
            skill_messages.append(
                f"{strongest_topic[0]} bo'yicha natija yaxshi — murakkabroq savollarga o'tish mumkin."
            )

        recent_stmt = (
            select(Attempt.score, Attempt.question_count)
            .where(
                Attempt.user_id == current_user.id,
                Attempt.finished_at.is_not(None)
            )
            .order_by(Attempt.finished_at.desc())
            .limit(5)
        )
        recent_res = await db.execute(recent_stmt)
        recent_data = recent_res.all()

        if recent_data:
            total_pct = sum(
                attempt_score_percent(row.score, row.question_count)
                for row in recent_data
            )
            avg_pct = total_pct / len(recent_data)
            pass_prediction_label_value = pass_prediction_label(avg_pct)
    except Exception as exc:  # pragma: no cover - defensive fallback
        logger.exception("Detailed Intelligence update failure: %s", exc)

    skill_messages = list(dict.fromkeys(skill_messages))[:4]
    fading_topics = list(dict.fromkeys(fading_topics))[:4]

    demo_review_enabled = _is_demo_account(current_user)
    answers_unlocked = current_user.is_premium or is_first_completed_attempt or demo_review_enabled or attempt.mode == "simulation"
    if current_user.is_premium:
        unlock_reason = "premium"
    elif attempt.mode == "simulation":
        unlock_reason = "simulation_review"
    elif is_first_completed_attempt:
        unlock_reason = "first_test_demo"
    elif demo_review_enabled:
        unlock_reason = "demo_account"
    else:
        unlock_reason = "premium_required"

    response_answers = detailed_answers if answers_unlocked else []
    response_skill_messages = skill_messages if answers_unlocked else []
    response_fading_topics = fading_topics if answers_unlocked else []
    response_topic_stability = topic_stability if answers_unlocked else {}

    response_payload = BulkSubmitResponse(
        score=attempt.score,
        total=effective_total,
        reviewed_count=effective_total,
        answered_count=answered_question_count,
        unanswered_count=unanswered_count,
        correct_count=correct_count,
        mistakes_count=mistakes,
        completed_all=completed_all,
        passed=passed,
        finished_at=attempt.finished_at.isoformat(),
        answers=response_answers,
        answers_unlocked=answers_unlocked,
        unlock_reason=unlock_reason,
        is_adaptive=(attempt.mode == "adaptive"),
        training_level=attempt.training_level,
        pass_prediction_label=pass_prediction_label_value,
        skill_messages=response_skill_messages,
        fading_topics=response_fading_topics,
        topic_stability=response_topic_stability,
        avg_response_time=avg_rt,
        cognitive_profile=cognitive_profile,
        pressure_mode=attempt.pressure_mode,
        mistake_limit=mistake_limit if attempt.mode == "simulation" else None,
        violation_count=violation_count,
        violation_limit=violation_limit,
        disqualified=simulation_disqualified,
        disqualification_reason=disqualification_reason,
        reward_summary=RewardSummary(
            xp_awarded=reward_grant.xp_awarded,
            coins_awarded=reward_grant.coins_awarded,
            achievements=[
                RewardAchievement(
                    id=getattr(achievement, "id", None),
                    name=achievement.achievement_definition.name,
                    icon=achievement.achievement_definition.icon,
                )
                for achievement in reward_grant.unlocked_achievements
            ],
        ),
    )
    if settings.DRY_RUN:
        await db.rollback()
    return response_payload
