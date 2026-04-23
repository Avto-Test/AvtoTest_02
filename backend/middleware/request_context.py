"""
AUTOTEST Request Context Middleware
"""

from __future__ import annotations

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from core.errors import REQUEST_ID_HEADER
from core.logger import normalize_request_id, reset_request_id_context, set_request_id_context


class RequestContextMiddleware:
    """Attach request correlation ids to request state, logs, and response headers."""

    def __init__(self, app: ASGIApp):
        self.app = app

    def _resolve_request_id(self, scope: Scope) -> str:
        headers = {
            key.decode("latin-1").lower(): value.decode("latin-1")
            for key, value in scope.get("headers", [])
        }
        incoming_request_id = headers.get(REQUEST_ID_HEADER.lower())
        return normalize_request_id(incoming_request_id)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = self._resolve_request_id(scope)
        state = scope.setdefault("state", {})
        state["request_id"] = request_id
        token = set_request_id_context(request_id)

        async def send_with_request_id(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers[REQUEST_ID_HEADER] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        finally:
            reset_request_id_context(token)
