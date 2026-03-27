"""
AUTOTEST Global Error Handler
Custom exception handlers for the application
"""

import traceback

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.errors import AppError, get_request_id
from core.logger import log_error


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle standard HTTP exceptions."""
    request_id = get_request_id(request)

    if isinstance(exc, AppError):
        return JSONResponse(
            status_code=exc.status_code,
            headers={"X-Request-ID": exc.request_id},
            content={
                "error_code": exc.error_code,
                "message": exc.detail,
                "request_id": exc.request_id,
            },
        )

    content = exc.detail if isinstance(exc.detail, dict) else {"detail": exc.detail}
    return JSONResponse(
        status_code=exc.status_code,
        headers={"X-Request-ID": request_id},
        content=content,
    )


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle unhandled exceptions (500 Internal Server Error).
    Logs the error and returns a generic message.
    """
    request_id = get_request_id(request)
    log_error(
        "app",
        "unhandled_exception",
        request_id,
        metadata={
            "error_type": type(exc).__name__,
            "stacktrace": "".join(traceback.format_exception(type(exc), exc, exc.__traceback__)).strip(),
        },
    )
    
    content = {
        "detail": "Serverda ichki xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko'ring.",
        "request_id": request_id,
    }
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        headers={"X-Request-ID": request_id},
        content=content,
    )
