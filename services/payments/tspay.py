"""
TSPay merchant API provider implementation.
"""

from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import Any

import httpx

from core.config import settings
from services.payments.provider import PaymentProvider
from services.payments.types import (
    CreateCheckoutSessionRequest,
    CreateCheckoutSessionResponse,
    PaymentProviderError,
    PaymentReplayError,
    PaymentSignatureError,
    VerifiedWebhookEvent,
    utc_now,
)


def _safe_int(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(round(value))
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return None
        try:
            return int(float(value))
        except ValueError:
            return None
    return None


def _safe_datetime_from_value(value: Any) -> datetime | None:
    if value is None:
        return None

    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=timezone.utc)

    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return None
        try:
            if raw.endswith("Z"):
                raw = raw[:-1] + "+00:00"
            parsed = datetime.fromisoformat(raw)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)
        except ValueError:
            return None

    return None


def _build_signature_payload(timestamp: int, payload: bytes) -> bytes:
    return f"{timestamp}.".encode("utf-8") + payload


def _parse_signature_header(signature_header: str | None) -> tuple[int, str]:
    if signature_header is None or not signature_header.strip():
        raise PaymentSignatureError("Missing TSPay signature header.")

    header = signature_header.strip()

    # Supported canonical format: t=<unix>,v1=<hex>
    if "," in header and "=" in header:
        parts = {}
        for part in header.split(","):
            if "=" not in part:
                continue
            key, value = part.split("=", 1)
            parts[key.strip().lower()] = value.strip()

        timestamp_raw = parts.get("t") or parts.get("ts") or parts.get("timestamp")
        signature = parts.get("v1") or parts.get("sig") or parts.get("signature")

        if timestamp_raw is None or signature is None:
            raise PaymentSignatureError("Invalid TSPay signature header format.")

        try:
            timestamp = int(timestamp_raw)
        except ValueError as exc:
            raise PaymentSignatureError("Invalid TSPay signature timestamp.") from exc

        return timestamp, signature

    raise PaymentSignatureError("Unsupported TSPay signature format.")


class TSPayProvider(PaymentProvider):
    """TSPay merchant integration."""

    provider_name = "tspay"

    def __init__(self) -> None:
        self.base_url = settings.TSPAY_API_BASE_URL.rstrip("/")
        self.merchant_id = settings.TSPAY_MERCHANT_ID
        self.api_key = settings.TSPAY_API_KEY
        self.webhook_secret = settings.TSPAY_WEBHOOK_SECRET
        self.webhook_tolerance_seconds = settings.TSPAY_WEBHOOK_TOLERANCE_SECONDS
        self.create_session_path = settings.TSPAY_CREATE_SESSION_PATH
        self.request_timeout_seconds = settings.TSPAY_REQUEST_TIMEOUT_SECONDS

    async def create_checkout_session(
        self,
        payload: CreateCheckoutSessionRequest,
    ) -> CreateCheckoutSessionResponse:
        if not self.base_url or not self.merchant_id or not self.api_key:
            raise PaymentProviderError("TSPay merchant credentials are not configured.")

        request_payload: dict[str, Any] = {
            "merchant_id": self.merchant_id,
            "amount": payload.amount_cents,
            "currency": payload.currency.upper(),
            "customer": {
                "email": payload.email,
                "external_user_id": payload.user_id,
            },
            "success_url": payload.success_url,
            "cancel_url": payload.cancel_url,
            "idempotency_key": payload.idempotency_key,
            "metadata": payload.metadata,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-Merchant-Id": self.merchant_id,
        }

        timeout = httpx.Timeout(self.request_timeout_seconds)

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    f"{self.base_url}{self.create_session_path}",
                    json=request_payload,
                    headers=headers,
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = f"TSPay session creation failed: {exc.response.status_code}"
            raise PaymentProviderError(message) from exc
        except httpx.HTTPError as exc:
            raise PaymentProviderError("TSPay session request failed.") from exc

        body = response.json()
        session_id = (
            body.get("session_id")
            or body.get("id")
            or body.get("checkout_session_id")
        )
        checkout_url = body.get("checkout_url") or body.get("url")

        if not isinstance(session_id, str) or not session_id:
            raise PaymentProviderError("TSPay response missing session_id.")
        if not isinstance(checkout_url, str) or not checkout_url:
            raise PaymentProviderError("TSPay response missing checkout_url.")

        return CreateCheckoutSessionResponse(
            provider=self.provider_name,
            session_id=session_id,
            checkout_url=checkout_url,
            raw_response=body if isinstance(body, dict) else {"raw": body},
        )

    def verify_webhook(
        self,
        payload: bytes,
        signature_header: str | None,
    ) -> VerifiedWebhookEvent:
        if not self.webhook_secret:
            raise PaymentSignatureError("TSPay webhook secret is not configured.")

        timestamp, signature = _parse_signature_header(signature_header)

        now_ts = int(utc_now().timestamp())
        if abs(now_ts - timestamp) > self.webhook_tolerance_seconds:
            raise PaymentReplayError("Webhook timestamp outside tolerance window.")

        signed_payload = _build_signature_payload(timestamp, payload)
        expected_signature = hmac.new(
            self.webhook_secret.encode("utf-8"),
            signed_payload,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_signature, signature):
            raise PaymentSignatureError("TSPay webhook signature mismatch.")

        try:
            parsed = json.loads(payload.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise PaymentProviderError("Invalid TSPay webhook payload.") from exc

        if not isinstance(parsed, dict):
            raise PaymentProviderError("Invalid TSPay webhook payload shape.")

        data = parsed.get("data")
        if not isinstance(data, dict):
            data = parsed

        metadata = {}
        payload_metadata = parsed.get("metadata")
        if isinstance(payload_metadata, dict):
            metadata.update(payload_metadata)
        data_metadata = data.get("metadata")
        if isinstance(data_metadata, dict):
            metadata.update(data_metadata)

        provider_event_id = parsed.get("event_id") or parsed.get("id")
        if not isinstance(provider_event_id, str) or not provider_event_id:
            raise PaymentProviderError("Missing TSPay event identifier.")

        event_type = parsed.get("type") or parsed.get("event_type")
        if not isinstance(event_type, str) or not event_type:
            raise PaymentProviderError("Missing TSPay event type.")

        occurred_at = _safe_datetime_from_value(parsed.get("created_at"))
        if occurred_at is None:
            occurred_at = datetime.fromtimestamp(timestamp, tz=timezone.utc)

        session_id = data.get("session_id") or data.get("checkout_session_id")
        payment_id = data.get("payment_id") or data.get("id")

        user_id = metadata.get("user_id") or data.get("user_id") or parsed.get("user_id")
        if user_id is not None and not isinstance(user_id, str):
            user_id = str(user_id)

        status = data.get("status") or parsed.get("status")
        if status is not None and not isinstance(status, str):
            status = str(status)

        amount_cents = (
            _safe_int(data.get("amount_cents"))
            or _safe_int(data.get("amount"))
            or _safe_int(parsed.get("amount_cents"))
            or _safe_int(parsed.get("amount"))
        )

        currency = data.get("currency") or parsed.get("currency")
        if currency is not None and isinstance(currency, str):
            currency = currency.upper()
        elif currency is not None:
            currency = str(currency).upper()

        return VerifiedWebhookEvent(
            provider=self.provider_name,
            provider_event_id=provider_event_id,
            event_type=event_type,
            occurred_at=occurred_at,
            session_id=session_id if isinstance(session_id, str) and session_id else None,
            payment_id=payment_id if isinstance(payment_id, str) and payment_id else None,
            user_id=user_id,
            status=status,
            amount_cents=amount_cents,
            currency=currency if isinstance(currency, str) and currency else None,
            metadata=metadata,
            raw_payload=parsed,
        )
