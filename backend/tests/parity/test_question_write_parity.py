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
from models.question import Question
from models.test import Test
from models.user import User
from services.learning.question_update_logging import QUESTION_UPDATE_LOG_PATH

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS_DIR = PROJECT_ROOT / "artifacts" / "phase2"
LOG_PATH = QUESTION_UPDATE_LOG_PATH

TEST_ID = uuid.UUID("00000000-0000-0000-0000-00000000a200")
USER_ID = uuid.UUID("00000000-0000-0000-0000-00000000a201")
QUESTION_CORRECT_ID = uuid.UUID("00000000-0000-0000-0000-00000000a202")
QUESTION_WRONG_ID = uuid.UUID("00000000-0000-0000-0000-00000000a203")
OPTION_CORRECT_WRONG_ID = uuid.UUID("00000000-0000-0000-0000-00000000a204")
OPTION_CORRECT_RIGHT_ID = uuid.UUID("00000000-0000-0000-0000-00000000a205")
OPTION_WRONG_WRONG_ID = uuid.UUID("00000000-0000-0000-0000-00000000a206")
OPTION_WRONG_RIGHT_ID = uuid.UUID("00000000-0000-0000-0000-00000000a207")


def _write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


EXPECTED_SNAPSHOT = [
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


async def _seed_baseline(session: AsyncSession) -> dict[str, object]:
    user = User(
        id=USER_ID,
        email="phase2.user@example.com",
        hashed_password=get_password_hash("password123"),
        is_verified=True,
        is_active=True,
        full_name="Phase2 User",
    )
    test = Test(
        id=TEST_ID,
        title="Phase2 Parity Test",
        difficulty="medium",
        is_active=True,
        is_premium=False,
    )
    correct_question = Question(
        id=QUESTION_CORRECT_ID,
        test_id=TEST_ID,
        text="Parity Correct",
        difficulty="medium",
        difficulty_percent=50,
        total_attempts=0,
        total_correct=0,
        dynamic_difficulty_score=0.5,
    )
    wrong_question = Question(
        id=QUESTION_WRONG_ID,
        test_id=TEST_ID,
        text="Parity Wrong",
        difficulty="medium",
        difficulty_percent=50,
        total_attempts=0,
        total_correct=0,
        dynamic_difficulty_score=0.5,
    )
    options = [
        AnswerOption(id=OPTION_CORRECT_WRONG_ID, question_id=QUESTION_CORRECT_ID, text="Wrong", is_correct=False),
        AnswerOption(id=OPTION_CORRECT_RIGHT_ID, question_id=QUESTION_CORRECT_ID, text="Right", is_correct=True),
        AnswerOption(id=OPTION_WRONG_WRONG_ID, question_id=QUESTION_WRONG_ID, text="Wrong", is_correct=False),
        AnswerOption(id=OPTION_WRONG_RIGHT_ID, question_id=QUESTION_WRONG_ID, text="Right", is_correct=True),
    ]

    session.add_all([user, test, correct_question, wrong_question, *options])
    await session.commit()
    return {
        "user": user,
        "token": create_access_token(USER_ID),
    }


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


def _load_log_entries() -> list[dict[str, object]]:
    return [
        json.loads(line)
        for line in LOG_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def _expected_delta_by_question() -> dict[str, dict[str, object]]:
    return {
        str(QUESTION_CORRECT_ID): {
            "total_attempts": 1,
            "total_correct": 1,
            "dynamic_difficulty_score": -0.5,
        },
        str(QUESTION_WRONG_ID): {
            "total_attempts": 1,
            "total_correct": 0,
            "dynamic_difficulty_score": 0.5,
        },
    }


def _assert_progress_tracking_deltas(entries: list[dict[str, object]]) -> None:
    sources = {entry.get("source") for entry in entries}
    assert sources == {"progress_tracking"}, f"Unexpected sources in log: {sources}"

    expected_delta = _expected_delta_by_question()
    actual_delta = {
        entry["question_id"]: entry["delta"]
        for entry in entries
        if entry.get("source") == "progress_tracking"
    }
    assert actual_delta == expected_delta


async def _run_bulk_submit() -> None:
    await tc._reset_test_schema()
    async with tc.TestingSessionLocal() as session:
        seeded = await _seed_baseline(session)
        token = seeded["token"]

        async def override_get_db():
            yield session

        app.dependency_overrides[get_db] = override_get_db
        previous_use_progress_tracking_only = settings.USE_PROGRESS_TRACKING_ONLY
        previous_use_canonical = settings.USE_CANONICAL_ATTEMPT_FINALIZER
        previous_log_comparison = settings.LOG_QUESTION_UPDATE_COMPARISON
        settings.USE_PROGRESS_TRACKING_ONLY = True
        settings.USE_CANONICAL_ATTEMPT_FINALIZER = True
        settings.LOG_QUESTION_UPDATE_COMPARISON = True
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                start_response = await client.post(
                    "/attempts/start",
                    json={"test_id": str(TEST_ID)},
                    headers={"Authorization": f"Bearer {token}"},
                )
                assert start_response.status_code == 201, start_response.text
                attempt_id = start_response.json()["id"]

                submit_response = await client.post(
                    "/attempts/submit",
                    json={
                        "attempt_id": attempt_id,
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
        finally:
            settings.USE_PROGRESS_TRACKING_ONLY = previous_use_progress_tracking_only
            settings.USE_CANONICAL_ATTEMPT_FINALIZER = previous_use_canonical
            settings.LOG_QUESTION_UPDATE_COMPARISON = previous_log_comparison
            app.dependency_overrides.clear()

    async with tc.TestingSessionLocal() as snapshot_session:
        await _export_question_snapshot(snapshot_session, ARTIFACTS_DIR / "bulk_db_after.json")


async def _run_answer_finish() -> None:
    await tc._reset_test_schema()
    async with tc.TestingSessionLocal() as session:
        seeded = await _seed_baseline(session)
        token = seeded["token"]

        async def override_get_db():
            yield session

        app.dependency_overrides[get_db] = override_get_db
        previous_use_progress_tracking_only = settings.USE_PROGRESS_TRACKING_ONLY
        previous_use_canonical = settings.USE_CANONICAL_ATTEMPT_FINALIZER
        previous_log_comparison = settings.LOG_QUESTION_UPDATE_COMPARISON
        settings.USE_PROGRESS_TRACKING_ONLY = True
        settings.USE_CANONICAL_ATTEMPT_FINALIZER = True
        settings.LOG_QUESTION_UPDATE_COMPARISON = True
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                start_response = await client.post(
                    "/attempts/start",
                    json={"test_id": str(TEST_ID)},
                    headers={"Authorization": f"Bearer {token}"},
                )
                assert start_response.status_code == 201, start_response.text
                attempt_id = start_response.json()["id"]

                answer_one = await client.post(
                    "/attempts/answer",
                    json={
                        "attempt_id": attempt_id,
                        "question_id": str(QUESTION_CORRECT_ID),
                        "selected_option_id": str(OPTION_CORRECT_RIGHT_ID),
                    },
                    headers={"Authorization": f"Bearer {token}"},
                )
                assert answer_one.status_code == 200, answer_one.text

                answer_two = await client.post(
                    "/attempts/answer",
                    json={
                        "attempt_id": attempt_id,
                        "question_id": str(QUESTION_WRONG_ID),
                        "selected_option_id": str(OPTION_WRONG_WRONG_ID),
                    },
                    headers={"Authorization": f"Bearer {token}"},
                )
                assert answer_two.status_code == 200, answer_two.text

                finish_response = await client.post(
                    "/attempts/finish",
                    json={"attempt_id": attempt_id},
                    headers={"Authorization": f"Bearer {token}"},
                )
                assert finish_response.status_code == 200, finish_response.text
        finally:
            settings.USE_PROGRESS_TRACKING_ONLY = previous_use_progress_tracking_only
            settings.USE_CANONICAL_ATTEMPT_FINALIZER = previous_use_canonical
            settings.LOG_QUESTION_UPDATE_COMPARISON = previous_log_comparison
            app.dependency_overrides.clear()

    async with tc.TestingSessionLocal() as snapshot_session:
        await _export_question_snapshot(snapshot_session, ARTIFACTS_DIR / "legacy_db_after.json")


@pytest.mark.asyncio
async def test_question_write_parity() -> None:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    if LOG_PATH.exists():
        LOG_PATH.unlink()

    await _run_bulk_submit()
    assert LOG_PATH.exists(), "Expected logs/question_update_compare.jsonl to be created for bulk submit."
    bulk_log_entries = _load_log_entries()
    _assert_progress_tracking_deltas(bulk_log_entries)
    async with tc.TestingSessionLocal() as session:
        bulk_snapshot = await _export_question_snapshot(session, ARTIFACTS_DIR / "bulk_db_after.json")
    assert bulk_snapshot == EXPECTED_SNAPSHOT

    LOG_PATH.unlink()
    await _run_answer_finish()
    assert LOG_PATH.exists(), "Expected logs/question_update_compare.jsonl to be created for answer/finish."
    legacy_log_entries = _load_log_entries()
    _assert_progress_tracking_deltas(legacy_log_entries)
    async with tc.TestingSessionLocal() as session:
        legacy_snapshot = await _export_question_snapshot(session, ARTIFACTS_DIR / "legacy_db_after.json")
    assert legacy_snapshot == EXPECTED_SNAPSHOT

    compare_result = subprocess.run(
        [
            sys.executable,
            "scripts/compare_normalized.py",
            "artifacts/phase2/bulk_db_after.json",
            "artifacts/phase2/legacy_db_after.json",
            "--mode",
            "db_phase2_question_aggregates",
        ],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
    )

    if compare_result.returncode != 0:
        pytest.fail(
            "DB snapshot mismatch:\n"
            + "\n".join(
                part for part in [compare_result.stdout.strip(), compare_result.stderr.strip()] if part
            )
        )
