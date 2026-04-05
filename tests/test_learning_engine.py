from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from models.analytics_event import AnalyticsEvent
from models.answer_option import AnswerOption
from models.question import Question
from models.question_category import QuestionCategory
from models.question_difficulty import QuestionDifficulty
from models.review_queue import ReviewQueue
from models.test import Test
from models.user_question_history import UserQuestionHistory
from models.user_topic_stats import UserTopicStats
from services.learning.adaptive_engine import generate_adaptive_session
from services.learning.progress_tracking import LearningAnswerRecord, apply_learning_progress_updates
from services.learning.topic_analysis import detect_weak_topics


async def _create_question(
    db_session,
    *,
    test: Test,
    category: QuestionCategory,
    text: str,
    dynamic_difficulty_score: float = 0.5,
) -> Question:
    question = Question(
        test_id=test.id,
        category_id=category.id,
        topic=category.name,
        category=category.name,
        text=text,
        dynamic_difficulty_score=dynamic_difficulty_score,
    )
    db_session.add(question)
    await db_session.flush()
    db_session.add(AnswerOption(question_id=question.id, text="Wrong", is_correct=False))
    db_session.add(AnswerOption(question_id=question.id, text="Right", is_correct=True))
    await db_session.flush()
    return question


@pytest.mark.asyncio
async def test_weak_topic_detection(db_session, normal_user):
    weak_category = QuestionCategory(name="Weak Topic")
    strong_category = QuestionCategory(name="Strong Topic")
    db_session.add_all([weak_category, strong_category])
    await db_session.flush()

    db_session.add_all(
        [
            UserTopicStats(
                user_id=normal_user.id,
                topic_id=weak_category.id,
                total_attempts=12,
                correct_answers=6,
                wrong_answers=6,
                accuracy_rate=0.5,
            ),
            UserTopicStats(
                user_id=normal_user.id,
                topic_id=strong_category.id,
                total_attempts=12,
                correct_answers=10,
                wrong_answers=2,
                accuracy_rate=10 / 12,
            ),
        ]
    )
    await db_session.commit()

    weak_topics = await detect_weak_topics(normal_user.id, db_session)
    assert weak_topics == [weak_category.id]


@pytest.mark.asyncio
async def test_learning_progress_updates_difficulty_and_review_queue(db_session, normal_user):
    test = Test(title="Learning Test", difficulty="medium")
    category = QuestionCategory(name="Road Signs")
    db_session.add_all([test, category])
    await db_session.flush()
    question = await _create_question(db_session, test=test, category=category, text="Q1")
    await db_session.commit()

    now = datetime.now(timezone.utc)
    await apply_learning_progress_updates(
        db=db_session,
        user_id=normal_user.id,
        answer_records=[
            LearningAnswerRecord(
                question_id=question.id,
                topic_id=category.id,
                is_correct=False,
                occurred_at=now,
            )
        ],
    )
    await db_session.commit()

    difficulty = await db_session.get(QuestionDifficulty, question.id)
    assert difficulty is not None
    assert difficulty.attempts == 1
    assert difficulty.wrong_count == 1
    assert difficulty.difficulty_score == 1.0

    queue_entry = (
        await db_session.execute(
            select(ReviewQueue).where(
                ReviewQueue.user_id == normal_user.id,
                ReviewQueue.question_id == question.id,
            )
        )
    ).scalar_one()
    assert queue_entry.interval_days == 1
    assert queue_entry.last_result == "wrong"

    await apply_learning_progress_updates(
        db=db_session,
        user_id=normal_user.id,
        answer_records=[
            LearningAnswerRecord(
                question_id=question.id,
                topic_id=category.id,
                is_correct=True,
                occurred_at=now + timedelta(days=1),
            )
        ],
    )
    await db_session.commit()

    await db_session.refresh(queue_entry)
    await db_session.refresh(difficulty)
    assert difficulty.attempts == 2
    assert difficulty.correct_count == 1
    assert difficulty.difficulty_score == 0.5
    assert queue_entry.interval_days == 3
    assert queue_entry.last_result == "correct"


@pytest.mark.asyncio
async def test_generate_adaptive_session_distribution(db_session, normal_user):
    weak_category = QuestionCategory(name="Weak Topic")
    strong_category = QuestionCategory(name="General Topic")
    test = Test(title="Adaptive Pool", difficulty="medium")
    db_session.add_all([weak_category, strong_category, test])
    await db_session.flush()

    weak_questions = [
        await _create_question(db_session, test=test, category=weak_category, text=f"Weak {idx}", dynamic_difficulty_score=0.8)
        for idx in range(10)
    ]
    medium_questions = [
        await _create_question(db_session, test=test, category=strong_category, text=f"Medium {idx}", dynamic_difficulty_score=0.5)
        for idx in range(10)
    ]
    unseen_questions = [
        await _create_question(db_session, test=test, category=strong_category, text=f"Unseen {idx}", dynamic_difficulty_score=0.9)
        for idx in range(5)
    ]
    await db_session.flush()

    db_session.add(
        UserTopicStats(
            user_id=normal_user.id,
            topic_id=weak_category.id,
            total_attempts=15,
            correct_answers=7,
            wrong_answers=8,
            accuracy_rate=7 / 15,
        )
    )

    stale_seen_at = datetime.now(timezone.utc) - timedelta(days=10)
    for question in weak_questions + medium_questions:
        db_session.add(
            UserQuestionHistory(
                user_id=normal_user.id,
                question_id=question.id,
                attempt_count=3,
                correct_count=2,
                last_seen_at=stale_seen_at,
                last_correct_at=stale_seen_at,
            )
        )

    for question in weak_questions:
        db_session.add(
            QuestionDifficulty(
                question_id=question.id,
                attempts=20,
                correct_count=4,
                wrong_count=16,
                difficulty_score=0.8,
            )
        )
    for question in medium_questions:
        db_session.add(
            QuestionDifficulty(
                question_id=question.id,
                attempts=20,
                correct_count=10,
                wrong_count=10,
                difficulty_score=0.5,
            )
        )
    await db_session.commit()

    plan = await generate_adaptive_session(normal_user.id, db=db_session, question_count=10)
    selected_ids = {question.id for question in plan.questions}

    weak_selected = sum(1 for question in plan.questions if question.category_id == weak_category.id)
    medium_selected = sum(1 for question in plan.questions if question.id in {item.id for item in medium_questions})
    unseen_selected = sum(1 for question in plan.questions if question.id in {item.id for item in unseen_questions})

    assert len(plan.questions) == 10
    assert weak_category.id in plan.weak_topic_ids
    assert weak_selected >= 6
    assert medium_selected >= 3
    assert unseen_selected >= 1
    assert len(selected_ids) == 10


@pytest.mark.asyncio
async def test_generate_adaptive_session_prioritizes_due_review_items(db_session, normal_user):
    weak_category = QuestionCategory(name="Due Review Topic")
    support_category = QuestionCategory(name="Support Topic")
    test = Test(title="Due Review Pool", difficulty="medium")
    db_session.add_all([weak_category, support_category, test])
    await db_session.flush()

    due_questions = [
        await _create_question(db_session, test=test, category=weak_category, text=f"Due {idx}", dynamic_difficulty_score=0.75)
        for idx in range(4)
    ]
    filler_questions = [
        await _create_question(db_session, test=test, category=support_category, text=f"Filler {idx}", dynamic_difficulty_score=0.5)
        for idx in range(10)
    ]
    await db_session.flush()

    db_session.add(
        UserTopicStats(
            user_id=normal_user.id,
            topic_id=weak_category.id,
            total_attempts=12,
            correct_answers=5,
            wrong_answers=7,
            accuracy_rate=5 / 12,
        )
    )

    due_time = datetime.now(timezone.utc) - timedelta(days=2)
    for question in due_questions:
        db_session.add(
            UserQuestionHistory(
                user_id=normal_user.id,
                question_id=question.id,
                attempt_count=3,
                correct_count=1,
                last_seen_at=due_time - timedelta(days=3),
                last_correct_at=due_time - timedelta(days=6),
            )
        )
        db_session.add(
            ReviewQueue(
                user_id=normal_user.id,
                question_id=question.id,
                next_review_at=due_time,
                interval_days=1,
                last_result="wrong",
            )
        )

    for question in filler_questions[:5]:
        db_session.add(
            UserQuestionHistory(
                user_id=normal_user.id,
                question_id=question.id,
                attempt_count=2,
                correct_count=2,
                last_seen_at=due_time,
                last_correct_at=due_time,
            )
        )

    await db_session.commit()

    plan = await generate_adaptive_session(normal_user.id, db=db_session, question_count=8)
    due_ids = {question.id for question in due_questions}
    selected_due = [question.id for question in plan.questions if question.id in due_ids]

    assert len(plan.questions) == 8
    assert len(selected_due) >= 2
    assert weak_category.id in plan.weak_topic_ids


@pytest.mark.asyncio
async def test_learning_session_endpoint_creates_backend_controlled_session(
    client,
    db_session,
    normal_user,
    normal_user_token,
):
    weak_category = QuestionCategory(name="Priority Topic")
    test = Test(title="Learning API Pool", difficulty="medium")
    db_session.add_all([weak_category, test])
    await db_session.flush()

    for idx in range(24):
        question = await _create_question(db_session, test=test, category=weak_category, text=f"API Question {idx}", dynamic_difficulty_score=0.7)
        db_session.add(
            QuestionDifficulty(
                question_id=question.id,
                attempts=15,
                correct_count=5,
                wrong_count=10,
                difficulty_score=10 / 15,
            )
        )

    db_session.add(
        UserTopicStats(
            user_id=normal_user.id,
            topic_id=weak_category.id,
            total_attempts=12,
            correct_answers=5,
            wrong_answers=7,
            accuracy_rate=5 / 12,
        )
    )
    await db_session.commit()

    response = await client.post(
        "/learning/session",
        json={"question_count": 20},
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["session_id"]
    assert payload["question_count"] == 20
    assert payload["duration_minutes"] >= 25
    assert len(payload["questions"]) == 20
    assert all("is_correct" not in question for question in payload["questions"])
    assert all("correct_option_id" not in question for question in payload["questions"])

    events = (
        await db_session.execute(
            select(AnalyticsEvent.event_name).where(AnalyticsEvent.user_id == normal_user.id)
        )
    ).scalars().all()
    assert "learning_session_started" in events
    assert "weak_topic_detected" in events
