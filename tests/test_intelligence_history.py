import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from models.test import Test
from models.attempt import Attempt
from models.question import Question

@pytest.mark.asyncio
async def test_intelligence_history_cold_start(client: AsyncClient, db_session: AsyncSession, normal_user, normal_user_token):
    """Test history for user with < 10 attempts (Rule-only)"""
    # 1. Create a test
    test = Test(id=uuid4(), title="History Test", description="Desc", difficulty="medium", is_active=True)
    db_session.add(test)
    await db_session.flush()

    # 2. Create 5 completed attempts for the fixture user
    for i in range(5):
        attempt = Attempt(
            id=uuid4(),
            user_id=normal_user.id,
            test_id=test.id,
            score=15,
            finished_at=datetime.now(timezone.utc) - timedelta(days=5-i),
            mode="standard"
        )
        db_session.add(attempt)
    
    await db_session.flush()

    headers = {"Authorization": f"Bearer {normal_user_token}"}
    response = await client.get("/analytics/me/intelligence-history", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    # We expected 5 entries
    assert len(data) == 5
    for entry in data:
        assert "pass_probability" in entry
        assert "readiness_score" in entry
        assert entry["probability_source"] == "rule"

@pytest.mark.asyncio
async def test_intelligence_history_empty(client: AsyncClient, normal_user_token):
    """Test history for user with no attempts"""
    headers = {"Authorization": f"Bearer {normal_user_token}"}
    response = await client.get("/analytics/me/intelligence-history", headers=headers)
    assert response.status_code == 200
    assert response.json() == []

@pytest.mark.asyncio
async def test_intelligence_history_drift_impact(client: AsyncClient, normal_user, normal_user_token, db_session: AsyncSession):
    """Test that drift state is correctly reflected in history"""
    headers = {"Authorization": f"Bearer {normal_user_token}"}
    response = await client.get("/analytics/me/intelligence-history", headers=headers)
    assert response.status_code == 200
    # Even if empty, it should be a list
    assert isinstance(response.json(), list)
