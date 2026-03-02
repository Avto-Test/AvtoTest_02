"""
AUTOTEST Lessons Tests
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_lessons_feed_grouping_for_premium(
    client: AsyncClient,
    admin_user_token: str,
    premium_user_token: str,
):
    create_response = await client.post(
        "/admin/lessons",
        json={
            "title": "Traffic Signs 101",
            "description": "Learn basic signs",
            "content_type": "document",
            "content_url": "https://example.com/signs.pdf",
            "topic": "Signs",
            "section": "Basics",
            "is_active": True,
            "is_premium": False,
            "sort_order": 10,
        },
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )
    assert create_response.status_code == 201

    response = await client.get(
        "/lessons",
        headers={"Authorization": f"Bearer {premium_user_token}"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["is_premium_user"] is True
    assert len(payload["lessons"]) >= 1
    assert len(payload["sections"]) >= 1


@pytest.mark.asyncio
async def test_lessons_feed_for_non_premium_has_no_sections(
    client: AsyncClient,
    admin_user_token: str,
    normal_user_token: str,
):
    create_response = await client.post(
        "/admin/lessons",
        json={
            "title": "Defensive Driving Checklist",
            "content_type": "link",
            "content_url": "https://example.com/checklist",
            "topic": "Safety",
            "section": "Checklist",
            "is_active": True,
            "is_premium": False,
            "sort_order": 5,
        },
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )
    assert create_response.status_code == 201

    premium_only_response = await client.post(
        "/admin/lessons",
        json={
            "title": "Advanced Drift Recovery",
            "content_type": "video",
            "content_url": "https://example.com/drift-recovery.mp4",
            "topic": "Advanced Skills",
            "section": "Premium Lab",
            "is_active": True,
            "is_premium": True,
            "sort_order": 6,
        },
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )
    assert premium_only_response.status_code == 201

    response = await client.get(
        "/lessons",
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["is_premium_user"] is False
    assert len(payload["lessons"]) >= 1
    assert all(item["is_premium"] is False for item in payload["lessons"])
    assert payload["sections"] == []


@pytest.mark.asyncio
async def test_dashboard_recommends_lessons_for_premium_weak_topics(
    client: AsyncClient,
    admin_user_token: str,
    premium_user_token: str,
):
    # 1) Create premium lesson mapped to "Road Signs" topic.
    lesson_response = await client.post(
        "/admin/lessons",
        json={
            "title": "Road Signs Recovery Pack",
            "content_type": "document",
            "content_url": "https://example.com/road-signs-recovery.pdf",
            "topic": "Road Signs",
            "section": "Weak Area Booster",
            "is_active": True,
            "is_premium": True,
            "sort_order": 1,
        },
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )
    assert lesson_response.status_code == 201
    lesson_id = lesson_response.json()["id"]

    # 2) Create test with 6 "Road Signs" questions.
    test_response = await client.post(
        "/admin/tests",
        json={"title": "Signs Drill", "difficulty": "medium"},
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )
    assert test_response.status_code == 201
    test_id = test_response.json()["id"]

    wrong_option_ids = {}
    for idx in range(6):
        question_response = await client.post(
            f"/admin/tests/{test_id}/questions",
            json={
                "text": f"Signs question {idx}",
                "topic": "Road Signs",
                "category": "Road Signs",
                "difficulty": "medium",
            },
            headers={"Authorization": f"Bearer {admin_user_token}"},
        )
        assert question_response.status_code == 201
        question_id = question_response.json()["id"]

        wrong_option = await client.post(
            f"/admin/questions/{question_id}/options",
            json={"text": "Wrong option", "is_correct": False},
            headers={"Authorization": f"Bearer {admin_user_token}"},
        )
        assert wrong_option.status_code == 201
        wrong_option_ids[question_id] = wrong_option.json()["id"]

        correct_option = await client.post(
            f"/admin/questions/{question_id}/options",
            json={"text": "Correct option", "is_correct": True},
            headers={"Authorization": f"Bearer {admin_user_token}"},
        )
        assert correct_option.status_code == 201

    # 3) Complete attempt with all WRONG answers to force weak-topic signal.
    start_response = await client.post(
        "/attempts/start",
        json={"test_id": test_id},
        headers={"Authorization": f"Bearer {premium_user_token}"},
    )
    assert start_response.status_code == 201
    attempt_id = start_response.json()["id"]

    answers = {question_id: wrong_option_id for question_id, wrong_option_id in wrong_option_ids.items()}
    submit_response = await client.post(
        "/attempts/submit",
        json={
            "attempt_id": attempt_id,
            "answers": answers,
            "response_times": [1200, 1300, 1100, 1400, 1250, 1350],
        },
        headers={"Authorization": f"Bearer {premium_user_token}"},
    )
    assert submit_response.status_code == 200

    # 4) Dashboard should now include premium lesson recommendation.
    dashboard_response = await client.get(
        "/analytics/me/dashboard",
        headers={"Authorization": f"Bearer {premium_user_token}"},
    )
    assert dashboard_response.status_code == 200
    payload = dashboard_response.json()
    lesson_recommendations = payload.get("lesson_recommendations", [])
    assert len(lesson_recommendations) >= 1
    assert any(item["lesson_id"] == lesson_id for item in lesson_recommendations)
