"""
AUTOTEST - Online Testing Platform
Main FastAPI Application
"""

from contextlib import asynccontextmanager
from pathlib import Path
import logging

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy import text
import asyncio

from api.admin.router import router as admin_router
from api.ai_coach.router import router as ai_coach_router
from api.analytics.admin_router import router as admin_analytics_router
from api.analytics.legacy_router import router as legacy_analytics_router
from api.analytics.user_router import router as user_analytics_router
from api.answers.router import router as answers_router
from api.attempts.router import router as attempts_router
from api.auth.router import router as auth_router
from api.economy.router import router as economy_router
from api.experiments.router import router as experiments_router
from api.feedback.router import router as feedback_router
from api.gamification.router import router as gamification_router
from api.notifications.router import router as notifications_router
from api.payments.router import router as payments_router
from api.promocode_router import router as promocode_router
from api.lessons.router import router as lessons_router
from api.learning.router import router as learning_router
from api.leaderboard.router import router as leaderboard_router
from api.simulation.router import router as simulation_router
from api.school_router import router as school_router
from api.settings.router import router as settings_router
from api.driving_schools.router import router as driving_schools_router
from api.driving_schools.admin_router import router as admin_driving_schools_router
from api.driving_instructors.router import router as driving_instructors_router
from api.driving_instructors.admin_router import router as admin_driving_instructors_router
from api.tests.router import router as tests_router
from api.users.router import router as users_router
from api.violations.router import router as violations_router
from core.config import settings
from core.logging import setup_logging
from core.monitoring import init_monitoring
from database.readiness import verify_database_startup_ready
from database.session import engine
from middleware.error_handler import global_exception_handler, http_exception_handler
from middleware.request_context import RequestContextMiddleware
from middleware.rate_limit import RateLimitMiddleware
from services.gamification.leaderboard_scheduler import leaderboard_refresh_loop, refresh_leaderboards_once
from ml.model_registry import get_inference_engine
import models  # noqa: F401

UPLOADS_DIR = Path(__file__).resolve().parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    init_monitoring()
    print("Starting AUTOTEST application...")
    
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            await verify_database_startup_ready(
                conn,
                require_migration_head=settings.normalized_environment != "testing",
            )
            print("[OK] Database connection successful")
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        raise

    async def _startup_retrain_check():
        try:
            from ml.retrain_scheduler import check_retrain_needed
            result = await check_retrain_needed()
            print(f"[ML) Retrain scheduler: {result}")
        except Exception as exc:
            print(f"[ML] Retrain scheduler startup check failed: {exc}")

    asyncio.ensure_future(_startup_retrain_check())
    
    try:
        await refresh_leaderboards_once()
        print("[OK] Leaderboard snapshots refreshed")
    except Exception as exc:
        print(f"[WARN] Leaderboard refresh failed: {exc}")

    leaderboard_task = asyncio.create_task(leaderboard_refresh_loop())
    app.state.leaderboard_task = leaderboard_task
    
    yield
    
    print("Shutting down AUTOTEST application...")
    task = getattr(app.state, "leaderboard_task", None)
    if task:
        task.cancel()
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

# Exception Handlers (Added early so they can be caught by outer middlewares)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Middlewares (Order: RequestContext -> RateLimit -> Logging -> CORS)
# Request flow: CORS -> Logging -> RateLimit -> RequestContext -> App
# Response flow: App -> RequestContext -> RateLimit -> Logging -> CORS
app.add_middleware(RequestContextMiddleware)
app.add_middleware(RateLimitMiddleware)

@app.middleware("http")
async def diagnostic_logging(request: Request, call_next):
    origin = request.headers.get("origin")
    method = request.method
    path = request.url.path
    logging.info(f"DIAGNOSTIC: {method} {path} | Origin: {origin}")
    response = await call_next(request)
    return response

# CORS must be the OUTERMOST middleware
origins = settings.ALLOWED_ORIGINS
if isinstance(origins, str):
    origins = [o.strip() for o in origins.split(",") if o.strip()]

required_origins = {
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
} if settings.DEBUG or settings.ENVIRONMENT == "testing" else set()

origin_set = {o.strip() for o in origins if o and o.strip()}
origin_set.update(required_origins)
allow_origins = sorted(origin_set)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Files
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Routes
api_router = APIRouter(prefix="/api")
routers = [
    auth_router, admin_router, ai_coach_router, answers_router, attempts_router,
    legacy_analytics_router, user_analytics_router, admin_analytics_router,
    experiments_router,
    economy_router, gamification_router, users_router, tests_router,
    violations_router, lessons_router, learning_router, leaderboard_router,
    simulation_router, feedback_router, notifications_router, school_router,
    settings_router,
    driving_schools_router, admin_driving_schools_router,
    driving_instructors_router, admin_driving_instructors_router
]

for r in routers:
    api_router.include_router(r)
    # Also include at root for backward compatibility
    app.include_router(r)

app.include_router(api_router)
app.include_router(payments_router)
app.include_router(promocode_router)

@app.get("/debug-cors")
async def debug_cors():
    return {
        "allow_origins": allow_origins,
        "debug": settings.DEBUG,
        "environment": settings.ENVIRONMENT,
        "allowed_origins_raw": settings.ALLOWED_ORIGINS,
    }

@app.get("/health")
async def health_check():
    health_status = {"status": "ok", "db": "error", "ml": "fallback"}
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            health_status["db"] = "ok"
    except Exception:
        health_status["status"] = "error"
    
    try:
        engine_instance = get_inference_engine()
        health_status["ml"] = "active" if engine_instance.model else "fallback"
    except Exception:
        pass
    return health_status

if settings.DEBUG:
    @app.post("/debug/request")
    async def debug_request(request: Request):
        body = await request.body()
        return {
            "method": request.method,
            "url": str(request.url),
            "headers": dict(request.headers),
            "body_decoded": body.decode(),
        }

print(f"!!! main.py logic initialized with origins: {allow_origins} !!!")
