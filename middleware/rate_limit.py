"""
AUTOTEST Rate Limiting Middleware
Pure ASGI implementation to avoid BaseHTTPMiddleware bugs
"""

import time
import json
from collections import defaultdict
from starlette.types import ASGIApp, Receive, Scope, Send

from core.logging import get_logger

logger = get_logger(__name__)

class RateLimitMiddleware:
    """
    Pure ASGI rate limiting middleware.
    Applies strict limits to auth endpoints.
    """
    def __init__(self, app: ASGIApp, requests_per_minute: int = 5):
        self.app = app
        self.requests_per_minute = requests_per_minute
        self.request_history: dict[str, list[float]] = defaultdict(list)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope["path"]
        if path.startswith("/auth/"):
            # Get client IP from headers or scope
            client_ip = "unknown"
            for host, port in [scope.get("client", [])]:
                client_ip = host
                break
                
            now = time.time()
            self.request_history[client_ip] = [
                ts for ts in self.request_history[client_ip]
                if now - ts < 60
            ]

            if len(self.request_history[client_ip]) >= self.requests_per_minute:
                logger.warning(f"Rate limit exceeded for IP: {client_ip} on {path}")
                
                # Construct 429 response
                response_body = json.dumps({"detail": "Too many requests. Please try again later."}).encode("utf-8")
                await send({
                    "type": "http.response.start",
                    "status": 429,
                    "headers": [
                        (b"content-type", b"application/json"),
                    ]
                })
                await send({
                    "type": "http.response.body",
                    "body": response_body,
                })
                return

            self.request_history[client_ip].append(now)

        await self.app(scope, receive, send)
