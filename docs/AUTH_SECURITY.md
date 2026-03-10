# AUTH SECURITY

## Overview

AUTOTEST now uses a split-token session model:

- Access token: short-lived JWT, default `20` minutes
- Refresh token: opaque server-tracked token, default `14` days
- Browser storage: real tokens are stored in `HttpOnly` cookies on the frontend domain
- Client state: frontend stores only a non-sensitive session marker (`cookie-session`)

## Token Lifecycle

1. User logs in or verifies email
2. Backend issues:
   - short-lived access token
   - long-lived refresh token
3. Next.js auth proxy stores both on the frontend domain as cookies
4. Browser JS receives only a session marker, not the real token values
5. When access token expires:
   - client calls `/api/auth/refresh`
   - backend rotates refresh token
   - proxy replaces both cookies
6. If an old refresh token is reused:
   - backend marks this as reuse
   - the whole refresh token family is revoked

## Cookie Configuration

Cookies are set by `frontend/src/app/api/auth/[...path]/route.ts`.

- `access_token`
  - `HttpOnly=true`
  - `SameSite=Lax`
  - `Secure=true` in production / HTTPS
  - short `maxAge`
- `refresh_token`
  - `HttpOnly=true`
  - `SameSite=Lax`
  - `Secure=true` in production / HTTPS
  - longer `maxAge`

## Refresh Rotation

Refresh tokens are stored hashed in the `refresh_sessions` table.

When `/auth/refresh` is called:

1. Backend looks up the hashed refresh token
2. Validates:
   - not revoked
   - not expired
   - user still active
3. Issues a new refresh token in the same family
4. Revokes the previous refresh token with reason `rotated`

If a revoked rotated token is presented again, backend treats it as token reuse and revokes the entire family.

## Logout Strategy

Logout calls `/auth/logout`.

- current refresh token session is revoked server-side
- frontend proxy clears both auth cookies
- client-side session marker is removed

Password reset also revokes all active refresh sessions for that user.

## Frontend Strategy

- `useAuth` and legacy `useAuthStore` keep only a session marker in persisted state
- protected requests use cookies, not browser-readable JWT storage
- client fetch/axios flows attempt `/api/auth/refresh` before forcing logout
- middleware allows protected route access when either access or refresh cookie exists

## Local Development

Local development works without HTTPS.

- `Secure=false` on cookies for local HTTP
- same rotation and invalidation logic still applies

## Production Notes

- run the `0040` migration before deploy
- keep `SECRET_KEY` stable and secret
- keep `ACCESS_TOKEN_EXPIRE_MINUTES` between `15` and `30`
- keep `REFRESH_TOKEN_EXPIRE_DAYS` between `7` and `30`
- deploy frontend and backend together so auth proxy and backend token schema stay aligned
