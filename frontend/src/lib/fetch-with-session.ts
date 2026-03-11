import { useAuth } from "@/store/useAuth";
import { AUTH_SESSION_MARKER } from "@/lib/auth-session";

let refreshInFlight: Promise<boolean> | null = null;

export async function refreshAuthSession(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          useAuth.getState().signOut();
          return false;
        }

        useAuth.getState().setToken(AUTH_SESSION_MARKER);
        return true;
      } catch {
        useAuth.getState().signOut();
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

export async function fetchWithSessionRefresh(
  input: RequestInfo | URL,
  init?: RequestInit,
  retry = true,
): Promise<Response> {
  const requestInit: RequestInit = {
    credentials: "include",
    ...init,
  };

  const response = await fetch(input, requestInit);
  if (response.status !== 401 || !retry) {
    return response;
  }

  const refreshed = await refreshAuthSession();
  if (!refreshed) {
    return response;
  }

  return fetch(input, {
    ...requestInit,
    cache: "no-store",
  });
}
