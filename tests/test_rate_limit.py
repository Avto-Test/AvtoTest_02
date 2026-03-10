async def test_login_rate_limit_enforced(client):
    for _ in range(5):
        response = await client.post(
            "/auth/login",
            json={"email": "missing@example.com", "password": "password123"},
        )
        assert response.status_code == 401

    blocked_response = await client.post(
        "/auth/login",
        json={"email": "missing@example.com", "password": "password123"},
    )
    assert blocked_response.status_code == 429
    assert blocked_response.json()["bucket"] == "auth_login"
