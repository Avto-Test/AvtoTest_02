# RISK_POINTS — High-Risk Areas in AUTOTEST

## 1) Auth middleware & request pipeline
Files:
- `main.py`
- `middleware/rate_limit.py`
- `middleware/error_handler.py`

Risks:
- middleware order changes can break CORS visibility and error behavior
- aggressive rate-limit behavior on `/auth/*` can mask true auth failures
- exception response paths can diverge between local and production

Do not modify carelessly:
- middleware registration order
- raw ASGI response sections in rate limiter

---

## 2) Password hashing compatibility
File:
- `core/security.py`

Risks:
- changing hash scheme invalidates existing password hashes
- sync/async wrapper errors can trigger login 500

Do not modify carelessly:
- `CryptContext` scheme list
- verify/hash function signatures

---

## 3) JWT configuration
Files:
- `core/security.py`
- `core/config.py`

Risks:
- invalid/empty `SECRET_KEY` in production causes token generation failures
- algorithm mismatch breaks decode flow

Do not modify carelessly:
- token payload fields (`sub`, `exp`)
- `ALGORITHM` consistency

---

## 4) Database session lifecycle
Files:
- `database/session.py`
- routes using `Depends(get_db)`

Risks:
- async session misuse causes intermittent failures
- transaction boundaries in auth/payment can leave inconsistent states

Do not modify carelessly:
- session dependency behavior
- commit/rollback points in auth/payment flows

---

## 5) Auth route branching complexity
File:
- `api/auth/router.py`

Risks:
- pending registration + legacy user-state recovery branches are easy to regress
- status-code semantics (`401` vs `403`) affect frontend UX and retries

Do not modify carelessly:
- verification gating logic
- login fallback branches

---

## 6) CORS handling
File:
- `main.py`

Risks:
- environment-specific origins may be omitted
- non-standard error paths may appear as CORS failures

Do not modify carelessly:
- explicit production frontend origin entries
- `allow_credentials` behavior with auth cookies/tokens

---

## 7) Analytics API contract
Files:
- `api/analytics/user_router.py`
- `frontend/src/hooks/useDashboardAnalytics.ts`
- `frontend/src/app/api/analytics/dashboard/route.ts`

Risks:
- shape changes can silently break charts
- proxy fallback can hide real backend failures if overused

Do not modify carelessly:
- `overview` field structure
- pass probability fields expected by frontend

---

## 8) Adaptive engine internals
File:
- `api/tests/router.py`

Risks:
- small formula changes can destabilize question distribution and learning signals
- expensive query additions can degrade performance

Do not modify carelessly:
- mastery/repeat penalty logic
- staged difficulty distribution
- category caps and safety constraints

---

## 9) Payment system (TsPay integration path)
Files:
- `api/payments/router.py`
- `services/payments/tspay.py`
- `core/config.py`

Risks:
- currency normalization errors (USD/UZS) can mischarge users
- webhook validation mistakes can create inconsistent subscription states

Do not modify carelessly:
- provider amount handling
- webhook idempotency checks
- promo redemption accounting

---

## 10) Frontend auth/error interception
File:
- `frontend/src/lib/api.ts`

Risks:
- global interceptor can turn backend auth issues into redirect loops
- broad error toasts can obscure root causes

Do not modify carelessly:
- 401 handling (token clear + redirect)
- auth flow request exceptions (`/auth/login`, `/auth/register`, etc.)

---

## 11) Operational risk
Repository currently has many concurrent modified files.

Risks:
- unrelated changes can be accidentally deployed
- difficult rollback due mixed feature branches

Safe practice:
- isolate fixes to smallest diff
- verify service health + auth + dashboard after each deploy

---

## 12) Required context checklist (explicit)
- **What exists:** identified high-risk areas across auth, middleware, analytics, adaptive engine, payments.
- **What was changed:** multiple critical subsystems were recently edited in parallel.
- **Why it was changed:** feature expansion (verification, adaptive analytics, TsPay, dashboard modernization).
- **What risks exist:** regression risk is high due to wide and mixed diffs.
- **What must NOT be modified carelessly:** security/auth core, middleware order, analytics contracts, payment normalization.
- **Where debugging should continue:** fix auth login backend exception first, then validate analytics/dashboard end-to-end.
