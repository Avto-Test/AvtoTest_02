# SETUP GUIDE

## 1. Requirements

- Python 3.11+
- Node.js 22+ and npm
- PostgreSQL 16+ or 17
- Optional: Docker Desktop for compose-based local DB

## 2. Installation

Backend:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Frontend:

```powershell
cd frontend
npm ci
cd ..
```

## 3. Environment variables

Root examples already exist:

- `.env.example`
- `.env.local.example`
- `.env.prod.example`

Frontend example:

- `frontend/.env.example`

For local development, root `.env` needs at least:

```env
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=replace-with-local-development-secret
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/autotest
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
ENABLE_API_DOCS=true
```

Frontend local variables:

```env
API_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_BASE=/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Owner-provided values required for full production behavior:

- `TSPAY_ACCESS_TOKEN` or accepted TsPay merchant alias
- `TSPAY_WEBHOOK_SECRET` if webhook signatures are required
- SMTP or Resend email credentials
- Production `SECRET_KEY`
- Production PostgreSQL credentials
- Optional `SENTRY_DSN`

## 4. Database setup

Create a PostgreSQL database named `autotest`, then run:

```powershell
$env:APP_ENV_FILE='.env'
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Optional local demo data:

```powershell
$env:APP_ENV_FILE='.env'
.\.venv\Scripts\python.exe scripts\seed_local_test_data.py
```

## 5. Backend start

```powershell
$env:APP_ENV_FILE='.env'
$env:ENVIRONMENT='development'
$env:DEBUG='true'
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Check:

```powershell
curl.exe http://127.0.0.1:8000/health
```

Docs:

`http://127.0.0.1:8000/docs`

## 6. Frontend start

Development:

```powershell
cd frontend
$env:API_URL='http://127.0.0.1:8000'
$env:NEXT_PUBLIC_API_URL='http://127.0.0.1:8000'
$env:NEXT_PUBLIC_API_BASE='/api'
npm run dev -- -H 127.0.0.1 -p 3000
```

Open:

`http://127.0.0.1:3000`

## 7. Production build

```powershell
cd frontend
npm run build
```

Because the app uses `output: "standalone"`, start the built frontend with:

```powershell
$env:API_URL='http://127.0.0.1:8000'
$env:NEXT_PUBLIC_API_URL='http://127.0.0.1:8000'
$env:NEXT_PUBLIC_API_BASE='/api'
node .next/standalone/server.js
```

## 8. Troubleshooting

- Database startup error: run `alembic upgrade head` and verify `DATABASE_URL`.
- Docker error `dockerDesktopLinuxEngine`: start Docker Desktop, or use an existing local PostgreSQL service.
- Payment warning: set TsPay credentials.
- Email verification/reset does not send: set SMTP or Resend credentials.
- `npm run lint` fails: current repo has pre-existing ESLint issues; build still passes.
- `pytest` fails during collection: restore/update the missing test dependencies noted in `RUN_STATUS.md`.
- Frontend `/api/health` returns 404: use backend `/health` directly.
