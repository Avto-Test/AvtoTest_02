"""
AUTOTEST Limits Tests
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.answer_option import AnswerOption
from models.question import Question
from models.question_category import QuestionCategory
from models.test import Test
from tests.test_attempts import setup_test_with_questions


async def _create_question_bank(db_session: AsyncSession, *, title: str, question_count: int) -> str:
    category = QuestionCategory(name=f"{title} Category")
    test = Test(title=title, difficulty="medium", is_active=True)
    db_session.add_all([category, test])
    await db_session.flush()

    for index in range(question_count):
        question = Question(
            test_id=test.id,
            category_id=category.id,
            topic=category.name,
            category=category.name,
            text=f"{title} Q{index}",
            difficulty="medium",
            difficulty_percent=50,
            dynamic_difficulty_score=0.5,
        )
        db_session.add(question)
        await db_session.flush()
        db_session.add_all(
            [
                AnswerOption(question_id=question.id, text=f"Wrong {index}", is_correct=False),
                AnswerOption(question_id=question.id, text=f"Right {index}", is_correct=True),
            ]
        )

    await db_session.commit()
    return str(test.id)

@pytest.mark.asyncio
async def test_free_user_limit(client: AsyncClient, normal_user_token: str, admin_user_token: str, db_session: AsyncSession):
    test_id, _, _ = await setup_test_with_questions(db_session, admin_user_token, client)
    
    # Attempt 1
    r1 = await client.post("/attempts/start", json={"test_id": test_id}, headers={"Authorization": f"Bearer {normal_user_token}"})
    assert r1.status_code == 201
    
    # Attempt 2
    r2 = await client.post("/attempts/start", json={"test_id": test_id}, headers={"Authorization": f"Bearer {normal_user_token}"})
    assert r2.status_code == 201
    
    # Attempt 3
    r3 = await client.post("/attempts/start", json={"test_id": test_id}, headers={"Authorization": f"Bearer {normal_user_token}"})
    assert r3.status_code == 201
    
    # Attempt 4 (Should Fail)
    r4 = await client.post("/attempts/start", json={"test_id": test_id}, headers={"Authorization": f"Bearer {normal_user_token}"})
    assert r4.status_code == 403
    assert "limit exceeded" in r4.json()["detail"].lower()


@pytest.mark.asyncio
async def test_premium_user_unlimited(client: AsyncClient, premium_user_token: str, admin_user_token: str, db_session: AsyncSession):
    test_id, _, _ = await setup_test_with_questions(db_session, admin_user_token, client)
    
    # Try 4 times, all should succeed
    for _ in range(4):
        resp = await client.post("/attempts/start", json={"test_id": test_id}, headers={"Authorization": f"Bearer {premium_user_token}"})
        assert resp.status_code == 201


@pytest.mark.asyncio
async def test_learning_session_respects_free_user_limit(
    client: AsyncClient,
    normal_user_token: str,
    db_session: AsyncSession,
):
    await _create_question_bank(db_session, title="Learning Limit Pool", question_count=20)

    for _ in range(3):
        response = await client.post(
            "/learning/session",
            json={"question_count": 20},
            headers={"Authorization": f"Bearer {normal_user_token}"},
        )
        assert response.status_code == 201

    blocked = await client.post(
        "/learning/session",
        json={"question_count": 20},
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert blocked.status_code == 403
    assert "limit exceeded" in blocked.json()["detail"].lower()


@pytest.mark.asyncio
async def test_free_user_large_standard_tests_require_premium(
    client: AsyncClient,
    normal_user_token: str,
    db_session: AsyncSession,
):
    test_id = await _create_question_bank(db_session, title="Large Standard Pool", question_count=40)

    response = await client.post(
        "/attempts/start",
        json={"test_id": test_id, "question_count": 30},
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert response.status_code == 403
    assert "20 ta savollik" in response.json()["detail"]


@pytest.mark.asyncio
async def test_free_user_large_learning_sessions_require_premium(
    client: AsyncClient,
    normal_user_token: str,
    db_session: AsyncSession,
):
    await _create_question_bank(db_session, title="Learning Large Pool", question_count=40)

    response = await client.post(
        "/learning/session",
        json={"question_count": 30},
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert response.status_code == 403
    assert "20 ta savollik" in response.json()["detail"]


@pytest.mark.asyncio
async def test_premium_user_learning_session_honors_selected_question_count(
    client: AsyncClient,
    premium_user_token: str,
    db_session: AsyncSession,
):
    await _create_question_bank(db_session, title="Premium Learning Pool", question_count=40)

    response = await client.post(
        "/learning/session",
        json={"question_count": 30},
        headers={"Authorization": f"Bearer {premium_user_token}"},
    )
    assert response.status_code == 201
    assert response.json()["question_count"] == 30
