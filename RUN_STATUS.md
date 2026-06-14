# RUN STATUS

## Current local services

- PostgreSQL: running locally via Windows service `postgresql-x64-17`.
- Backend: running on `http://127.0.0.1:8000`.
- Frontend: running on `http://127.0.0.1:3000`.

Docker Compose was not used because Docker Desktop's Linux engine was not running.

## Verification results

Commands/results:

- Backend health: `GET http://127.0.0.1:8000/health` -> `200`, `{"status":"ok","db":"ok","ml":"fallback"}`.
- FastAPI docs: `GET http://127.0.0.1:8000/docs` -> `200`.
- Frontend root: `GET http://127.0.0.1:3000/` -> `200`.
- Frontend login page: `GET http://127.0.0.1:3000/login` -> `200`.
- Frontend dashboard without auth: `GET http://127.0.0.1:3000/dashboard` -> `307` redirect, expected for unauthenticated access.
- Backend login: `POST http://127.0.0.1:8000/api/auth/login` with seeded demo admin -> `200`.
- Authenticated user API: `GET http://127.0.0.1:8000/api/auth/me` with bearer token -> `200`.
- Frontend API proxy auth check: `GET http://127.0.0.1:3000/api/auth/me` with bearer token -> `200`.

## Working features

- Backend starts and connects to PostgreSQL.
- Alembic migrations are at head.
- Local demo seed completes.
- Frontend production build passes.
- Frontend loads the landing page.
- Login page renders.
- Auth API accepts seeded demo credentials.
- Authenticated API calls work.
- API documentation is reachable.

## Broken or incomplete

- Frontend lint fails with existing ESLint errors.
- Backend pytest collection fails due missing/renamed test imports.
- TsPay credentials are missing, so real subscription payment flows cannot complete.
- Email credentials are placeholders, so real verification/reset emails are not deliverable.
- Docker Compose cannot run until Docker Desktop is started.
- ML reports `fallback`; no trained production model/artifact is active.

## Warnings

- `npm ci` reports 17 vulnerabilities in frontend dependencies.
- `next start` warns because `next.config.ts` uses `output: "standalone"`. Use `node .next/standalone/server.js` for production after `npm run build`.
- `/api/health` through the frontend returns 404 because backend health is mounted at `/health`, not `/api/health`.

## Recommended fixes

- Project owner should provide real TsPay, email, Sentry, and production DB values.
- Add or restore `scripts/safe_migrate.py`, or update the readiness message to reference Alembic.
- Repair backend tests by restoring `scripts.compare_normalized` or updating the parity test, and by updating `tests/test_ml_pass_predictor.py` for the current `ml.model_registry` API.
- Clean up frontend lint debt separately from startup work.
- Review frontend dependency vulnerabilities with `npm audit` and update packages deliberately.
