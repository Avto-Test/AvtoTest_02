"""
AUTOTEST Feedback Tests
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_user_can_submit_and_view_feedback(
    client: AsyncClient,
    normal_user_token: str,
):
    create_response = await client.post(
        "/feedback",
        json={
            "rating": 5,
            "category": "feature",
            "comment": "Great platform, adaptive mode is useful.",
            "suggestion": "Add more visual tutorials.",
        },
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["rating"] == 5
    assert created["status"] == "new"

    my_response = await client.get(
        "/feedback/me",
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert my_response.status_code == 200
    data = my_response.json()
    assert len(data) == 1
    assert data[0]["comment"] == "Great platform, adaptive mode is useful."


@pytest.mark.asyncio
async def test_admin_can_list_and_update_feedback(
    client: AsyncClient,
    normal_user_token: str,
    admin_user_token: str,
):
    create_response = await client.post(
        "/feedback",
        json={
            "rating": 3,
            "category": "ui",
            "comment": "Dashboard is okay but could be clearer.",
            "suggestion": "Use stronger contrast in charts.",
        },
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert create_response.status_code == 201
    feedback_id = create_response.json()["id"]

    admin_list_response = await client.get(
        "/feedback/admin",
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )
    assert admin_list_response.status_code == 200
    items = admin_list_response.json()
    assert any(item["id"] == feedback_id for item in items)

    update_response = await client.put(
        f"/feedback/admin/{feedback_id}",
        json={
            "status": "reviewed",
            "admin_note": "Queued for UX sprint planning.",
        },
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["status"] == "reviewed"
    assert updated["admin_note"] == "Queued for UX sprint planning."


@pytest.mark.asyncio
async def test_non_admin_cannot_access_admin_feedback_endpoints(
    client: AsyncClient,
    normal_user_token: str,
):
    list_response = await client.get(
        "/feedback/admin",
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert list_response.status_code == 403


@pytest.mark.asyncio
async def test_user_rating_is_locked_after_first_feedback(
    client: AsyncClient,
    normal_user_token: str,
):
    first_response = await client.post(
        "/feedback",
        json={
            "rating": 2,
            "category": "general",
            "comment": "Birinchi baho.",
            "suggestion": None,
        },
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert first_response.status_code == 201
    assert first_response.json()["rating"] == 2

    second_response = await client.post(
        "/feedback",
        json={
            "rating": 5,
            "category": "general",
            "comment": "Ikkinchi fikr, bahoni ozgartirishga urinish.",
            "suggestion": None,
        },
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert second_response.status_code == 201
    assert second_response.json()["rating"] == 2
