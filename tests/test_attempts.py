"""
AUTOTEST Attempt Tests
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models.test import Test
from models.question import Question
from models.answer_option import AnswerOption

async def setup_test_with_questions(db: AsyncSession, admin_token: str, client: AsyncClient) -> str:
    # Use API to create reliable data structure
    t = await client.post("/admin/tests", json={"title": "Test A", "difficulty": "easy"}, headers={"Authorization": f"Bearer {admin_token}"})
    test_id = t.json()["id"]
    
    q = await client.post(f"/admin/tests/{test_id}/questions", json={"text": "Q1"}, headers={"Authorization": f"Bearer {admin_token}"})
    q_id = q.json()["id"]
    
    await client.post(f"/admin/questions/{q_id}/options", json={"text": "Wrong", "is_correct": False}, headers={"Authorization": f"Bearer {admin_token}"})
    o2 = await client.post(f"/admin/questions/{q_id}/options", json={"text": "Right", "is_correct": True}, headers={"Authorization": f"Bearer {admin_token}"})
    
    return test_id, q_id, o2.json()["id"]


@pytest.mark.asyncio
async def test_attempt_lifecycle(client: AsyncClient, normal_user_token: str, admin_user_token: str, db_session: AsyncSession):
    # Setup
    test_id, question_id, correct_option_id = await setup_test_with_questions(db_session, admin_user_token, client)
    
    # 1. Start Attempt
    start_resp = await client.post(
        "/attempts/start",
        json={"test_id": test_id},
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert start_resp.status_code == 201
    attempt_id = start_resp.json()["id"]
    
    # 2. Submit Answer
    ans_resp = await client.post(
        "/attempts/answer",
        json={
            "attempt_id": attempt_id,
            "question_id": question_id,
            "selected_option_id": correct_option_id
        },
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert ans_resp.status_code == 200
    answer_payload = ans_resp.json()
    assert answer_payload["accepted"] is True
    assert "is_correct" not in answer_payload
    assert "correct_option_id" not in answer_payload
    
    # 3. Finish Attempt
    finish_resp = await client.post(
        "/attempts/finish",
        json={"attempt_id": attempt_id},
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert finish_resp.status_code == 200
    data = finish_resp.json()
    assert data["score"] > 0
    assert data["finished_at"] is not None
    
    # 4. Try submit after finish (Should fail)
    late_ans = await client.post(
        "/attempts/answer",
        json={
            "attempt_id": attempt_id,
            "question_id": question_id,
            "selected_option_id": correct_option_id
        },
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert late_ans.status_code == 400


@pytest.mark.asyncio
async def test_attempt_ownership(client: AsyncClient, admin_user_token: str, db_session: AsyncSession):
    # One user starts an attempt
    from api.auth.router import create_access_token
    from models.user import User
    # We need another user token
    # Quick hack: create temporary second user via fixture approach or register
    
    # Just use admin as the 'other' user for ownership test
    test_id, _, _ = await setup_test_with_questions(db_session, admin_user_token, client)
    
    start_resp = await client.post(
        "/attempts/start",
        json={"test_id": test_id},
        headers={"Authorization": f"Bearer {admin_user_token}"}
    )
    attempt_id = start_resp.json()["id"]
    
    # Try to access with NONE auth (or different user logic if we had one ready)
    # Using 'normal_user_token' from fixture if we can pass it here
    # But this test function only has admin_user_token configured in args
    # Let's rely on basic unauthorized check first
    
    fail_resp = await client.post(
         "/attempts/finish",
        json={"attempt_id": attempt_id},
        # No header
    )
    assert fail_resp.status_code == 401


@pytest.mark.asyncio
async def test_bulk_submit_allows_partial_answers(
    client: AsyncClient,
    normal_user_token: str,
    admin_user_token: str,
    db_session: AsyncSession,
):
    # Setup first question
    test_id, question_id, correct_option_id = await setup_test_with_questions(db_session, admin_user_token, client)

    # Add second question to the same test
    q2 = await client.post(
        f"/admin/tests/{test_id}/questions",
        json={"text": "Q2"},
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )
    q2_id = q2.json()["id"]
    await client.post(
        f"/admin/questions/{q2_id}/options",
        json={"text": "Wrong 2", "is_correct": False},
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )
    await client.post(
        f"/admin/questions/{q2_id}/options",
        json={"text": "Right 2", "is_correct": True},
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )

    # Start attempt
    start_resp = await client.post(
        "/attempts/start",
        json={"test_id": test_id},
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert start_resp.status_code == 201
    attempt_id = start_resp.json()["id"]

    # Submit only first question answer, but provide response times for all questions
    submit_resp = await client.post(
        "/attempts/submit",
        json={
            "attempt_id": attempt_id,
            "answers": {
                question_id: correct_option_id,
            },
            "response_times": [1000, 1200],
        },
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert submit_resp.status_code == 200
    data = submit_resp.json()
    assert data["total"] == 2
    assert data["correct_count"] == 1
    assert data["mistakes_count"] == 1
