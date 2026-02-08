"""
AUTOTEST - Online Testing Platform
Main FastAPI Application
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from api.admin.router import router as admin_router
from api.analytics.admin_router import router as admin_analytics_router
from api.analytics.user_router import router as user_analytics_router
from api.attempts.router import router as attempts_router
from api.auth.router import router as auth_router
from api.payments.router import router as payments_router
from api.tests.router import router as tests_router
from api.users.router import router as users_router
from core.config import settings
from core.logging import setup_logging
from database.session import engine
from middleware.error_handler import global_exception_handler, http_exception_handler
from middleware.rate_limit import RateLimitMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException


from sqlalchemy import text

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup: Configure logging and test DB
    setup_logging()
    print("Starting AUTOTEST application...")
    
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            print("✓ Database connection successful")
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        raise
    
    yield  # Application runs here
    
    # Shutdown: Dispose engine
    print("Shutting down AUTOTEST application...")
    await engine.dispose()
    print("✓ Database engine disposed")


app = FastAPI(
    title=settings.APP_NAME,
    description="Online Testing and Diagnostic Platform",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiting Middleware
app.add_middleware(RateLimitMiddleware)

# Exception Handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Include routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(attempts_router)
app.include_router(user_analytics_router)
app.include_router(admin_analytics_router)
app.include_router(payments_router)
app.include_router(users_router)
app.include_router(tests_router)


@app.get("/health")
async def health_check():
    """Health check endpoint to verify the application is running."""
    return {"status": "ok", "env": settings.ENVIRONMENT}
