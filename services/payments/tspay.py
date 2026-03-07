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
    GetTransactionStatusResponse,
    PaymentProviderError,
    PaymentEventType,
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


def _normalize_currency(value: Any, *, default: str = "UZS") -> str:
    if isinstance(value, str) and value.strip():
        return value.strip().upper()
    return default


def _to_provider_amount(amount_cents: int, currency: str | None) -> int:
    """
    Convert internal amount representation to TsPay amount.

    Internal system keeps price fields in cents/tiyin-like unit.
    TsPay expects UZS amount as integer in `amount`.
    """
    normalized_currency = _normalize_currency(currency)
    if normalized_currency == "UZS":
        return max(int(round(amount_cents / 100)), 0)
    return max(int(amount_cents), 0)


def _from_provider_amount_to_cents(amount: Any, currency: str | None) -> int | None:
    """
    Convert TsPay incoming `amount` back to internal cents representation.
    """
    parsed_amount = _safe_int(amount)
    if parsed_amount is None:
        return None
    normalized_currency = _normalize_currency(currency)
    if normalized_currency == "UZS":
        return int(parsed_amount) * 100
    return int(parsed_amount)


def _build_signature_payload(timestamp: int, payload: bytes) -> bytes:
    return f"{timestamp}.".encode("utf-8") + payload


def _pick_first_non_empty_string(*values: Any) -> str | None:
    for value in values:
        if value is None:
            continue
        normalized = str(value).strip()
        if normalized:
            return normalized
    return None


def _pick_first_non_none(*values: Any) -> Any:
    for value in values:
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        return value
    return None


def _as_mapping(value: Any) -> dict[str, Any] | None:
    if isinstance(value, dict):
        return value
    return None


def _first_mapping(*values: Any) -> dict[str, Any] | None:
    for value in values:
        mapping = _as_mapping(value)
        if mapping is not None:
            return mapping
    return None


def _iter_tspay_payload_candidates(payload: dict[str, Any]) -> tuple[dict[str, Any], ...]:
    candidates: list[dict[str, Any]] = []
    seen: set[int] = set()

    def add_candidate(value: Any) -> None:
        mapping = _as_mapping(value)
        if mapping is None:
            return
        mapping_id = id(mapping)
        if mapping_id in seen:
            return
        seen.add(mapping_id)
        candidates.append(mapping)

    add_candidate(payload)

    data_payload = _as_mapping(payload.get("data"))
    add_candidate(data_payload)

    provider_session_payload = _as_mapping(payload.get("provider_session"))
    add_candidate(provider_session_payload)

    transaction_candidates = (
        payload.get("transaction"),
        data_payload.get("transaction") if data_payload is not None else None,
        provider_session_payload.get("transaction") if provider_session_payload is not None else None,
    )
    for candidate in transaction_candidates:
        add_candidate(candidate)

    return tuple(candidates)


def _pick_first_from_candidates(
    candidates: tuple[dict[str, Any], ...],
    *keys: str,
) -> Any:
    for candidate in candidates:
        for key in keys:
            if key not in candidate:
                continue
            value = candidate.get(key)
            if value is None:
                continue
            if isinstance(value, str) and not value.strip():
                continue
            return value
    return None


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
        self.access_token = (
            settings.TSPAY_ACCESS_TOKEN
            or settings.TSPAY_MERCHANT_KEY
            or settings.TSPAY_API_KEY
        ).strip()
        self.merchant_id = settings.TSPAY_MERCHANT_ID
        self.merchant_email = settings.TSPAY_MERCHANT_EMAIL
        self.webhook_secret = settings.TSPAY_WEBHOOK_SECRET
        self.require_webhook_signature = settings.TSPAY_REQUIRE_WEBHOOK_SIGNATURE
        self.webhook_tolerance_seconds = settings.TSPAY_WEBHOOK_TOLERANCE_SECONDS
        self.create_transaction_path = (
            settings.TSPAY_CREATE_TRANSACTION_PATH
            or settings.TSPAY_CREATE_SESSION_PATH
            or "/transactions/create/"
        )
        self.transaction_status_path_template = (
            settings.TSPAY_TRANSACTION_STATUS_PATH_TEMPLATE
            or "/transactions/{cheque_id}/"
        )
        self.request_timeout_seconds = settings.TSPAY_REQUEST_TIMEOUT_SECONDS

    async def create_checkout_session(
        self,
        payload: CreateCheckoutSessionRequest,
    ) -> CreateCheckoutSessionResponse:
        if not self.base_url or not self.access_token:
            raise PaymentProviderError("TSPay access token is not configured.")

        request_payload: dict[str, Any] = {
            "amount": _to_provider_amount(payload.amount_cents, payload.currency),
            "access_token": self.access_token,
        }
        if payload.success_url:
            request_payload["redirect_url"] = payload.success_url
        if payload.metadata:
            request_payload["comment"] = (
                payload.metadata.get("comment")
                or payload.metadata.get("order_comment")
                or f"AUTOTEST subscription order {payload.idempotency_key}"
            )

        headers = {"Content-Type": "application/json"}

        timeout = httpx.Timeout(self.request_timeout_seconds)

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    f"{self.base_url}{self.create_transaction_path}",
                    json=request_payload,
                    headers=headers,
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            body_excerpt: str | None = None
            try:
                body_excerpt = exc.response.text
            except Exception:
                body_excerpt = None
            message = f"TSPay transaction create failed: {exc.response.status_code}"
            if body_excerpt:
                message = f"{message} | {body_excerpt[:240]}"
            raise PaymentProviderError(message) from exc
        except httpx.HTTPError as exc:
            raise PaymentProviderError("TSPay transaction create request failed.") from exc

        body = response.json()
        if not isinstance(body, dict):
            raise PaymentProviderError("Invalid TSPay create response.")
        status_raw = body.get("status")
        if isinstance(status_raw, str) and status_raw.lower() != "success":
            raise PaymentProviderError(
                f"TSPay create failed with status '{status_raw}'."
            )

        transaction = body.get("transaction")
        if not isinstance(transaction, dict):
            raise PaymentProviderError("TSPay response missing transaction object.")

        session_id_raw = transaction.get("id")
        checkout_url = transaction.get("url")
        if session_id_raw is None:
            raise PaymentProviderError("TSPay response missing transaction.id.")

        session_id = str(session_id_raw).strip()
        if not session_id:
            raise PaymentProviderError("TSPay response contains empty transaction.id.")
        checkout_url = _pick_first_non_empty_string(
            checkout_url,
            transaction.get("checkout_url"),
            transaction.get("payment_url"),
            transaction.get("pay_url"),
            body.get("url"),
            body.get("checkout_url"),
            body.get("payment_url"),
            body.get("pay_url"),
        )
        if checkout_url is None and "tspay.uz" in self.base_url:
            # TsPay docs/examples commonly expose this hosted payment path.
            checkout_url = f"https://tspay.uz/pay/{session_id}"
        if checkout_url is None:
            raise PaymentProviderError("TSPay response missing checkout URL.")

        return CreateCheckoutSessionResponse(
            provider=self.provider_name,
            session_id=session_id,
            checkout_url=checkout_url,
            raw_response=body if isinstance(body, dict) else {"raw": body},
        )

    async def get_transaction_status(
        self,
        cheque_id: str,
    ) -> GetTransactionStatusResponse:
        if not self.base_url or not self.access_token:
            raise PaymentProviderError("TSPay access token is not configured.")

        normalized_cheque_id = str(cheque_id).strip()
        if not normalized_cheque_id:
            raise PaymentProviderError("cheque_id is required.")

        status_path = self.transaction_status_path_template.format(
            cheque_id=normalized_cheque_id
        )
        timeout = httpx.Timeout(self.request_timeout_seconds)
        params = {"access_token": self.access_token}

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(
                    f"{self.base_url}{status_path}",
                    params=params,
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            body_excerpt: str | None = None
            try:
                body_excerpt = exc.response.text
            except Exception:
                body_excerpt = None
            message = f"TSPay status check failed: {exc.response.status_code}"
            if body_excerpt:
                message = f"{message} | {body_excerpt[:240]}"
            raise PaymentProviderError(message) from exc
        except httpx.HTTPError as exc:
            raise PaymentProviderError("TSPay status request failed.") from exc

        body = response.json()
        if not isinstance(body, dict):
            raise PaymentProviderError("Invalid TSPay status response.")

        payload_candidates = _iter_tspay_payload_candidates(body)
        currency_raw = _pick_first_from_candidates(payload_candidates, "currency")
        normalized_currency = (
            _normalize_currency(currency_raw) if currency_raw is not None else None
        )
        resolved_cheque_id = _pick_first_non_empty_string(
            _pick_first_from_candidates(payload_candidates, "cheque_id"),
            normalized_cheque_id,
        )
        resolved_transaction_id = _pick_first_non_empty_string(
            _pick_first_from_candidates(payload_candidates, "transaction_id", "id"),
        )
        resolved_status = _pick_first_non_empty_string(
            _pick_first_from_candidates(payload_candidates, "pay_status", "status"),
        )
        amount_value = _pick_first_from_candidates(payload_candidates, "amount")

        return GetTransactionStatusResponse(
            provider=self.provider_name,
            cheque_id=resolved_cheque_id or normalized_cheque_id,
            transaction_id=resolved_transaction_id,
            pay_status=resolved_status,
            amount=_from_provider_amount_to_cents(
                amount_value,
                normalized_currency,
            ),
            raw_response=body,
        )

    def verify_webhook(
        self,
        payload: bytes,
        signature_header: str | None,
    ) -> VerifiedWebhookEvent:
        signature_ts = int(utc_now().timestamp())
        if self.webhook_secret and signature_header:
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
            signature_ts = timestamp
        elif self.require_webhook_signature:
            raise PaymentSignatureError("Missing TSPay signature header.")

        try:
            parsed = json.loads(payload.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise PaymentProviderError("Invalid TSPay webhook payload.") from exc

        if not isinstance(parsed, dict):
            raise PaymentProviderError("Invalid TSPay webhook payload shape.")

        payload_candidates = _iter_tspay_payload_candidates(parsed)
        data_payload = _as_mapping(parsed.get("data"))
        provider_session_payload = _as_mapping(parsed.get("provider_session"))
        transaction_payload = _first_mapping(
            parsed.get("transaction"),
            data_payload.get("transaction") if data_payload is not None else None,
            provider_session_payload.get("transaction") if provider_session_payload is not None else None,
        )

        metadata = {}
        for candidate in reversed(payload_candidates):
            payload_metadata = candidate.get("metadata")
            if isinstance(payload_metadata, dict):
                metadata.update(payload_metadata)

        event_type_raw = _pick_first_non_empty_string(
            parsed.get("event"),
            parsed.get("type"),
            parsed.get("event_type"),
            _pick_first_from_candidates(payload_candidates, "event", "type", "event_type"),
        )
        event_type = str(event_type_raw).strip().lower() if event_type_raw is not None else ""
        status_raw = _pick_first_non_empty_string(
            parsed.get("status"),
            _pick_first_from_candidates(payload_candidates, "pay_status", "status"),
        )
        status = str(status_raw).strip().lower() if status_raw is not None else ""

        if not event_type:
            if status in {"success", "paid", "succeeded"}:
                event_type = PaymentEventType.TSPAY_PAYMENT_SUCCESS.value
            elif status in {"canceled", "cancelled"}:
                event_type = PaymentEventType.TSPAY_PAYMENT_CANCELED.value
            elif status in {"failed", "error"}:
                event_type = PaymentEventType.TSPAY_PAYMENT_FAILED.value
            else:
                raise PaymentProviderError("Missing TSPay event type.")

        transaction_identity_candidates = tuple(
            candidate
            for candidate in (transaction_payload, data_payload, provider_session_payload)
            if candidate is not None
        )
        transaction_id_raw = _pick_first_non_none(
            parsed.get("transaction_id"),
            _pick_first_from_candidates(transaction_identity_candidates, "transaction_id", "id"),
        )
        cheque_id_raw = _pick_first_non_none(
            parsed.get("cheque_id"),
            _pick_first_from_candidates(payload_candidates, "cheque_id"),
        )
        transaction_id = (
            str(transaction_id_raw).strip()
            if transaction_id_raw is not None and str(transaction_id_raw).strip()
            else None
        )
        cheque_id = (
            str(cheque_id_raw).strip()
            if cheque_id_raw is not None and str(cheque_id_raw).strip()
            else None
        )

        provider_event_id_raw = parsed.get("event_id") or parsed.get("id")
        if provider_event_id_raw is not None and str(provider_event_id_raw).strip():
            provider_event_id = str(provider_event_id_raw).strip()
        else:
            id_part = cheque_id or transaction_id or "unknown"
            timestamp_part = str(parsed.get("timestamp") or signature_ts)
            provider_event_id = f"tspay:{event_type}:{id_part}:{timestamp_part}"

        occurred_at = _safe_datetime_from_value(
            _pick_first_non_none(
                parsed.get("timestamp"),
                _pick_first_from_candidates(payload_candidates, "timestamp"),
            )
        )
        if occurred_at is None:
            occurred_at = _safe_datetime_from_value(
                _pick_first_non_none(
                    parsed.get("created_at"),
                    _pick_first_from_candidates(payload_candidates, "created_at"),
                )
            )
        if occurred_at is None:
            occurred_at = datetime.fromtimestamp(signature_ts, tz=timezone.utc)

        user_id = _pick_first_non_empty_string(
            metadata.get("user_id"),
            parsed.get("user_id"),
            _pick_first_from_candidates(payload_candidates, "user_id"),
        )
        if user_id is not None and not isinstance(user_id, str):
            user_id = str(user_id)

        if not status:
            if event_type == PaymentEventType.TSPAY_PAYMENT_SUCCESS.value:
                status = "success"
            elif event_type == PaymentEventType.TSPAY_PAYMENT_CANCELED.value:
                status = "canceled"
            elif event_type == PaymentEventType.TSPAY_PAYMENT_FAILED.value:
                status = "failed"
            else:
                status = ""

        currency = _pick_first_non_none(
            parsed.get("currency"),
            _pick_first_from_candidates(payload_candidates, "currency"),
        )
        if currency is not None and isinstance(currency, str):
            currency = currency.upper()
        elif currency is not None:
            currency = str(currency).upper()

        amount_cents = _from_provider_amount_to_cents(
            _pick_first_non_none(
                parsed.get("amount"),
                _pick_first_from_candidates(payload_candidates, "amount"),
            ),
            currency,
        )
        if amount_cents is None:
            amount_cents = _safe_int(
                _pick_first_non_none(
                    parsed.get("amount_cents"),
                    _pick_first_from_candidates(payload_candidates, "amount_cents"),
                )
            )

        if transaction_id is not None:
            metadata.setdefault("transaction_id", transaction_id)
        if cheque_id is not None:
            metadata.setdefault("cheque_id", cheque_id)
        shop_id = _pick_first_non_none(
            parsed.get("shop_id"),
            _pick_first_from_candidates(payload_candidates, "shop_id"),
        )
        if shop_id is not None:
            metadata.setdefault("shop_id", shop_id)
        comment = _pick_first_non_none(
            parsed.get("comment"),
            _pick_first_from_candidates(payload_candidates, "comment"),
        )
        if comment is not None:
            metadata.setdefault("comment", comment)

        session_id = transaction_id
        payment_id = cheque_id

        return VerifiedWebhookEvent(
            provider=self.provider_name,
            provider_event_id=provider_event_id,
            event_type=event_type,
            occurred_at=occurred_at,
            session_id=session_id,
            payment_id=payment_id,
            user_id=user_id,
            status=status or None,
            amount_cents=amount_cents,
            currency=currency if isinstance(currency, str) and currency else None,
            metadata=metadata,
            raw_payload=parsed,
        )
