from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

import tests.conftest as tc
from api.auth.router import create_access_token
from core.config import settings
from core.security import get_password_hash
from database.session import get_db
from main import app
from models.answer_option import AnswerOption
from models.attempt import Attempt
from models.attempt_answer import AttemptAnswer
from models.question import Question
from models.test import Test
from models.user import User
from models.user_question_history import UserQuestionHistory
from services.learning.question_update_logging import DRY_RUN_LOG_PATH, QUESTION_UPDATE_LOG_PATH

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS_DIR = PROJECT_ROOT / "artifacts" / "phase3"

TEST_ID = uuid.UUID("00000000-0000-0000-0000-00000000b200")
USER_ID = uuid.UUID("00000000-0000-0000-0000-00000000b201")
ATTEMPT_ID = uuid.UUID("00000000-0000-0000-0000-00000000b202")
QUESTION_CORRECT_ID = uuid.UUID("00000000-0000-0000-0000-00000000b203")
QUESTION_WRONG_ID = uuid.UUID("00000000-0000-0000-0000-00000000b204")
OPTION_CORRECT_WRONG_ID = uuid.UUID("00000000-0000-0000-0000-00000000b205")
OPTION_CORRECT_RIGHT_ID = uuid.UUID("00000000-0000-0000-0000-00000000b206")
OPTION_WRONG_WRONG_ID = uuid.UUID("00000000-0000-0000-0000-00000000b207")
OPTION_WRONG_RIGHT_ID = uuid.UUID("00000000-0000-0000-0000-00000000b208")


def _write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def _write_normalized(path: Path, payload: object, mode: str) -> None:
    from scripts.compare_normalized import normalize_for_mode

    _write_json(path, normalize_for_mode(payload, mode))


async def _seed_baseline(session: AsyncSession) -> str:
    user = User(
        id=USER_ID,
        email="phase3.user@example.com",
        hashed_password=get_password_hash("password123"),
        is_verified=True,
        is_active=True,
        full_name="Phase3 User",
    )
    test = Test(
        id=TEST_ID,
        title="Phase3 Single Writer Test",
        difficulty="medium",
        is_active=True,
        is_premium=False,
    )
    correct_question = Question(
        id=QUESTION_CORRECT_ID,
        test_id=TEST_ID,
        text="Phase3 Correct",
        difficulty="medium",
        difficulty_percent=50,
        total_attempts=0,
        total_correct=0,
        dynamic_difficulty_score=0.5,
    )
    wrong_question = Question(
        id=QUESTION_WRONG_ID,
        test_id=TEST_ID,
        text="Phase3 Wrong",
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

    session.add_all([user, test, correct_question, wrong_question, attempt, *options])
    await session.commit()
    return create_access_token(USER_ID)


async def _export_question_snapshot(session: AsyncSession, path: Path) -> list[dict[str, object]]:
    rows = (
        await session.execute(
            select(Question)
            .where(Question.id.in_([QUESTION_CORRECT_ID, QUESTION_WRONG_ID]))
            .order_by(Question.id.asc())
        )
    ).scalars().all()
    payload = [
        {
            "question_id": str(row.id),
            "total_attempts": int(row.total_attempts or 0),
            "total_correct": int(row.total_correct or 0),
            "dynamic_difficulty_score": round(float(row.dynamic_difficulty_score or 0.0), 6),
        }
        for row in rows
    ]
    _write_json(path, payload)
    return payload


async def _run_submit_flow(
    *,
    use_progress_tracking_only: bool,
    dry_run: bool,
    enable_comparison_logging: bool,
    snapshot_filename: str,
) -> tuple[dict[str, object], list[dict[str, object]]]:
    await tc._reset_test_schema()
    async with tc.TestingSessionLocal() as session:
        token = await _seed_baseline(session)

        async def override_get_db():
            yield session

        app.dependency_overrides[get_db] = override_get_db
        previous_use_progress_tracking_only = settings.USE_PROGRESS_TRACKING_ONLY
        previous_dry_run = settings.DRY_RUN
        previous_log_comparison = settings.LOG_QUESTION_UPDATE_COMPARISON
        settings.USE_PROGRESS_TRACKING_ONLY = use_progress_tracking_only
        settings.DRY_RUN = dry_run
        settings.LOG_QUESTION_UPDATE_COMPARISON = enable_comparison_logging
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                submit_response = await client.post(
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
                assert submit_response.status_code == 200, submit_response.text
                response_payload = submit_response.json()
        finally:
            settings.USE_PROGRESS_TRACKING_ONLY = previous_use_progress_tracking_only
            settings.DRY_RUN = previous_dry_run
            settings.LOG_QUESTION_UPDATE_COMPARISON = previous_log_comparison
            app.dependency_overrides.clear()

    async with tc.TestingSessionLocal() as snapshot_session:
        snapshot_payload = await _export_question_snapshot(
            snapshot_session,
            ARTIFACTS_DIR / snapshot_filename,
        )
    await tc._reset_test_schema()
    return response_payload, snapshot_payload


EXPECTED_CANONICAL_SNAPSHOT = [
    {
        "question_id": str(QUESTION_CORRECT_ID),
        "total_attempts": 1,
        "total_correct": 1,
        "dynamic_difficulty_score": 0.0,
    },
    {
        "question_id": str(QUESTION_WRONG_ID),
        "total_attempts": 1,
        "total_correct": 0,
        "dynamic_difficulty_score": 1.0,
    },
]


@pytest.mark.asyncio
async def test_single_question_update_flag_enables_canonical_single_write() -> None:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    response_on, snapshot_on = await _run_submit_flow(
        use_progress_tracking_only=True,
        dry_run=False,
        enable_comparison_logging=False,
        snapshot_filename="db_flag_on.json",
    )
    _write_normalized(
        ARTIFACTS_DIR / "response_flag_on.normalized.json",
        response_on,
        "api_phase3_attempt_submit",
    )

    answer_map = {
        answer["question_id"]: answer
        for answer in response_on["answers"]
    }
    assert response_on["correct_count"] == 1
    assert response_on["mistakes_count"] == 1
    assert answer_map[str(QUESTION_CORRECT_ID)]["is_correct"] is True
    assert answer_map[str(QUESTION_CORRECT_ID)]["dynamic_difficulty_score"] == 0.0
    assert answer_map[str(QUESTION_WRONG_ID)]["is_correct"] is False
    assert answer_map[str(QUESTION_WRONG_ID)]["dynamic_difficulty_score"] == 1.0
    assert snapshot_on == EXPECTED_CANONICAL_SNAPSHOT


@pytest.mark.asyncio
async def test_single_question_update_flag_dry_run_rolls_back() -> None:
    if QUESTION_UPDATE_LOG_PATH.exists():
        QUESTION_UPDATE_LOG_PATH.unlink()
    if DRY_RUN_LOG_PATH.exists():
        DRY_RUN_LOG_PATH.unlink()

    response_payload, snapshot_payload = await _run_submit_flow(
        use_progress_tracking_only=True,
        dry_run=True,
        enable_comparison_logging=True,
        snapshot_filename="db_flag_on_dry_run.json",
    )

    assert response_payload["correct_count"] == 1
    assert response_payload["answers"]
    assert DRY_RUN_LOG_PATH.exists(), "Expected dry-run log output."
    assert QUESTION_UPDATE_LOG_PATH.exists(), "Expected comparison log output during dry-run."

    snapshot_by_question = {row["question_id"]: row for row in snapshot_payload}
    assert snapshot_by_question[str(QUESTION_CORRECT_ID)]["total_attempts"] == 0
    assert snapshot_by_question[str(QUESTION_CORRECT_ID)]["total_correct"] == 0
    assert snapshot_by_question[str(QUESTION_CORRECT_ID)]["dynamic_difficulty_score"] == 0.5
    assert snapshot_by_question[str(QUESTION_WRONG_ID)]["total_attempts"] == 0
    assert snapshot_by_question[str(QUESTION_WRONG_ID)]["total_correct"] == 0
    assert snapshot_by_question[str(QUESTION_WRONG_ID)]["dynamic_difficulty_score"] == 0.5

    async with tc.TestingSessionLocal() as session:
        attempt_answer_count = int(
            (
                await session.execute(
                    select(func.count(AttemptAnswer.id)).where(AttemptAnswer.attempt_id == ATTEMPT_ID)
                )
            ).scalar_one()
            or 0
        )
        question_history_count = int(
            (
                await session.execute(
                    select(func.count(UserQuestionHistory.question_id)).where(
                        UserQuestionHistory.user_id == USER_ID
                    )
                )
            ).scalar_one()
            or 0
        )

    assert attempt_answer_count == 0
    assert question_history_count == 0
