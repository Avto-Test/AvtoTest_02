export const AUTH_ACCESS_COOKIE = "access_token";
export const AUTH_REFRESH_COOKIE = "refresh_token";
export const AUTH_PRESENCE_COOKIE = "auth_present";
export const AUTH_SESSION_MARKER = "cookie-session";
export const AUTH_EXPIRED_EVENT = "autotest:auth-expired";

export function hasAuthPresenceCookie() {
  if (typeof document === "undefined") {
    return false;
  }

  return document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .some((entry) => entry === `${AUTH_PRESENCE_COOKIE}=1`);
}

export function clearAuthPresenceCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${AUTH_PRESENCE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}
