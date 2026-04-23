from __future__ import annotations

import json
import subprocess
import sys
import uuid
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import tests.conftest as tc
from api.auth.router import create_access_token
from core.config import settings
from core.security import get_password_hash
from database.session import get_db
from main import app
from models.answer_option import AnswerOption
from models.attempt import Attempt
from models.question import Question
from models.question_category import QuestionCategory
from models.review_queue import ReviewQueue
from models.test import Test
from models.user import User
from models.user_question_history import UserQuestionHistory
from models.user_topic_stats import UserTopicStats
from scripts.compare_normalized import normalize_for_mode

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS_DIR = PROJECT_ROOT / "artifacts" / "phase4"

TEST_ID = uuid.UUID("00000000-0000-0000-0000-00000000c200")
USER_ID = uuid.UUID("00000000-0000-0000-0000-00000000c201")
ATTEMPT_ID = uuid.UUID("00000000-0000-0000-0000-00000000c202")
CATEGORY_ID = uuid.UUID("00000000-0000-0000-0000-00000000c203")
QUESTION_CORRECT_ID = uuid.UUID("00000000-0000-0000-0000-00000000c204")
QUESTION_WRONG_ID = uuid.UUID("00000000-0000-0000-0000-00000000c205")
OPTION_CORRECT_WRONG_ID = uuid.UUID("00000000-0000-0000-0000-00000000c206")
OPTION_CORRECT_RIGHT_ID = uuid.UUID("00000000-0000-0000-0000-00000000c207")
OPTION_WRONG_WRONG_ID = uuid.UUID("00000000-0000-0000-0000-00000000c208")
OPTION_WRONG_RIGHT_ID = uuid.UUID("00000000-0000-0000-0000-00000000c209")


def _write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


async def _seed_baseline(session: AsyncSession) -> str:
    user = User(
        id=USER_ID,
        email="phase4.user@example.com",
        hashed_password=get_password_hash("password123"),
        is_verified=True,
        is_active=True,
        full_name="Phase4 User",
    )
    test = Test(
        id=TEST_ID,
        title="Phase4 Attempt Flow Test",
        difficulty="medium",
        is_active=True,
        is_premium=False,
    )
    category = QuestionCategory(id=CATEGORY_ID, name="Phase4 Topic")
    correct_question = Question(
        id=QUESTION_CORRECT_ID,
        test_id=TEST_ID,
        category_id=CATEGORY_ID,
        topic="Phase4 Topic",
        category="Phase4 Topic",
        text="Phase4 Correct",
        difficulty="medium",
        difficulty_percent=50,
        total_attempts=0,
        total_correct=0,
        dynamic_difficulty_score=0.5,
    )
    wrong_question = Question(
        id=QUESTION_WRONG_ID,
        test_id=TEST_ID,
        category_id=CATEGORY_ID,
        topic="Phase4 Topic",
        category="Phase4 Topic",
        text="Phase4 Wrong",
        difficulty="medium",
        difficulty_percent=50,
        total_attempts=0,
        total_correct=0,
        dynamic_difficulty_score=0.5,
    )
    attempt = Attempt(
        id=ATTEMPT_ID,
        user_id=USER_ID,
        test_id=TEST_ID,
        mode="standard",
        pressure_mode=False,
        pressure_score_modifier=1.0,
        question_ids=[str(QUESTION_CORRECT_ID), str(QUESTION_WRONG_ID)],
        question_count=2,
        time_limit_seconds=1500,
    )
    options = [
        AnswerOption(id=OPTION_CORRECT_WRONG_ID, question_id=QUESTION_CORRECT_ID, text="Wrong", is_correct=False),
        AnswerOption(id=OPTION_CORRECT_RIGHT_ID, question_id=QUESTION_CORRECT_ID, text="Right", is_correct=True),
        AnswerOption(id=OPTION_WRONG_WRONG_ID, question_id=QUESTION_WRONG_ID, text="Wrong", is_correct=False),
        AnswerOption(id=OPTION_WRONG_RIGHT_ID, question_id=QUESTION_WRONG_ID, text="Right", is_correct=True),
    ]

    session.add_all([user, test, category, correct_question, wrong_question, attempt, *options])
    await session.commit()
    return create_access_token(USER_ID)


async def _export_attempt_flow_snapshot(session: AsyncSession, path: Path) -> dict[str, object]:
    questions = (
        await session.execute(
            select(Question)
            .where(Question.id.in_([QUESTION_CORRECT_ID, QUESTION_WRONG_ID]))
            .order_by(Question.id.asc())
        )
    ).scalars().all()
    history_rows = (
        await session.execute(
            select(UserQuestionHistory)
            .where(UserQuestionHistory.user_id == USER_ID)
            .order_by(UserQuestionHistory.question_id.asc())
        )
    ).scalars().all()
    topic_rows = (
        await session.execute(
            select(UserTopicStats)
            .where(UserTopicStats.user_id == USER_ID)
            .order_by(UserTopicStats.topic_id.asc())
        )
    ).scalars().all()
    review_rows = (
        await session.execute(
            select(ReviewQueue)
            .where(ReviewQueue.user_id == USER_ID)
            .order_by(ReviewQueue.question_id.asc())
        )
    ).scalars().all()

    payload = {
        "questions": [
            {
                "question_id": str(row.id),
                "total_attempts": int(row.total_attempts or 0),
                "total_correct": int(row.total_correct or 0),
                "dynamic_difficulty_score": round(float(row.dynamic_difficulty_score or 0.0), 6),
            }
            for row in questions
        ],
        "user_question_history": [
            {
                "question_id": str(row.question_id),
                "user_id": str(row.user_id),
                "attempt_count": int(row.attempt_count or 0),
                "correct_count": int(row.correct_count or 0),
            }
            for row in history_rows
        ],
        "user_topic_stats": [
            {
                "topic_id": str(row.topic_id),
                "user_id": str(row.user_id),
                "total_attempts": int(row.total_attempts or 0),
                "correct_answers": int(row.correct_answers or 0),
                "wrong_answers": int(row.wrong_answers or 0),
                "accuracy_rate": round(float(row.accuracy_rate or 0.0), 6),
            }
            for row in topic_rows
        ],
        "review_queue": [
            {
                "question_id": str(row.question_id),
                "user_id": str(row.user_id),
                "interval_days": int(row.interval_days or 0),
                "last_result": row.last_result,
            }
            for row in review_rows
        ],
    }
    _write_json(path, payload)
    return payload


async def _run_bulk_submit(
    *,
    use_canonical: bool,
    artifact_response_name: str,
    artifact_db_name: str,
) -> tuple[dict[str, object], dict[str, object]]:
    await tc._reset_test_schema()
    async with tc.TestingSessionLocal() as session:
        token = await _seed_baseline(session)

        async def override_get_db():
            yield session

        app.dependency_overrides[get_db] = override_get_db
        previous_use_progress_tracking_only = settings.USE_PROGRESS_TRACKING_ONLY
        previous_use_canonical = settings.USE_CANONICAL_ATTEMPT_FINALIZER
        previous_shadow = settings.SHADOW_ATTEMPT_FLOW_COMPARE
        settings.USE_PROGRESS_TRACKING_ONLY = True
        settings.USE_CANONICAL_ATTEMPT_FINALIZER = use_canonical
        settings.SHADOW_ATTEMPT_FLOW_COMPARE = use_canonical
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post(
                    "/attempts/submit",
                    json={
                        "attempt_id": str(ATTEMPT_ID),
                        "answers": {
                            str(QUESTION_CORRECT_ID): str(OPTION_CORRECT_RIGHT_ID),
                            str(QUESTION_WRONG_ID): str(OPTION_WRONG_WRONG_ID),
                        },
                        "visited_question_ids": [str(QUESTION_CORRECT_ID), str(QUESTION_WRONG_ID)],
                        "response_times": [1200, 1200],
                    },
                    headers={"Authorization": f"Bearer {token}"},
                )
                assert response.status_code == 200, response.text
                response_payload = response.json()
        finally:
            settings.USE_PROGRESS_TRACKING_ONLY = previous_use_progress_tracking_only
            settings.USE_CANONICAL_ATTEMPT_FINALIZER = previous_use_canonical
            settings.SHADOW_ATTEMPT_FLOW_COMPARE = previous_shadow
            app.dependency_overrides.clear()

    async with tc.TestingSessionLocal() as snapshot_session:
        db_payload = await _export_attempt_flow_snapshot(snapshot_session, ARTIFACTS_DIR / artifact_db_name)

    _write_json(
        ARTIFACTS_DIR / artifact_response_name,
        normalize_for_mode(response_payload, "api_phase4_attempt_flow"),
    )
    await tc._reset_test_schema()
    return response_payload, db_payload


async def _run_answer_finish_canonical() -> dict[str, object]:
    await tc._reset_test_schema()
    async with tc.TestingSessionLocal() as session:
        token = await _seed_baseline(session)

        async def override_get_db():
            yield session

        app.dependency_overrides[get_db] = override_get_db
        previous_use_progress_tracking_only = settings.USE_PROGRESS_TRACKING_ONLY
        previous_use_canonical = settings.USE_CANONICAL_ATTEMPT_FINALIZER
        settings.USE_PROGRESS_TRACKING_ONLY = True
        settings.USE_CANONICAL_ATTEMPT_FINALIZER = True
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                answer_one = await client.post(
                    "/attempts/answer",
                    json={
                        "attempt_id": str(ATTEMPT_ID),
                        "question_id": str(QUESTION_CORRECT_ID),
                        "selected_option_id": str(OPTION_CORRECT_RIGHT_ID),
                    },
                    headers={"Authorization": f"Bearer {token}"},
                )
                assert answer_one.status_code == 200, answer_one.text

                answer_two = await client.post(
                    "/attempts/answer",
                    json={
                        "attempt_id": str(ATTEMPT_ID),
                        "question_id": str(QUESTION_WRONG_ID),
                        "selected_option_id": str(OPTION_WRONG_WRONG_ID),
                    },
                    headers={"Authorization": f"Bearer {token}"},
                )
                assert answer_two.status_code == 200, answer_two.text

                finish_response = await client.post(
                    "/attempts/finish",
                    json={"attempt_id": str(ATTEMPT_ID)},
                    headers={"Authorization": f"Bearer {token}"},
                )
                assert finish_response.status_code == 200, finish_response.text
        finally:
            settings.USE_PROGRESS_TRACKING_ONLY = previous_use_progress_tracking_only
            settings.USE_CANONICAL_ATTEMPT_FINALIZER = previous_use_canonical
            app.dependency_overrides.clear()

    async with tc.TestingSessionLocal() as snapshot_session:
        db_payload = await _export_attempt_flow_snapshot(
            snapshot_session,
            ARTIFACTS_DIR / "legacy_finish_canonical_db_after.json",
        )
    await tc._reset_test_schema()
    return db_payload


@pytest.mark.asyncio
async def test_attempt_flow_shadow() -> None:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    await _run_bulk_submit(
        use_canonical=True,
        artifact_response_name="canonical_response.normalized.json",
        artifact_db_name="canonical_db_after.json",
    )
    await _run_bulk_submit(
        use_canonical=False,
        artifact_response_name="legacy_shadow_response.normalized.json",
        artifact_db_name="legacy_shadow_db_after.json",
    )

    response_compare = subprocess.run(
        [
            sys.executable,
            "scripts/compare_normalized.py",
            "artifacts/phase4/canonical_response.normalized.json",
            "artifacts/phase4/legacy_shadow_response.normalized.json",
            "--mode",
            "api_phase4_attempt_flow",
        ],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
    )
    db_compare = subprocess.run(
        [
            sys.executable,
            "scripts/compare_normalized.py",
            "artifacts/phase4/canonical_db_after.json",
            "artifacts/phase4/legacy_shadow_db_after.json",
            "--mode",
            "db_phase4_attempt_flow",
        ],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
    )

    failures: list[str] = []
    if response_compare.returncode != 0:
        failures.append(
            "Response mismatch:\n"
            + "\n".join(part for part in [response_compare.stdout.strip(), response_compare.stderr.strip()] if part)
        )
    if db_compare.returncode != 0:
        failures.append(
            "DB mismatch:\n"
            + "\n".join(part for part in [db_compare.stdout.strip(), db_compare.stderr.strip()] if part)
        )

    if failures:
        pytest.fail("\n\n".join(failures))


@pytest.mark.asyncio
async def test_answer_finish_flow_uses_canonical_finalizer_db_state() -> None:
    await _run_bulk_submit(
        use_canonical=True,
        artifact_response_name="canonical_response.normalized.json",
        artifact_db_name="canonical_db_after.json",
    )
    finish_db_payload = await _run_answer_finish_canonical()

    canonical_db_payload = json.loads((ARTIFACTS_DIR / "canonical_db_after.json").read_text(encoding="utf-8"))
    assert normalize_for_mode(finish_db_payload, "db_phase4_attempt_flow") == normalize_for_mode(
        canonical_db_payload,
        "db_phase4_attempt_flow",
    )
