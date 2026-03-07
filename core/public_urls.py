"""
Helpers for building public-facing URLs behind reverse proxies.
"""

from __future__ import annotations

from urllib.parse import urlsplit

from fastapi import Request

from core.config import settings


def normalize_origin(value: str | None) -> str | None:
    if not value:
        return None

    parsed = urlsplit(value.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None

    return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")


def get_public_web_origin() -> str | None:
    for candidate in (
        settings.FRONTEND_SUCCESS_URL,
        settings.FRONTEND_CANCEL_URL,
    ):
        origin = normalize_origin(candidate)
        if origin:
            return origin
    return None


def resolve_public_request_origin(request: Request) -> str:
    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",", 1)[0].strip()
    forwarded_host = request.headers.get("x-forwarded-host", "").split(",", 1)[0].strip()
    host = forwarded_host or request.headers.get("host", "").split(",", 1)[0].strip()

    if forwarded_proto and host:
        origin = normalize_origin(f"{forwarded_proto}://{host}")
        if origin:
            return origin

    configured_origin = get_public_web_origin()
    if configured_origin:
        return configured_origin

    request_origin = normalize_origin(str(request.base_url))
    if request_origin:
        return request_origin

    return "http://localhost:3000"


def resolve_public_upload_url(request: Request, path: str) -> str:
    normalized_path = path if path.startswith("/") else f"/{path}"
    return f"{resolve_public_request_origin(request)}{normalized_path}"
