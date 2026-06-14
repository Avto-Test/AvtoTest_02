# PROJECT AUDIT

## Summary

AUTOTEST is a full-stack online driving-test preparation platform. The primary app is a FastAPI backend at the repository root and a Next.js frontend in `frontend/`.

Repository cloned from:

`https://github.com/Avto-Test/AvtoTest_02.git`

## Tech stack

- Backend: Python 3.11, FastAPI, Uvicorn, SQLAlchemy 2 async, asyncpg, Alembic, Pydantic Settings.
- Frontend: Next.js 16.1.6, React 19, TypeScript, Tailwind CSS 4, ESLint 9.
- Database: PostgreSQL.
- Auth: JWT access tokens plus refresh sessions.
- Payments: TsPay integration, legacy Stripe variables retained.
- Email: SMTP and Resend support.
- Monitoring: optional Sentry.
- ML/analytics: scikit-learn, pandas, numpy, custom `ml/` services.

## Project structure

- `main.py`: FastAPI application entrypoint.
- `api/`, `modules/`: backend route modules.
- `models/`: SQLAlchemy ORM models.
- `database/`: async database engine/session/readiness helpers.
- `alembic/versions/`: database migrations.
- `scripts/`: seed and admin helper scripts.
- `frontend/`: primary Next.js frontend.
- `exemple test design/`, `simulatsion test/`: additional Next.js prototype/design folders, not used by the primary run path.
- `docker-compose.local.yml`: local PostgreSQL plus backend compose file.
- `docker-compose.yml`: production-style stack.

## Package managers

- Backend: `pip` with `requirements.txt`.
- Primary frontend: `npm` with `frontend/package-lock.json`.
- Prototype folders:
  - `exemple test design/` has `pnpm-lock.yaml`.
  - `simulatsion test/` has `package.json` only.

## Environment files

Existing examples:

- Root `.env.example`
- Root `.env.local.example`
- Root `.env.prod.example`
- `frontend/.env.example`

The local `.env` currently points to a local PostgreSQL database:

`postgresql+asyncpg://postgres:***@localhost:5432/autotest`

## Required services

- PostgreSQL 16+ or 17 local database.
- FastAPI backend on `http://127.0.0.1:8000`.
- Next.js frontend on `http://127.0.0.1:3000`.
- Optional external services:
  - TsPay credentials for payment checkout.
  - SMTP or Resend credentials for real email delivery.
  - Sentry DSN for monitoring.

## Install results

- Python virtual environment created at `.venv/`.
- Backend dependencies installed with `pip install -r requirements.txt`.
- Frontend dependencies installed with `npm ci` in `frontend/`.
- `npm ci` reported 17 audit vulnerabilities: 6 moderate, 11 high.

## Build and lint results

- Backend syntax check: `python -m compileall -q .` passed.
- Frontend production build: `npm run build` passed after minimal compatibility fixes.
- Frontend lint: `npm run lint` fails on existing ESLint issues, mostly `react/no-unescaped-entities` plus React hook rule warnings/errors.
- Backend tests: `pytest -q` fails during collection because:
  - `tests/parity/test_attempt_flow_shadow.py` imports missing `scripts.compare_normalized`.
  - `tests/test_ml_pass_predictor.py` imports missing `EXPECTED_HASH` from `ml.model_registry`.

## Minimal safe fixes applied

- `frontend/shared/ui/button.tsx`: added `asChild` compatibility using Radix `Slot.Root`, matching the existing UI button pattern.
- `frontend/src/components/AppNavbar.tsx`: added missing `Button` import.
- `scripts/seed_driving_schools.py`: changed seeded partner application status from `new` to canonical `PENDING`.
- `scripts/seed_driving_instructors.py`: changed seeded lead/application/complaint statuses to canonical uppercase values.

These were limited to build/startup/seed blockers and do not change business workflows.

## Known issues

- Docker Desktop engine was not running, so Docker Compose could not start `postgres:16-alpine`.
- Local PostgreSQL service `postgresql-x64-17` was available and used instead.
- TsPay token is missing; subscription payments will fail until credentials are provided.
- Sentry is not configured; monitoring is disabled.
- Frontend lint does not pass.
- Backend test collection does not pass.
- Production frontend uses `output: "standalone"`; after build, prefer `node .next/standalone/server.js` over `next start`.
