
import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models.attempt import Attempt
from sqlalchemy import select

async def setup_test_environment(client: AsyncClient, admin_token: str):
    # Create a test with default 5 questions
    return await setup_test_environment_with_count(client, admin_token, question_count=5)


async def setup_test_environment_with_count(client: AsyncClient, admin_token: str, question_count: int):
    # Create a test with configurable question count
    t = await client.post("/admin/tests", 
                          json={"title": "Cognitive Test", "difficulty": "medium"}, 
                          headers={"Authorization": f"Bearer {admin_token}"})
    test_id = t.json()["id"]
    
    question_ids = []
    correct_option_ids = []
    wrong_option_ids = []
    
    for i in range(question_count):
        q = await client.post(f"/admin/tests/{test_id}/questions", 
                              json={"text": f"Q{i}"}, 
                              headers={"Authorization": f"Bearer {admin_token}"})
        q_id = q.json()["id"]
        question_ids.append(q_id)

        # Add an incorrect option
        wrong = await client.post(
            f"/admin/questions/{q_id}/options",
            json={"text": "Wrong", "is_correct": False},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        wrong_option_ids.append(wrong.json()["id"])

        # Add a correct option
        o = await client.post(f"/admin/questions/{q_id}/options", 
                              json={"text": "Correct", "is_correct": True}, 
                              headers={"Authorization": f"Bearer {admin_token}"})
        correct_option_ids.append(o.json()["id"])
        
    return test_id, question_ids, correct_option_ids, wrong_option_ids

@pytest.mark.asyncio
async def test_pressure_mode_scoring_and_limit(client: AsyncClient, normal_user_token: str, admin_user_token: str):
    test_id, question_ids, option_ids, wrong_option_ids = await setup_test_environment(client, admin_user_token)
    
    # Start attempt in pressure mode
    start_resp = await client.post(
        "/attempts/start",
        json={"test_id": test_id, "pressure_mode": True},
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert start_resp.status_code == 201
    attempt_id = start_resp.json()["id"]
    
    # Submit 5 answers (4 correct, 1 wrong)
    # Mistakes: 1. In pressure mode, 1 mistake is allowed (limit=1).
    answers = {str(question_ids[i]): str(option_ids[i]) for i in range(4)}
    # Add one wrong answer (use the option from another question to ensure it exists in DB but is wrong)
    answers[str(question_ids[4])] = str(wrong_option_ids[4])
    
    response_times = [1000, 1100, 1050, 1200, 1150]
    
    submit_resp = await client.post(
        "/attempts/submit",
        json={
            "attempt_id": attempt_id,
            "answers": answers,
            "response_times": response_times
        },
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    
    assert submit_resp.status_code == 200
    data = submit_resp.json()
    
    # 4 correct * 0.85 (modifier) = 3.4 -> rounded or cast to int? 
    # The code says: attempt.score = int(correct_count * attempt.pressure_score_modifier)
    # 4 * 0.85 = 3.4 -> 3
    assert data["score"] == 3
    assert data["passed"] is True # 1 mistake allowed in pressure mode
    assert data["pressure_mode"] is True

@pytest.mark.asyncio
async def test_cognitive_profile_derivation(client: AsyncClient, normal_user_token: str, admin_user_token: str):
    test_id, question_ids, option_ids, _ = await setup_test_environment(client, admin_user_token)
    
    # Case 1: Stable-Fast (Low variance, low avg time)
    start_resp = await client.post(
        "/attempts/start",
        json={"test_id": test_id},
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    attempt_id = start_resp.json()["id"]
    
    answers = {question_ids[i]: option_ids[i] for i in range(5)}
    # Very stable response times (all 1000ms)
    response_times = [1000, 1000, 1000, 1000, 1000]
    
    submit_resp = await client.post(
        "/attempts/submit",
        json={
            "attempt_id": attempt_id,
            "answers": answers,
            "response_times": response_times
        },
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    
    assert submit_resp.status_code == 200
    assert submit_resp.json()["cognitive_profile"] == "Stable-Fast"

    # Case 2: Unstable (High variance)
    start_resp2 = await client.post(
        "/attempts/start",
        json={"test_id": test_id},
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    attempt_id2 = start_resp2.json()["id"]
    
    # High variance times: [1000, 5000, 1000, 6000, 1000]
    response_times2 = [1000, 5000, 1000, 6000, 1000]
    
    submit_resp2 = await client.post(
        "/attempts/submit",
        json={
            "attempt_id": attempt_id2,
            "answers": answers,
            "response_times": response_times2
        },
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    
    assert submit_resp2.status_code == 200
    assert submit_resp2.json()["cognitive_profile"] == "Unstable"

@pytest.mark.asyncio
async def test_adaptive_difficulty_adjustment(client: AsyncClient, premium_user_token: str, admin_user_token: str, db_session: AsyncSession):
    # 1. Complete an attempt to get "Stable-Fast" profile
    test_id, question_ids, option_ids, _ = await setup_test_environment_with_count(
        client,
        admin_user_token,
        question_count=25,
    )
    
    start_resp = await client.post(
        "/attempts/start",
        json={"test_id": test_id},
        headers={"Authorization": f"Bearer {premium_user_token}"}
    )
    attempt_id = start_resp.json()["id"]
    
    # Manually update the attempt in DB to be "adaptive" so it's picked up by start_adaptive_test
    # This simulates a real adaptive test completion
    stmt = select(Attempt).where(Attempt.id == attempt_id)
    res = await db_session.execute(stmt)
    attempt = res.scalar_one()
    attempt.mode = "adaptive"
    await db_session.commit()

    answers = {question_ids[i]: option_ids[i] for i in range(5)}
    response_times = [500, 500, 500, 500, 500] # Super fast and stable
    
    await client.post(
        "/attempts/submit",
        json={
            "attempt_id": attempt_id,
            "answers": answers,
            "response_times": response_times
        },
        headers={"Authorization": f"Bearer {premium_user_token}"}
    )
    
    # 2. Start new adaptive test
    # It should now favor HARD questions (+10% increase in hard_ratio)
    # We can't easily check the internal ratio, but we can verify the API doesn't crash 
    # and the logic branch is covered.
    adaptive_resp = await client.post(
        "/tests/adaptive/start",
        headers={"Authorization": f"Bearer {premium_user_token}"}
    )
    
    assert adaptive_resp.status_code == 200
    assert "questions" in adaptive_resp.json()


@pytest.mark.asyncio
async def test_adaptive_start_requires_premium(client: AsyncClient, normal_user_token: str):
    adaptive_resp = await client.post(
        "/tests/adaptive/start",
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )

    assert adaptive_resp.status_code == 403
    assert "Premium subscription required" in adaptive_resp.json()["detail"]

@pytest.mark.asyncio
async def test_analytics_pressure_resilience(client: AsyncClient, normal_user_token: str, admin_user_token: str):
    # Complete an attempt to generate analytics
    test_id, question_ids, option_ids, _ = await setup_test_environment(client, admin_user_token)
    
    start_resp = await client.post(
        "/attempts/start",
        json={"test_id": test_id},
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    attempt_id = start_resp.json()["id"]
    
    answers = {question_ids[i]: option_ids[i] for i in range(5)}
    response_times = [1500, 1600, 1550, 1700, 1650] # Stable
    
    await client.post(
        "/attempts/submit",
        json={
            "attempt_id": attempt_id,
            "answers": answers,
            "response_times": response_times
        },
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    
    # Check dashboard
    dash_resp = await client.get(
        "/analytics/me/dashboard",
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    
    assert dash_resp.status_code == 200
    overview = dash_resp.json()["overview"]
    assert "pressure_resilience" in overview
    assert "cognitive_stability" in overview
    # Stable attempt should have high resilience (variance is low)
    assert overview["pressure_resilience"] > 0.8
