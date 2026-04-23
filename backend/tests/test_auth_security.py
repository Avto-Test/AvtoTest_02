from sqlalchemy import select

from models.refresh_session import RefreshSession


async def test_auth_me_accepts_access_token_cookie(client, normal_user):
    login_response = await client.post(
        "/auth/login",
        json={"email": normal_user.email, "password": "password123"},
    )

    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]

    client.cookies.set("access_token", access_token)
    me_response = await client.get("/auth/me")

    assert me_response.status_code == 200
    assert me_response.json()["email"] == normal_user.email


async def test_refresh_rotation_detects_reuse_and_revokes_family(client, normal_user, db_session):
    login_response = await client.post(
        "/auth/login",
        json={"email": normal_user.email, "password": "password123"},
    )

    assert login_response.status_code == 200
    login_payload = login_response.json()
    initial_refresh = login_payload["refresh_token"]

    client.cookies.set("refresh_token", initial_refresh)
    refresh_response = await client.post("/auth/refresh")

    assert refresh_response.status_code == 200
    rotated_refresh = refresh_response.json()["refresh_token"]
    assert rotated_refresh != initial_refresh

    sessions = (
        await db_session.execute(select(RefreshSession).where(RefreshSession.user_id == normal_user.id))
    ).scalars().all()
    assert len(sessions) == 2
    assert all(session.token_hash != initial_refresh for session in sessions)
    assert all(session.token_hash != rotated_refresh for session in sessions)

    client.cookies.set("refresh_token", initial_refresh)
    reuse_response = await client.post("/auth/refresh")
    assert reuse_response.status_code == 401

    client.cookies.set("refresh_token", rotated_refresh)
    revoked_family_response = await client.post("/auth/refresh")
    assert revoked_family_response.status_code == 401


async def test_logout_invalidates_refresh_token(client, normal_user):
    login_response = await client.post(
        "/auth/login",
        json={"email": normal_user.email, "password": "password123"},
    )

    assert login_response.status_code == 200
    refresh_token = login_response.json()["refresh_token"]

    client.cookies.set("refresh_token", refresh_token)
    logout_response = await client.post("/auth/logout")
    assert logout_response.status_code == 200

    refresh_response = await client.post("/auth/refresh")
    assert refresh_response.status_code == 401


async def test_logout_invalidates_access_token_session(client, normal_user):
    login_response = await client.post(
        "/auth/login",
        json={"email": normal_user.email, "password": "password123"},
    )

    assert login_response.status_code == 200
    payload = login_response.json()
    client.cookies.set("access_token", payload["access_token"])
    client.cookies.set("refresh_token", payload["refresh_token"])

    me_response = await client.get("/auth/me")
    assert me_response.status_code == 200

    logout_response = await client.post("/auth/logout")
    assert logout_response.status_code == 200

    revoked_me_response = await client.get("/auth/me")
    assert revoked_me_response.status_code == 401
