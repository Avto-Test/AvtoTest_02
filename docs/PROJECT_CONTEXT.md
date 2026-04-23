# AUTOTEST — PROJECT CONTEXT

## Project Goal
AUTOTEST is an online testing and diagnostic platform.

## Tech Stack
- Language: Python 3.11+
- Framework: FastAPI
- Database: PostgreSQL
- ORM: SQLAlchemy 2.0 (async)
- Driver: asyncpg
- Auth: JWT (to be implemented)
- Migrations: Alembic

## Architecture Decisions
(none yet)

## Agent Work Log

### 2026-02-07 — Minimal FastAPI app created
- `main.py` created with FastAPI application instance
- `/health` endpoint added returning `{"status": "ok"}`
- Application runs with: `uvicorn main:app --reload`

### 2026-02-07 — STEP 2: Database Infrastructure
- Configured Async SQLAlchemy 2.0 with `asyncpg`
- Created `database/base.py` (Declarative Base)
- Created `database/session.py` (Async Engine & Session factory)
- Configured `alembic/env.py` for async migrations

### 2026-02-07 — STEP 3: User Model
- Created `User` model (`models/user.py`)
- Fields: `id` (UUID), `email`, `hashed_password`, `is_active`, `is_verified`
- Migration `0001` created to initialize `users` table

### 2026-02-07 — STEP 4: JWT Authentication
- Implemented `core/security.py` for password hashing (bcrypt) and JWT handling
- Created `api/auth/router.py` with:
  - `POST /auth/register`
  - `POST /auth/login` (returns Access Token)
- Implemented `get_current_user` dependency for route protection

### 2026-02-07 — STEP 5: Email Verification
- Created `VerificationToken` model (`models/verification_token.py`)
- Migration `0002` created
- Updated `users` table with `is_verified` field
- Added `POST /auth/verify` endpoint to validate 6-digit codes
- Integrated basic email sending logic

### 2026-02-07 — STEP 6: Content Models
- Created domain models for tests:
  - `Test` (title, description, difficulty)
  - `Question` (text, image_url)
  - `AnswerOption` (text, is_correct)
- Migration `0003` created for `tests`, `questions`, `answer_options` tables
- Configured cascades and relationships

### 2026-02-07 — STEP 7: Attempt Models
- Created models for tracking user progress:
  - `Attempt` (user_id, test_id, score, started_at, finished_at)
  - `AttemptAnswer` (selected_option_id, is_correct)
- Migration `0004` created for `attempts` and `attempt_answers` tables

### 2026-02-07 — STEP 8: Attempt API
- Created `api/attempts/router.py`
- Endpoints implemented:
  - `POST /attempts/start`: Begin a new test attempt
  - `POST /attempts/answer`: Submit/Update an answer
  - `POST /attempts/finish`: Calculate final score and complete attempt

### 2026-02-07 — STEP 9: Premium & Limits
- Created `Subscription` model (`models/subscription.py`)
- Migration `0005` created for `subscriptions` table
- Added `is_premium` property to `User` model
- Implemented daily limit logic in `StartAttempt`:
  - Free users: Max 3 attempts per day
  - Premium users: Unlimited attempts

### 2026-02-07 — STEP 10: Admin CRUD implemented
- Added `is_admin` boolean field to `User` model (default=False)
- Created `api/admin/` package:
  - `__init__.py`
  - `schemas.py` — Pydantic schemas for Test, Question, AnswerOption CRUD
  - `router.py` — Admin-protected CRUD endpoints
- Admin access enforced via `get_current_admin` dependency (checks `is_admin == True`)
- Test CRUD: POST/GET/PUT/DELETE `/admin/tests`
- Question CRUD: POST `/admin/tests/{test_id}/questions`, PUT/DELETE `/admin/questions/{question_id}`
- AnswerOption CRUD: POST `/admin/questions/{question_id}/options`, PUT/DELETE `/admin/options/{option_id}`
- Only ONE correct AnswerOption per Question enforced in code
- Deleting Test cascades to Questions and AnswerOptions (via FK ondelete CASCADE + SQLAlchemy relationship cascade)
- Migration `0006` adds `is_admin` column to `users` table
- Updated `main.py` to include admin router
### 2026-02-07 — STEP 11: Statistics & Analytics implemented
- Created `api/analytics/` package:
  - `schemas.py` — Pydantic models for aggregation results
  - `user_router.py` — Authenticated user endpoints:
    - `GET /analytics/me/summary`: Total attempts, avg score, last 5 attempts
    - `GET /analytics/me/tests`: Per-test stats (attempts count, best/avg score)
  - `admin_router.py` — Admin-only endpoints:
    - `GET /analytics/admin/summary`: Global counts (users, premium, tests, attempts)
    - `GET /analytics/admin/top-tests`: Top tests by attempt count
- Logic uses efficient SQL aggregations (`COUNT`, `AVG`, `MAX`, `GROUP BY`)
- Read-only endpoints, no new tables
- Updated `main.py` to include analytics routers

### 2026-02-07 — STEP 12: Production Prep implemented
- Created Dockerfile (multi-stage, python 3.11 slim)
- Implemented environment config via Pydantic Settings (`core/config.py`)
- Created `.env.example`
- Configured structured logging (`core/logging.py`) to JSON/console
- Added global error handlers (`middleware/error_handler.py`) for consistent 500/HTTP errors
- Implemented in-memory rate limiting middleware (`middleware/rate_limit.py`) for auth endpoints
- Updated `main.py` to integrate middlewares, logging, and CORS

### 2026-02-07 — STEP 13: Payment Integration implemented
- Implemented Stripe Checkout for Premium subscriptions
- Added `core/payments/stripe.py` for Stripe API interaction
- Created `api/payments/router.py` with endpoints:
  - `POST /payments/checkout`: Creates Stripe Session
  - `POST /payments/webhook`: Handles `checkout.session.completed` event
- Webhook logic verifies signature and activates/extends Premium subscription
- Updated `Subscription` model logic to handle activation
- Configured Stripe keys and price in `core/config.py` and `.env.example`

### 2026-02-07 — STEP 14: Automated Tests implemented
- Testing stack: pytest, pytest-asyncio, httpx
- Covered: Auth, Attempts, Limits, Admin, Payments
- Stripe fully mocked
- Async test client and fixtures configured

### 2026-02-07 — PROJECT COMPLETED
- created `README.md` with setup/usage instructions
- created `requirements.txt`
- Verified file structure and all verification steps
- Project is ready for deployment/handover

### 2026-02-07 — STEP 15: Frontend UX Support Endpoints
- Added `GET /users/me` (`api/users/router.py`) for retrieving current user profile including premium status.
- Added `GET /tests` (`api/tests/router.py`) for listing active tests without authentication/admin rights.
- Added `GET /tests/{test_id}` (`api/tests/router.py`) for retrieving full test details for test-taking.
- Ensured `is_correct` field is strictly excluded from public test/question responses via Pydantic schemas.

---

## FRONTEND

### 2026-02-07 — FE STEP 1: Frontend Initialization & Design System
- **Project Setup:**
  - Initialized Next.js 14 with App Router, TypeScript, Tailwind CSS
  - Installed: `zustand`, `axios`, `react-hook-form`, `@hookform/resolvers`, `zod`
  - Configured shadcn/ui with button and card components
- **Design System (globals.css):**
  - Professional color palette using OKLCH (blue primary, cyan brand)
  - Light/dark mode CSS custom properties
  - Typography scale (h1-h6)
  - Utility classes: `.gradient-text`, `.glass`, `.container-app`
- **Layout Structure:**
  - `AppShell.tsx` — Main layout with header, nav, footer
  - `layout.tsx` — Root layout with SEO metadata, fonts
  - `page.tsx` — Professional landing page (hero, features, CTA)
- **Verification:**
  - `npm run lint` — Passed
  - `npm run build` — Passed (static pages generated)

### 2026-02-07 — FE STEP 2: Authentication UI
- **Pages Created:** `/login`, `/register`, `/verify` (protected route group)
- **Infrastructure:**
  - `lib/api.ts` — Axios instance with JWT interceptors
  - `store/auth.ts` — Zustand store with persistence
  - `schemas/auth.schema.ts` — Zod validation schemas
- **Components:** `AuthCard`, `AuthHeader` (clean layout)
- **Integration:** Fully connected to backend auth endpoints (`/auth/*`)
- **Verification:** Lint and Build passed

### 2026-02-07 — FE STEP 3: Tests Browsing & Test Taking UI
- **Pages Created:**
  - `/tests` — Grid list of available tests
  - `/tests/[id]` — Test details and start attempt
  - `/tests/[id]/attempt` — Active test session interface
  - Updated `/dashboard` with real links and user stats
- **Infrastructure:**
  - `store/attempt.ts` — Zustand store for active session (answers, progress)
  - `lib/tests.ts` — API client for tests and attempts
  - `schemas/test.schema.ts` — TypeScript interfaces
- **Components:** `TestCard`, `QuestionCard`, `AnswerOption`, `TestProgress`, `FinishModal`
- **UX Features:**
  - Optimistic answer updates
  - Real-time progress tracking
  - Exam-style navigation (Next/Prev)
  - Score calculation and percentage display on finish
- **Verification:** Lint and Build passed

### 2026-02-07 — FE STEP 4: User Dashboard & Analytics UI
- **Pages Created:**
  - `/dashboard` — Main hub with stats, charts, and recent activity
  - `/dashboard/history` — Detailed table of all test attempts
  - `/dashboard/settings` — Profile summary and plan status
- **Components:**
  - `StatsCard` — Key metric display
  - `AttemptsChart` — CSS-based bar chart for score trends
  - `RecentAttempts` — List of latest sessions
  - `TestPerformanceTable` — Sortable breakdown by test
  - `PremiumBadge` — Visual indicator of user status
- **Infrastructure:**
  - `lib/analytics.ts` — API client for user analytics
  - `schemas/analytics.schema.ts` — TypeScript interfaces
- **Integration:** Connected to `/analytics/me/*` and `/users/me`
- **Verification:** Lint and Build passed

### 2026-02-07 — FE STEP 5: Payments, Pricing & Upgrade Flow UI
- **Pages Created:**
  - `/pricing` — Public pricing comparison page (Free vs Premium)
  - `/upgrade` — Authenticated upgrade flow with Stripe checkout
- **Components:**
  - `PricingCard` — Conversion-optimized pricing card with visual emphasis for premium
  - `FeatureList` — Feature bullet list with included/excluded states
  - `PlanBadge` — "Most Popular" gradient badge
  - `LoadingButton` — Button with loading spinner for async operations
- **Infrastructure:**
  - `lib/payments.ts` — API client for Stripe checkout
  - `schemas/payment.schema.ts` — TypeScript interfaces and feature definitions
- **UX Decisions:**
  - Premium card visually "wins" with scale, border accent, and badge
  - Trust indicators: "Secure payment by Stripe", "Cancel anytime"
  - Dynamic CTAs based on auth and premium status
  - Prevents double-submission during checkout
- **Verification:** Lint and Build passed

### 2026-02-07 — FE STEP 6: Admin Panel UI
- **Routes Created:**
  - `/admin` — Dashboard with summary cards (tests count, active/inactive)
  - `/admin/tests` — Tests list with DataTable, delete confirmation
  - `/admin/tests/create` — Create test form with Zod validation
  - `/admin/tests/[id]/edit` — Edit test form with pre-filled data
  - `/admin/tests/[id]/questions` — Full questions & options CRUD
- **Components:**
  - `AdminLayout` — RBAC-protected shell (redirects non-admin to /dashboard)
  - `SidebarNav` — Admin navigation with active states
  - `DataTable` — Reusable table with loading/empty states
  - `ConfirmDialog` — Destructive action confirmation modal
- **Infrastructure:**
  - `lib/admin.ts` — CRUD API client for tests, questions, options
  - `schemas/admin.schema.ts` — TypeScript interfaces + Zod schemas
- **UX Decisions:**
  - Radio button selection enforces exactly one correct answer per question
  - Inline option creation/deletion without page reload
  - Cascade delete warnings for tests and questions
  - Clean SaaS-style aesthetic with proper loading states
- **Security:** Non-admin users redirected to `/dashboard`
- **Verification:** Lint and Build passed

### 2026-02-08 — FE STEP 7: Polishing, Performance & Production UX
- **Performance & Stability**:
  - Refactored `lib/api.ts` for single axios instance with global interceptors.
  - Implemented global error handling: 401 (logout), 403, 500, Network Error (Toast).
- **UX Polishing**:
  - Added `Sonner` toast notifications for success/error feedback.
  - Implemented `Skeleton` loaders for Tests, Dashboard, and Admin tables.
  - Added Empty States for all data lists (Tests, Attempts, Admin).
- **Production Details**:
  - Configured SEO metadata for all pages (Home, Login, Dashboard, Admin, etc.).
  - Verified mobile responsiveness for tables and grids.
- **Verification**: Code quality checks passed, mobile responsiveness verified.

### 2026-02-08 — PROJECT READY FOR LAUNCH
- Frontend and Backend are fully integrated and polished.
- Ready for deployment.


### 2026-02-13 — Analytics Phase 1 (Retention Layer)
- **Backend**:
  - Added `topic` field to `Question` model (`models/question.py`) with index.
  - Implemented `GET /analytics/me/overview`: Aggregated stats (attempts, pass rate, avg score).
  - Implemented `GET /analytics/me/topic-breakdown`: Accuracy per topic using SQL joins.
- **Frontend**:
  - Integrated `Recharts` for performance trend visualization.
  - Created `ProgressAnalytics` component with topic breakdown bars.
  - Implemented `PremiumLock` for advanced analytics gating.
  - Added "Focus Recommendation" logic for weakest topics.
- **Infrastructure**:
  - Manual Alembic migration `0009` applied successfully.

### 2026-02-13 — Analytics Phase 2 (Smart Improvement Layer)
- **Backend**:
  - Calculated `improvement_delta` by comparing last two attempts.
  - Added `/analytics/me/recommendation` endpoint for weakest topic suggestions.
- **Frontend**:
  - Created `ImprovementCard` to visualize performance trends (Up/Down/Stable).
  - Created `RecommendationCard` (Premium) to suggest practice topics.
  - Integrated new cards into Dashboard.

### 2026-02-13 — Adaptive Test Generation (Phase 3A)
- **Backend**:
  - Implemented `POST /tests/adaptive/start`: Dynamically selects questions (60% weak topic, 40% random).
  - Created "Adaptive Practice Mode" test container logic.
- **Frontend**:
  - Updated `RecommendationCard` with "Start Adaptive Practice" CTA and "Adaptive Mode" badge.
  - Modified `TestAttemptPage` (`/tests/[testId]`) to support `testId="adaptive"` and pre-loaded questions.

### 2026-02-13 — Adaptive Stabilization & Readiness (Phase 4)
- **Backend**:
    - Replaced `is_adaptive` with `mode` ("normal", "adaptive") for systemic hardening.
    - Implemented `UserTrainingHistory` to track level transitions (Beginner → Intermediate → Advanced).
    - Introduced `readiness_score` (0-100) based on weighted historical pass rates.
- **Frontend**:
    - Created `ReadinessCard` with professional interpretation and `PremiumLock`.
    - Added dynamic motivational messages to the result page.

### 2026-02-13 — Pass Probability Engine (Phase 5)
- **Backend**:
    - Implemented statistical analysis of recent 20 attempts to predict real exam success.
    - Added `pass_probability` and `pass_prediction_label` to analytics.
- **Frontend**:
    - Created `PassProbabilityCard` (Premium) for high-impact user motivation.

### 2026-02-13 — ML-Lite Difficulty Learning System (Phase 6)
- **Database**:
    - Added `total_attempts`, `total_correct`, and `dynamic_difficulty_score` to `Question` model.
    - Migration `0015_add_question_dynamic_fields` applied.
- **Backend**:
    - Implemented atomic SQL updates in `bulk_submit_attempt` to prevent race conditions.
    - Difficulty now "learns" from community performance (1 - accuracy).
    - Adaptive selection falls back to static difficulty if data is insufficient (<20 attempts).
- **Frontend**:
    - Added difficulty badges ("High Difficulty", "Easy Question") to the test result review section.
    - Integrated "Adaptive Intelligence" metric into the `ReadinessCard`.

### 2026-02-13 — User Skill Vector Modeling System (Phase 7)
- **Database**:
    - Created `UserSkill` model for topic-specific proficiency tracking.
    - Migration `0016_add_user_skill_model` applied.
- **Backend**:
    - Implemented EMA (Exponential Moving Average) updates for skill scores after every attempt.
    - Upgraded adaptive selection to a 60/30/10 distribution (Weakest/Mid/Strongest topics).
    - Added backend-driven skill feedback messages ("Skill improved in [Topic]").
- **Frontend**:
    - Created `SkillRadarChart` using Recharts to visualize the user's multi-dimensional skill vector.
    - Integrated Radar Chart into the Dashboard grid (Premium only).

### 2026-02-13 — Bayesian Knowledge Tracing (Phase 8)
- **Database**:
    - Added `bkt_knowledge_prob` and `bkt_attempts` to `UserSkill` model.
    - Migration `0017_add_bkt_fields` applied.
- **Backend Logic**:
    - Implemented BKT update algorithm with difficulty-dependent `P_GUESS`.
    - Adaptive selection now uses BKT mastery with a 70/20/10 distribution mix.
    - Upgraded `pass_probability` formula to include BKT average mastery (0.2 weight).
- **Frontend**:
    - Created `KnowledgeConfidenceChart` (Bar chart) to visualize mastery probabilities.
    - Added BKT status indicators and mastery-specific reinforcement messages.

### 2026-02-13 — Memory Decay & Retention Engine (Phase 9)
- **Database**:
    - Added `last_practice_at` and `retention_score` to `UserSkill` model.
    - Migration `0018_add_retention_fields` applied.
- **Backend Logic**:
    - Implemented Memory Decay algorithm based on Ebbinghaus forgetting curve.
    - Advanced adaptive selection using `weakness_score` (0.6*BKT + 0.4*Retention).
    - Upgraded `pass_probability` to a balanced 6-factor formula (Readiness, Adaptive, Consistency, Level, BKT, Retention).
- **Frontend**:
    - Created `RetentionHeatmap` (Dark-themed premium component) for knowledge freshness tracking.
    - Integrated "Knowledge Fading" alerts on the result page.

### 2026-02-13 — Spaced Repetition & Memory Consolidation (Phase 10)
- **Database**:
    - Extended `UserSkill` model with SRS fields: `repetition_count`, `interval_days`, `ease_factor`, `next_review_at`.
    - Migration `0019_add_spaced_repetition_fields` applied with UTC-aware datetimes.
- **Backend Logic**:
    - Implemented SM-2 (SuperMemo-2) algorithm for dynamic review scheduling.
    - Upgraded adaptive engine to use `priority_score` (BKT, Retention, and Due Score).
    - Added `GET /analytics/me/review-queue` for tracking overdue topics.
    - Finalized 6-factor `pass_probability` with `consolidation_factor`.
- **Frontend**:
    - Created `ReviewQueueCard` (Premium-locked) for dashboard status.
    - Added `MemoryStabilityBadge` (Consolidated/Stabilizing/Volatile) to result page.
    - Reorganized dashboard grid into a professional 6-card layout.

### 2026-02-13 — Phase 11: Hybrid ML Pass Predictor
- **Feature Engineering**:
    - Implemented 20-dimension feature vector extraction in `ml/features.py` (readiness, consistency, retention, pressure, mastery).
- **Model Training**:
    - Trained `GradientBoostingClassifier` (sklearn) on user attempt history.
    - Implemented `ml/train_pass_model.py` for automated retraining pipeline (minimum 30 attempts, 5 users).
- **Infrastructure**:
    - Created `ModelRegistry` for versioned model loading and hash-based integrity verification.
    - Implemented `RetrainScheduler` to monitor model drift (AUC < 0.65) and data volume (50 new attempts).
    - Added `InferenceEngine` singleton for thread-safe prediction serving.
- **Verification**:
    - Resolved `UnboundLocalError` in dashboard prediction via comprehensive test debugging.
    - Achieved production-grade metrics (logged in metadata).

### 2026-02-13 — Phase 12C: Final Hardening & Stabilization
- **Inference Safety**:
    - Implemented `safe_ml_inference` singleton wrapper in `ml/model_registry.py` for bulletproof failure tolerance.
    - Integrated with `api/analytics/user_router.py` to ensure zero-crash guarantee.
- **Validation & Calibration**:
    - Enhanced metadata validation (normalization versioning, hash integrity).
    - Upgraded confidence score formula (AUC-weighted) and added strictly deterministic blending clamps.
- **Performance & Monitoring**:
    - Added inference duration tracking (< 50ms requirement).
    - Hardened drift detection logic in `ml/retrain_scheduler.py`.
### 2026-02-13 — Phase 13: Statistical Drift Detection Layer
- **Drift Monitoring**:
    - Implemented `ml/drift_detector.py` with Population Stability Index (PSI) for data drift and KL-Divergence for prediction drift.
    - Updated `ml/train_pass_model.py` to save baseline distributions in model metadata.
- **Safety Fallback**:
    - Integrated drift state into `InferenceEngine` (automated fallback to rule-engine on "severe" drift).
    - Added confidence override (0.15) for drifted models in `api/analytics/user_router.py`.
- **Scheduled Checks**:
    - Integrated `DriftMonitor` into `ml/retrain_scheduler.py` for periodic background checks.
- **Verification**:
    - Created `tests/test_ml_drift_detection.py` with simulated drift and corruption scenarios.
    - All 5 statistical verification tests passed.

### 2026-02-13 — Phase 14: Frontend Dashboard Structural Redesign
- **AI-First Layout**:
    - Redesigned `/dashboard` into a 4-zone structured architecture (Primary AI, Action Center, Performance, Premium).
    - Established visual dominance for AI Pass Probability (Zone A).
- **Component Hardening**:
    - Created standalone `PressureResilienceCard` for higher granularity in performance tracking.
    - Implemented `ZonePrimaryAI`, `ZoneActionCenter`, `ZonePerformance`, and `ZonePremium` wrappers.
- **Performance & Logic**:
    - Transitioned heavy Recharts components to dynamic imports with `ssr: false`.
    - Implemented logic for collapsible premium blocks on mobile to reduce cognitive load.
    - Zero regression in API contracts, business logic, or ML pipelines.

### 2026-02-13 — Phase 16: Enterprise System Status Bar Implementation
- **Real-Time Monitoring**:
    - Implemented `SystemStatusBar` for immediate visibility into AI engine health (Stable, Monitoring, Drift).
    - Integrated pulsing operational state indicators.
- **Performance Awareness**:
    - Visualized inference latency with color-coded severity (Emerald < 50ms, Amber < 100ms, Red > 100ms).
- **Responsive Layout**:
    - Engineered mobile-first vertical stacking and refined density for non-intrusive dashboard placement.

### 2026-02-13 — Phase 17: Executive AI Result Page Redesign
- **Diagnostic Report Architecture**:
    - Transformed `/tests/[testId]/result` into a 4-zone structured intelligence report (Executive Summary, Diagnostics, Recommendation, Detailed Review).
    - Integrated compact AI Pass Probability gauge and stability badges.
- **Advanced Diagnostics**:
    - Implemented `PerformanceDiagnostics` with Recharts topic proficiency charts and efficiency metrics.
    - Automated frontend derivation of topic accuracy and difficulty-weighted performance.
- **Prescriptive Analytics**:
    - Integrated `AIRecommendation` engine providing contextual advice and direct CTAs for Adaptive Practice and Review Queue.
    - Switched to `AnswerReviewAccordion` for lazy-rendered, high-density question analysis with AI reinforcement.
