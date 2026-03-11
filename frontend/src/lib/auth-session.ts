export const AUTH_ACCESS_COOKIE = "access_token";
export const AUTH_REFRESH_COOKIE = "refresh_token";
export const AUTH_SESSION_MARKER = "cookie-session";

export function isSessionMarker(value: string | null | undefined): boolean {
  return typeof value === "string" && value === AUTH_SESSION_MARKER;
}
