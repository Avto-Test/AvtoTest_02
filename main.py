"""
AUTOTEST - Online Testing Platform
Main FastAPI Application
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from api.admin.router import router as admin_router
from api.analytics.admin_router import router as admin_analytics_router
from api.analytics.user_router import router as user_analytics_router
from api.attempts.router import router as attempts_router
from api.auth.router import router as auth_router
from api.feedback.router import router as feedback_router
from api.notifications.router import router as notifications_router
from api.payments.router import router as payments_router
from api.lessons.router import router as lessons_router
from api.driving_schools.router import router as driving_schools_router
from api.driving_schools.admin_router import router as admin_driving_schools_router
from api.driving_instructors.router import router as driving_instructors_router
from api.driving_instructors.admin_router import router as admin_driving_instructors_router
from api.tests.router import router as tests_router
from api.users.router import router as users_router
from api.violations.router import router as violations_router
from core.config import settings
from core.logging import setup_logging
from database.session import engine
from middleware.error_handler import global_exception_handler, http_exception_handler
from middleware.rate_limit import RateLimitMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from ml.model_registry import get_inference_engine


from sqlalchemy import text

UPLOADS_DIR = Path(__file__).resolve().parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

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
            print("[OK] Database connection successful")
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        raise
    
    yield  # Application runs here
    
    # Shutdown: Dispose engine
    print("Shutting down AUTOTEST application...")
    await engine.dispose()
    print("[OK] Database engine disposed")


app = FastAPI(
    title=settings.APP_NAME,
    description="Online Testing and Diagnostic Platform",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
)

# Rate Limiting Middleware
app.add_middleware(RateLimitMiddleware)

# CORS Middleware must be the outermost middleware so even error responses
# (including rate-limit and unhandled exceptions) include CORS headers.
origins = settings.ALLOWED_ORIGINS
if isinstance(origins, str):
    origins = [o.strip() for o in origins.split(",") if o.strip()]

# Hard requirements for frontend hosts (production + local dev).
# Keep these explicit so dashboard analytics requests always pass CORS checks.
required_origins = {
    "http://165.232.160.172:3000",
    "http://localhost:3000",
}

origin_set = {origin.strip() for origin in origins if origin and origin.strip()}
origin_set.update(required_origins)
allow_origins = sorted(origin_set)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Include routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(attempts_router)
app.include_router(user_analytics_router)
app.include_router(admin_analytics_router)
app.include_router(payments_router)
app.include_router(users_router)
app.include_router(tests_router)
app.include_router(violations_router)
app.include_router(lessons_router)
app.include_router(feedback_router)
app.include_router(notifications_router)
app.include_router(driving_schools_router)
app.include_router(admin_driving_schools_router)
app.include_router(driving_instructors_router)
app.include_router(admin_driving_instructors_router)


@app.get("/health")
async def health_check():
    """
    Hardened health check endpoint.
    Returns specific status for DB and ML engine.
    """
    health_status = {
        "status": "ok",
        "db": "error",
        "ml": "fallback"
    }
    
    # 1. DB Check (Minimal async SELECT 1)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            health_status["db"] = "ok"
    except Exception as e:
        health_status["status"] = "error"
        health_status["db"] = "error"
        
    # 2. ML Check (Registry singleton check only)
    try:
        engine_instance = get_inference_engine()
        if engine_instance.model is not None:
            health_status["ml"] = "active"
        else:
            health_status["ml"] = "fallback"
    except Exception:
        health_status["ml"] = "fallback"
        
    return health_status

@app.post("/debug/request")
async def debug_request(request: Request):
    """Diagnostic endpoint to see what the frontend is actually sending."""
    body = await request.body()
    return {
        "method": request.method,
        "url": str(request.url),
        "headers": dict(request.headers),
        "body_decoded": body.decode(),
    }
