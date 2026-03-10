# AUTOTEST Security Overview

## Auth lifecycle

- `POST /auth/login` issues a short-lived access token and a long-lived refresh token.
- Access tokens are JWTs with a session id (`sid`) bound to a server-side `refresh_sessions` row.
- Refresh tokens are opaque, high-entropy values stored only as SHA-256 hashes in the database.
- `POST /auth/refresh` rotates the refresh token on every use.
- If a rotated refresh token is reused, the entire token family is revoked.
- `POST /auth/logout` revokes the active refresh session.
- `POST /auth/reset-password` revokes all active refresh sessions for the user.

## Cookie strategy

- Access token cookie: `HttpOnly`, `SameSite=Lax`, `Secure` in production.
- Refresh token cookie: `HttpOnly`, `SameSite=Lax`, `Secure` in production.
- Tokens are not persisted in browser-accessible storage.
- Frontend only keeps a non-sensitive session marker for UI state.

## Refresh rotation

- Each refresh request creates a new `refresh_sessions` row and revokes the previous one with reason `rotated`.
- Access tokens carry the originating session id.
- Authenticated requests validate that the referenced refresh session still exists, is not revoked, and is not expired.
- This invalidates access tokens immediately after logout and after refresh-token reuse detection.

## Logout strategy

- Logout revokes the presented refresh session.
- Because access tokens are session-bound, revoked sessions also invalidate their access tokens on the next authenticated request.

## Anti-cheating model

- Correct answers are never returned by question-loading APIs.
- Question ordering and question pool selection are generated on the backend.
- Attempts store the allowed `question_ids` server-side and answer submission is validated against that assigned set.
- Score calculation, correctness evaluation, pass/fail decisions, and analytics updates run only on the backend.
- Incremental answer submission only acknowledges receipt and never reveals `is_correct` or `correct_option_id`.
- Review answers are returned only after full backend submission processing.
- Sensitive exam and auth endpoints are protected by rate limiting to reduce brute-force and harvesting attempts.

## Question security rules

- Public question payloads may include:
  - question id
  - question text
  - media URLs
  - topic/category metadata
  - answer option ids and texts
- Public question payloads must never include:
  - `is_correct`
  - `correct_option_id`
  - answer keys
  - scoring metadata

## Background processing

- Payment reconciliation runs in a dedicated worker, not inside the FastAPI request cycle.
- Worker polling uses retry backoff and PostgreSQL row locking with `SKIP LOCKED` to reduce double-processing risk.

## Production safeguards

- `SECRET_KEY` is required when `DEBUG=False`.
- Wildcard CORS is rejected in production.
- Non-local insecure `http://` origins are rejected in production configuration.
- Debug request echo endpoint is only registered in debug mode.
