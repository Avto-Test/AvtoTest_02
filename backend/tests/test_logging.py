"""
AUTOTEST Centralized Logging Tests
"""

from __future__ import annotations

import io
import json
import logging

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.logger import JsonLogFormatter
from models.promo_code import PromoCode


def test_json_log_formatter_outputs_required_fields() -> None:
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonLogFormatter())

    logger = logging.getLogger("tests.logging.format")
    original_handlers = list(logger.handlers)
    original_level = logger.level
    original_propagate = logger.propagate

    logger.handlers = [handler]
    logger.setLevel(logging.INFO)
    logger.propagate = False

    try:
        logger.info(
            "promo applied",
            extra={
                "service": "payments",
                "event": "promo_applied",
                "request_id": "req_test_logging",
                "user_id": "user-123",
                "metadata": {
                    "promo_code": "ABC123",
                    "access_token": "secret-token",
                },
            },
        )
    finally:
        logger.handlers = original_handlers
        logger.setLevel(original_level)
        logger.propagate = original_propagate

    payload = json.loads(stream.getvalue().strip())
    assert payload["timestamp"]
    assert payload["level"] == "INFO"
    assert payload["service"] == "payments"
    assert payload["event"] == "promo_applied"
    assert payload["request_id"] == "req_test_logging"
    assert payload["user_id"] == "user-123"
    assert payload["metadata"]["promo_code"] == "ABC123"
    assert payload["metadata"]["access_token"] == "[REDACTED]"


@pytest.mark.asyncio
async def test_request_id_is_generated_for_http_responses(
    client: AsyncClient,
) -> None:
    response = await client.get("/health")

    assert response.status_code == 200
    request_id = response.headers.get("X-Request-ID")
    assert isinstance(request_id, str)
    assert request_id
    assert request_id.startswith("req_")


@pytest.mark.asyncio
async def test_promocode_application_emits_structured_log(
    client: AsyncClient,
    db_session: AsyncSession,
    normal_user,
    normal_user_token: str,
    caplog: pytest.LogCaptureFixture,
) -> None:
    promo = PromoCode(
        code="LOG123",
        discount_type="percent",
        discount_value=20,
        is_active=True,
        max_uses=5,
    )
    db_session.add(promo)
    await db_session.commit()

    caplog.clear()
    with caplog.at_level(logging.INFO):
        response = await client.post(
            "/api/promocode/apply",
            json={"code": "LOG123"},
            headers={"Authorization": f"Bearer {normal_user_token}"},
        )

    assert response.status_code == 200
    matching_records = [record for record in caplog.records if getattr(record, "event", None) == "promo_applied"]
    assert matching_records

    record = matching_records[-1]
    assert getattr(record, "service", None) == "promocode"
    assert getattr(record, "request_id", None) == response.headers["X-Request-ID"]
    assert getattr(record, "user_id", None) == str(normal_user.id)
    assert record.metadata["promo_code"] == "LOG123"
    assert record.metadata["school_id"] is None
    assert record.metadata["group_id"] is None


@pytest.mark.asyncio
async def test_rbac_denial_emits_structured_log(
    client: AsyncClient,
    normal_user_token: str,
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.clear()
    with caplog.at_level(logging.WARNING):
        response = await client.get(
            "/admin/users",
            headers={"Authorization": f"Bearer {normal_user_token}"},
        )

    assert response.status_code == 403
    matching_records = [record for record in caplog.records if getattr(record, "event", None) == "rbac_access_denied"]
    assert matching_records

    record = matching_records[-1]
    assert getattr(record, "service", None) == "rbac"
    assert getattr(record, "request_id", None) == response.headers["X-Request-ID"]
    assert record.metadata["role_required"] == "SuperAdmin"
    assert "Student" in record.metadata["user_roles"]
