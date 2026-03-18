import pytest

from models.answer_option import AnswerOption
from models.coin_wallet import CoinWallet
from models.question import Question
from models.question_category import QuestionCategory
from models.test import Test


async def _create_question(
    db_session,
    *,
    test: Test,
    category: QuestionCategory,
    text: str,
    difficulty_percent: int = 50,
) -> tuple[Question, str]:
    question = Question(
        test_id=test.id,
        category_id=category.id,
        topic=category.name,
        category=category.name,
        text=text,
        difficulty="medium",
        difficulty_percent=difficulty_percent,
        dynamic_difficulty_score=max(0.0, min(1.0, 1 - difficulty_percent / 100)),
    )
    db_session.add(question)
    await db_session.flush()

    wrong_option = AnswerOption(question_id=question.id, text="Wrong", is_correct=False)
    right_option = AnswerOption(question_id=question.id, text="Right", is_correct=True)
    db_session.add_all([wrong_option, right_option])
    await db_session.flush()
    return question, str(wrong_option.id)


@pytest.mark.asyncio
async def test_learning_session_endpoint_honors_topic_preferences(
    client,
    db_session,
    normal_user_token,
):
    focus_category = QuestionCategory(name="Focus Topic")
    other_category = QuestionCategory(name="General Topic")
    test = Test(title="Focused Learning Pool", difficulty="medium")
    db_session.add_all([focus_category, other_category, test])
    await db_session.flush()

    for index in range(12):
        await _create_question(
            db_session,
            test=test,
            category=focus_category,
            text=f"Focus Question {index}",
            difficulty_percent=30,
        )
    for index in range(12):
        await _create_question(
            db_session,
            test=test,
            category=other_category,
            text=f"General Question {index}",
            difficulty_percent=50,
        )
    await db_session.commit()

    response = await client.post(
        "/learning/session",
        json={
            "question_count": 10,
            "topic_preferences": ["Focus Topic"],
        },
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )

    assert response.status_code == 201
    payload = response.json()
    focus_count = sum(1 for question in payload["questions"] if question["topic"] == "Focus Topic")
    assert focus_count >= 8


@pytest.mark.asyncio
async def test_simulation_fast_unlock_allows_start_without_learning_path_ready(
    client,
    db_session,
    normal_user,
    normal_user_token,
):
    category = QuestionCategory(name="Simulation Pool")
    test = Test(title="Simulation Question Bank", difficulty="medium")
    db_session.add_all([category, test])
    await db_session.flush()

    for index in range(40):
        await _create_question(
            db_session,
            test=test,
            category=category,
            text=f"Simulation Question {index}",
            difficulty_percent=50,
        )

    db_session.add(CoinWallet(user_id=normal_user.id, balance=200))
    await db_session.commit()

    unlock_response = await client.post(
        "/economy/simulation/unlock",
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert unlock_response.status_code == 200
    unlock_payload = unlock_response.json()
    assert unlock_payload["active"] is True
    assert unlock_payload["coins_spent"] == 120

    dashboard_response = await client.get(
        "/analytics/me/dashboard",
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert dashboard_response.status_code == 200
    simulation_status = dashboard_response.json()["simulation_status"]
    assert simulation_status["fast_unlock_active"] is True
    assert simulation_status["unlock_source"] == "coins"

    start_response = await client.post(
        "/simulation/start",
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert start_response.status_code == 201
    assert start_response.json()["question_count"] == 40


@pytest.mark.asyncio
async def test_dashboard_recommendation_prioritizes_repeated_mistakes(
    client,
    db_session,
    normal_user_token,
):
    category = QuestionCategory(name="Chorrahalar")
    test = Test(title="Intersection Recovery", difficulty="medium")
    db_session.add_all([category, test])
    await db_session.flush()

    wrong_options: dict[str, str] = {}
    for index in range(3):
        question, wrong_option_id = await _create_question(
            db_session,
            test=test,
            category=category,
            text=f"Intersection Question {index}",
            difficulty_percent=45,
        )
        wrong_options[str(question.id)] = wrong_option_id

    await db_session.commit()

    for _ in range(2):
        start_response = await client.post(
            "/attempts/start",
            json={"test_id": str(test.id)},
            headers={"Authorization": f"Bearer {normal_user_token}"},
        )
        assert start_response.status_code == 201
        attempt_id = start_response.json()["id"]

        submit_response = await client.post(
            "/attempts/submit",
            json={
                "attempt_id": attempt_id,
                "answers": wrong_options,
                "response_times": [1200, 1100, 1300],
            },
            headers={"Authorization": f"Bearer {normal_user_token}"},
        )
        assert submit_response.status_code == 200

    dashboard_response = await client.get(
        "/analytics/me/dashboard",
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert dashboard_response.status_code == 200
    recommendation = dashboard_response.json()["recommendation"]
    assert recommendation["kind"] == "repeated_mistake"
    assert recommendation["topic"] == "Chorrahalar"
    assert recommendation["question_count"] == 5
