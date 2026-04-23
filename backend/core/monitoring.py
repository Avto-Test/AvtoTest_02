"""
Monitoring and Sentry integration.

Sentry remains optional: if the SDK is unavailable or DSN is not configured,
all helper functions become safe no-ops.
"""

from __future__ import annotations

import logging
import subprocess
from contextlib import nullcontext
from functools import lru_cache
from typing import Any

from core.config import settings

try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
except ImportError:  # pragma: no cover - handled gracefully when dependency is absent
    sentry_sdk = None
    FastApiIntegration = None

logger = logging.getLogger(__name__)


def _truthy_env(value: object | None) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _git_sha() -> str | None:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None

    sha = result.stdout.strip()
    return sha or None


@lru_cache
def resolve_release_version() -> str | None:
    explicit_release = (settings.SENTRY_RELEASE or "").strip()
    if explicit_release:
        return explicit_release

    git_sha = _git_sha()
    if not git_sha:
        return None

    return f"{settings.APP_NAME.lower()}@{git_sha}"


def is_sentry_enabled() -> bool:
    return bool(sentry_sdk is not None and (settings.SENTRY_DSN or "").strip())


def init_monitoring() -> bool:
    if sentry_sdk is None:
        logger.info("Sentry SDK not installed; monitoring disabled.")
        return False

    dsn = (settings.SENTRY_DSN or "").strip()
    if not dsn:
        logger.info("SENTRY_DSN not configured; monitoring disabled.")
        return False

    if sentry_sdk.Hub.current.client is not None:
        return True

    release = resolve_release_version()
    sentry_sdk.init(
        dsn=dsn,
        environment=(settings.SENTRY_ENVIRONMENT or settings.ENVIRONMENT or "development").strip(),
        release=release,
        traces_sample_rate=float(settings.SENTRY_TRACES_SAMPLE_RATE or 0.0),
        enable_tracing=_truthy_env(settings.SENTRY_TRACES_SAMPLE_RATE)
        and float(settings.SENTRY_TRACES_SAMPLE_RATE or 0.0) > 0,
        integrations=[FastApiIntegration()] if FastApiIntegration is not None else [],
    )
    logger.info(
        "Sentry monitoring initialized for environment=%s release=%s",
        settings.SENTRY_ENVIRONMENT or settings.ENVIRONMENT,
        release or "unknown",
    )
    return True


def configure_scope(*, tags: dict[str, Any] | None = None, extras: dict[str, Any] | None = None):
    if not is_sentry_enabled():
        return nullcontext()

    scope_manager = sentry_sdk.push_scope()
    scope = scope_manager.__enter__()
    if tags:
        for key, value in tags.items():
            scope.set_tag(key, value)
    if extras:
        for key, value in extras.items():
            scope.set_extra(key, value)
    return scope_manager


def capture_exception(
    error: BaseException,
    *,
    tags: dict[str, Any] | None = None,
    extras: dict[str, Any] | None = None,
) -> None:
    if not is_sentry_enabled():
        return
    with configure_scope(tags=tags, extras=extras):
        sentry_sdk.capture_exception(error)


def capture_message(
    message: str,
    *,
    level: str = "info",
    tags: dict[str, Any] | None = None,
    extras: dict[str, Any] | None = None,
) -> None:
    if not is_sentry_enabled():
        return
    with configure_scope(tags=tags, extras=extras):
        sentry_sdk.capture_message(message, level=level)


def start_span(*, op: str, name: str, attributes: dict[str, Any] | None = None):
    if not is_sentry_enabled():
        return nullcontext()

    span = sentry_sdk.start_span(op=op, name=name)
    if attributes:
        for key, value in attributes.items():
            span.set_data(key, value)
    return span
