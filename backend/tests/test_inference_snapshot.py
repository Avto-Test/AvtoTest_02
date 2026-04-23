import pytest
from httpx import AsyncClient
from sqlalchemy import select
from models.attempt import Attempt
from models.inference_snapshot import InferenceSnapshot
from unittest.mock import patch

@pytest.mark.asyncio
async def test_inference_snapshot_created_on_finish(client: AsyncClient, db_session, premium_user_token):
    # 1. Start an attempt
    # Need a test first
    from models.test import Test
    from models.question import Question
    from models.answer_option import AnswerOption
    
    test = Test(title="Snapshot Test", difficulty="easy")
    db_session.add(test)
    await db_session.flush()
    
    q = Question(test_id=test.id, text="Q1", topic="driving")
    db_session.add(q)
    await db_session.flush()
    
    o1 = AnswerOption(question_id=q.id, text="Correct", is_correct=True)
    db_session.add(o1)
    await db_session.commit()
    
    # Start
    resp = await client.post("/attempts/start", json={"test_id": str(test.id)}, headers={"Authorization": f"Bearer {premium_user_token}"})
    attempt_id = resp.json()["id"]
    
    # Finish via /submit
    finish_data = {
        "attempt_id": str(attempt_id),
        "answers": {str(q.id): str(o1.id)},
        "response_times": [1000] # ms
    }
    resp = await client.post("/attempts/submit", json=finish_data, headers={"Authorization": f"Bearer {premium_user_token}"})
    assert resp.status_code == 200
    
    # 2. Verify Snapshot exists
    stmt = select(InferenceSnapshot).where(InferenceSnapshot.attempt_id == attempt_id)
    res = await db_session.execute(stmt)
    snapshot = res.scalar_one_or_none()
    
    assert snapshot is not None
    assert snapshot.pass_probability >= 0
    assert snapshot.probability_source in ["ml", "rule"]
    assert snapshot.readiness_score >= 0
    assert snapshot.inference_latency_ms >= 0

@pytest.mark.asyncio
async def test_intelligence_history_uses_snapshot(client: AsyncClient, db_session, premium_user_token):
    # 1. Create an attempt and a manual snapshot with a "weird" value
    from models.test import Test
    from models.question import Question
    from models.answer_option import AnswerOption
    from datetime import datetime, timezone
    
    test = Test(title="History Snapshot Test", difficulty="easy")
    db_session.add(test)
    await db_session.flush()

    q = Question(test_id=test.id, text="Q1", topic="driving")
    db_session.add(q)
    await db_session.flush()
    o1 = AnswerOption(question_id=q.id, text="Correct", is_correct=True)
    db_session.add(o1)
    await db_session.commit()

    resp = await client.post("/attempts/start", json={"test_id": str(test.id)}, headers={"Authorization": f"Bearer {premium_user_token}"})
    assert resp.status_code == 201
    attempt_id = resp.json()["id"]
    
    # Manually finish it in DB to avoid logic re-run if we want to test "saved" value
    stmt = select(Attempt).where(Attempt.id == attempt_id)
    res = await db_session.execute(stmt)
    att = res.scalar_one()
    att.finished_at = datetime.now(timezone.utc)
    
    # Create fake snapshot
    fake_snapshot = InferenceSnapshot(
        attempt_id=attempt_id,
        pass_probability=99.9, # Distinctive value
        probability_source="manual_test",
        confidence=0.88,
        readiness_score=100.0,
        cognitive_stability=100.0,
        retention_score=1.0,
        drift_state="stable",
        model_version="test-v1",
        inference_latency_ms=5.0
    )
    db_session.add(fake_snapshot)
    await db_session.commit()
    
    # 2. Call history endpoint
    resp = await client.get("/analytics/me/intelligence-history", headers={"Authorization": f"Bearer {premium_user_token}"})
    assert resp.status_code == 200
    history = resp.json()
    
    # Find our attempt
    snap = next((h for h in history if h["attempt_id"] == str(attempt_id)), None)
    assert snap is not None
    assert snap["pass_probability"] == 99.9
    assert snap["probability_source"] == "manual_test"
    assert snap["model_version"] == "test-v1"

@pytest.mark.asyncio
async def test_snapshot_failure_does_not_break_attempt(client: AsyncClient, db_session, premium_user_token):
    from models.test import Test
    from models.question import Question
    from models.answer_option import AnswerOption
    
    test = Test(title="Failure Isolation Test", difficulty="easy")
    db_session.add(test)
    await db_session.flush()
    
    q = Question(test_id=test.id, text="Q1", topic="driving")
    db_session.add(q)
    await db_session.flush()
    
    o1 = AnswerOption(question_id=q.id, text="Correct", is_correct=True)
    db_session.add(o1)
    await db_session.commit()
    
    resp = await client.post("/attempts/start", json={"test_id": str(test.id)}, headers={"Authorization": f"Bearer {premium_user_token}"})
    attempt_id = resp.json()["id"]
    
    # Mock capture_inference_snapshot to RAIS Error
    with patch("ml.model_registry.capture_inference_snapshot", side_effect=Exception("DB Simulated Failure")):
        finish_data = {
            "attempt_id": str(attempt_id),
            "answers": {str(q.id): str(o1.id)},
            "response_times": [1000]
        }
        resp = await client.post("/attempts/submit", json=finish_data, headers={"Authorization": f"Bearer {premium_user_token}"})
        # Should still succeed
        assert resp.status_code == 200
        
    # Verify no snapshot was created
    stmt = select(InferenceSnapshot).where(InferenceSnapshot.attempt_id == attempt_id)
    res = await db_session.execute(stmt)
    snapshot = res.scalar_one_or_none()
    assert snapshot is None
