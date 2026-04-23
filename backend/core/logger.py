"""
AUTOTEST Centralized JSON Logger
"""

from __future__ import annotations

import atexit
import json
import logging
import sys
import traceback
from contextvars import ContextVar, Token
from datetime import date, datetime, timezone
from logging.handlers import QueueHandler, QueueListener
from queue import SimpleQueue
from typing import Any
from uuid import UUID, uuid4

from core.config import settings

REQUEST_ID_CONTEXT: ContextVar[str | None] = ContextVar("request_id", default=None)
MAX_REQUEST_ID_LENGTH = 128
REDACTED = "[REDACTED]"
SENSITIVE_KEY_PARTS = (
    "password",
    "passwd",
    "secret",
    "token",
    "authorization",
    "cookie",
    "api_key",
    "access_token",
    "refresh_token",
)
SERVICE_ROOTS = {"api", "core", "middleware", "services"}

_log_queue: SimpleQueue | None = None
_queue_listener: QueueListener | None = None


def generate_request_id() -> str:
    """Generate a stable request correlation id."""
    return f"req_{uuid4().hex}"


def normalize_request_id(request_id: str | None) -> str:
    """Normalize an incoming request id or generate a fresh one."""
    if isinstance(request_id, str):
        candidate = request_id.strip()[:MAX_REQUEST_ID_LENGTH]
        if candidate:
            return candidate
    return generate_request_id()


def set_request_id_context(request_id: str) -> Token:
    """Bind request id to the current async context."""
    return REQUEST_ID_CONTEXT.set(normalize_request_id(request_id))


def reset_request_id_context(token: Token) -> None:
    """Reset request id context after request completion."""
    REQUEST_ID_CONTEXT.reset(token)


def get_current_request_id() -> str | None:
    """Return the current request id bound to the async context."""
    return REQUEST_ID_CONTEXT.get()


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _is_sensitive_key(key: str) -> bool:
    normalized = key.strip().lower().replace("-", "_")
    return any(part in normalized for part in SENSITIVE_KEY_PARTS)


def sanitize_log_value(value: Any, *, depth: int = 0) -> Any:
    """Serialize metadata safely for logs."""
    if depth >= 5:
        return "[TRUNCATED]"
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, (UUID, date, datetime)):
        return str(value)
    if isinstance(value, BaseException):
        return repr(value)
    if isinstance(value, dict):
        sanitized: dict[str, Any] = {}
        for key, item in value.items():
            normalized_key = str(key)
            if _is_sensitive_key(normalized_key):
                sanitized[normalized_key] = REDACTED
            else:
                sanitized[normalized_key] = sanitize_log_value(item, depth=depth + 1)
        return sanitized
    if isinstance(value, (list, tuple, set, frozenset)):
        return [sanitize_log_value(item, depth=depth + 1) for item in list(value)[:100]]
    return str(value)


def _derive_service(logger_name: str) -> str:
    if not logger_name or logger_name == "root":
        return "app"

    parts = [part for part in logger_name.split(".") if part]
    if not parts:
        return "app"

    if parts[0] in SERVICE_ROOTS and len(parts) > 1:
        candidate = parts[1]
    else:
        candidate = parts[0]

    return candidate.replace("_router", "").replace("_handler", "")


class EndpointFilter(logging.Filter):
    """Filter noisy health checks from generic access logs."""

    def filter(self, record: logging.LogRecord) -> bool:
        return "/health" not in record.getMessage()


class JsonLogFormatter(logging.Formatter):
    """Render log records as AUTOTEST JSON payloads."""

    def format(self, record: logging.LogRecord) -> str:
        request_id = getattr(record, "request_id", None) or get_current_request_id() or "system"
        service = getattr(record, "service", None) or _derive_service(record.name)
        event = getattr(record, "event", None) or "log_message"
        user_id = getattr(record, "user_id", None)

        metadata_value = getattr(record, "metadata", None)
        metadata = sanitize_log_value(metadata_value if isinstance(metadata_value, dict) else {})

        message = record.getMessage()
        if message and message != event:
            metadata.setdefault("message", message)

        if record.exc_info:
            error_type = record.exc_info[0].__name__ if record.exc_info[0] else type(record.exc_info[1]).__name__
            metadata.setdefault("error_type", error_type)
            metadata.setdefault(
                "stacktrace",
                "".join(traceback.format_exception(*record.exc_info)).strip(),
            )

        payload: dict[str, Any] = {
            "timestamp": _utc_timestamp(),
            "level": record.levelname.upper(),
            "service": service,
            "event": event,
            "request_id": request_id,
            "metadata": metadata,
        }
        if user_id is not None:
            payload["user_id"] = str(user_id)

        return json.dumps(payload, ensure_ascii=True, separators=(",", ":"))


def get_logger(name: str) -> logging.Logger:
    """Compatibility helper for module-level loggers."""
    return logging.getLogger(name)


def _log_event(
    level: int,
    service: str,
    event: str,
    request_id: str,
    *,
    user_id: UUID | str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    logger = logging.getLogger(f"autotest.{service}")
    logger.log(
        level,
        event,
        extra={
            "service": service,
            "event": event,
            "request_id": normalize_request_id(request_id),
            "user_id": str(user_id) if user_id is not None else None,
            "metadata": sanitize_log_value(metadata or {}),
        },
    )


def log_info(
    service: str,
    event: str,
    request_id: str,
    user_id: UUID | str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    _log_event(logging.INFO, service, event, request_id, user_id=user_id, metadata=metadata)


def log_warning(
    service: str,
    event: str,
    request_id: str,
    user_id: UUID | str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    _log_event(logging.WARNING, service, event, request_id, user_id=user_id, metadata=metadata)


def log_error(
    service: str,
    event: str,
    request_id: str,
    user_id: UUID | str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    _log_event(logging.ERROR, service, event, request_id, user_id=user_id, metadata=metadata)


def _stop_queue_listener() -> None:
    global _queue_listener
    if _queue_listener is not None:
        _queue_listener.stop()
        _queue_listener = None


def setup_logging() -> None:
    """Configure process-wide JSON logging."""
    global _log_queue, _queue_listener

    root = logging.getLogger()
    level_name = (settings.LOG_LEVEL or "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    root.setLevel(level)

    if _queue_listener is not None:
        return

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setLevel(level)
    stream_handler.setFormatter(JsonLogFormatter())
    setattr(stream_handler, "_autotest_json_logging", True)

    _log_queue = SimpleQueue()
    queue_handler = QueueHandler(_log_queue)
    queue_handler.setLevel(level)
    setattr(queue_handler, "_autotest_json_logging", True)

    root.addHandler(queue_handler)

    _queue_listener = QueueListener(
        _log_queue,
        stream_handler,
        respect_handler_level=True,
    )
    _queue_listener.start()
    atexit.register(_stop_queue_listener)

    logging.getLogger("uvicorn.access").addFilter(EndpointFilter())
    logging.getLogger("passlib").setLevel(logging.WARNING)
