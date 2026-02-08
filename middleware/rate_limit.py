"""
AUTOTEST Rate Limiting Middleware
Simple in-memory rate limiting for auth endpoints
"""

import time
from collections import defaultdict

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from core.logging import get_logger

logger = get_logger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    In-memory rate limiting middleware.
    Applies strict limits to auth endpoints (login, register, verify).
    """
    
    def __init__(self, app, requests_per_minute: int = 5):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        # Dictionary to store request timestamps: data[ip] = [timestamp1, timestamp2, ...]
        self.request_history: dict[str, list[float]] = defaultdict(list)
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """
        Process request and enforce rate limits on sensitive endpoints.
        """
        path = request.url.path
        
        # Only rate limit auth endpoints
        if path.startswith("/auth/"):
            client_ip = request.client.host if request.client else "unknown"
            now = time.time()
            
            # Clean up old requests (older than 1 minute)
            self.request_history[client_ip] = [
                ts for ts in self.request_history[client_ip]
                if now - ts < 60
            ]
            
            # Check limit
            if len(self.request_history[client_ip]) >= self.requests_per_minute:
                logger.warning(f"Rate limit exceeded for IP: {client_ip} on {path}")
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please try again later."},
                )
            
            # Record request
            self.request_history[client_ip].append(now)
            
        return await call_next(request)
