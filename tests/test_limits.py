"""
AUTOTEST Limits Tests
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from tests.test_attempts import setup_test_with_questions

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
