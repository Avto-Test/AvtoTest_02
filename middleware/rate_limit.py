"""
AUTOTEST Rate Limiting Middleware
Pure ASGI implementation to avoid BaseHTTPMiddleware bugs.
"""

from __future__ import annotations

import json
import time
from collections import defaultdict
from dataclasses import dataclass

from starlette.types import ASGIApp, Receive, Scope, Send

from core.logging import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True, slots=True)
class RateLimitRule:
    bucket: str
    limit: int
    window_seconds: int = 60


class RateLimitMiddleware:
    """
    Pure ASGI rate limiting middleware.
    Applies targeted limits to auth, analytics, and exam endpoints.
    """

    def __init__(self, app: ASGIApp):
        self.app = app
        self.request_history: dict[str, list[float]] = defaultdict(list)

    def _scope_headers(self, scope: Scope) -> dict[str, str]:
        return {
            key.decode("latin-1").lower(): value.decode("latin-1")
            for key, value in scope.get("headers", [])
        }

    def _get_client_ip(self, scope: Scope) -> str:
        headers = self._scope_headers(scope)
        forwarded_for = headers.get("x-forwarded-for", "").strip()
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()[:64]

        client = scope.get("client")
        if isinstance(client, tuple) and client:
            return str(client[0])[:64]
        return "unknown"

    def _normalize_path(self, path: str) -> str:
        if path.startswith("/api/"):
            trimmed = path[4:]
            return trimmed if trimmed.startswith("/") else f"/{trimmed}"
        return path

    def _resolve_rule(self, path: str, method: str) -> RateLimitRule | None:
        normalized_path = self._normalize_path(path)
        upper_method = method.upper()

        exact_rules = {
            ("POST", "/auth/login"): RateLimitRule("auth_login", 5),
            ("POST", "/auth/register"): RateLimitRule("auth_register", 5),
            ("POST", "/auth/verify"): RateLimitRule("auth_verify", 5),
            ("POST", "/auth/resend-verification"): RateLimitRule("auth_verify", 5),
            ("POST", "/auth/forgot-password"): RateLimitRule("auth_password_reset", 5),
            ("POST", "/auth/reset-password"): RateLimitRule("auth_password_reset", 5),
            ("POST", "/auth/refresh"): RateLimitRule("auth_refresh", 20),
            ("POST", "/analytics/track"): RateLimitRule("analytics_track", 60),
            ("POST", "/attempts/start"): RateLimitRule("exam_start", 20),
            ("POST", "/attempts/guest/start"): RateLimitRule("exam_start", 20),
            ("POST", "/tests/adaptive/start"): RateLimitRule("question_load", 20),
            ("GET", "/tests/free-random"): RateLimitRule("question_load", 20),
            ("POST", "/attempts/submit"): RateLimitRule("exam_submit", 10),
            ("POST", "/attempts/finish"): RateLimitRule("exam_submit", 10),
            ("POST", "/attempts/guest/finish"): RateLimitRule("exam_submit", 10),
        }

        rule = exact_rules.get((upper_method, normalized_path))
        if rule is not None:
            return rule

        if upper_method == "GET" and normalized_path.startswith("/tests/"):
            segments = [segment for segment in normalized_path.split("/") if segment]
            if len(segments) == 2:
                return RateLimitRule("question_detail", 10)

        return None

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope["path"]
        method = scope.get("method", "GET")
        rule = self._resolve_rule(path, method)
        if rule is None:
            await self.app(scope, receive, send)
            return

        client_ip = self._get_client_ip(scope)
        now = time.time()
        history_key = f"{rule.bucket}:{client_ip}"
        self.request_history[history_key] = [
            ts for ts in self.request_history[history_key] if now - ts < rule.window_seconds
        ]

        if len(self.request_history[history_key]) >= rule.limit:
            retry_after = max(int(rule.window_seconds - (now - self.request_history[history_key][0])), 1)
            logger.warning(
                "rate_limit %s",
                json.dumps(
                    {
                        "event": "rate_limit_exceeded",
                        "bucket": rule.bucket,
                        "client_ip": client_ip,
                        "path": self._normalize_path(path),
                        "method": method.upper(),
                        "limit": rule.limit,
                        "window_seconds": rule.window_seconds,
                    },
                    sort_keys=True,
                ),
            )

            response_body = json.dumps(
                {
                    "detail": "Too many requests. Please try again later.",
                    "bucket": rule.bucket,
                }
            ).encode("utf-8")
            await send(
                {
                    "type": "http.response.start",
                    "status": 429,
                    "headers": [
                        (b"content-type", b"application/json"),
                        (b"retry-after", str(retry_after).encode("ascii")),
                    ],
                }
            )
            await send(
                {
                    "type": "http.response.body",
                    "body": response_body,
                }
            )
            return

        self.request_history[history_key].append(now)
        await self.app(scope, receive, send)
