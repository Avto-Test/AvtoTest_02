"""
AUTOTEST Error Utilities
"""

from __future__ import annotations

from uuid import uuid4

from fastapi import HTTPException, Request, status

from core.logger import get_current_request_id, normalize_request_id

ACCESS_DENIED_ERROR_CODE = "ACCESS_DENIED"
ACCESS_DENIED_MESSAGE = "You do not have permission to access this resource"
REQUEST_ID_HEADER = "X-Request-ID"


def get_request_id(request: Request) -> str:
    """Return a stable request id for the current request."""
    request_id = getattr(request.state, "request_id", None)
    if isinstance(request_id, str) and request_id:
        return request_id

    incoming = request.headers.get(REQUEST_ID_HEADER, "").strip()
    request_id = normalize_request_id(incoming or get_current_request_id() or uuid4().hex)
    request.state.request_id = request_id
    return request_id


class AppError(HTTPException):
    """Standardized application error with request correlation."""

    def __init__(
        self,
        request: Request,
        *,
        error_code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ):
        self.error_code = error_code
        self.request_id = get_request_id(request)
        super().__init__(
            status_code=status_code,
            detail=message,
        )


class AccessDeniedError(AppError):
    """Standardized authorization failure."""

    def __init__(self, request: Request, message: str = ACCESS_DENIED_MESSAGE):
        super().__init__(
            request,
            error_code=ACCESS_DENIED_ERROR_CODE,
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
        )
