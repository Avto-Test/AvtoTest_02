"use client";

import { AUTH_EXPIRED_EVENT } from "@/lib/auth-session";

const ABSOLUTE_HTTP_URL = /^https?:\/\//i;
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "/api";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  baseUrl?: string;
  retryOnAuth?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;

function sleep(delayMs: number) {
  return new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

function buildUrl(
  path: string,
  query?: RequestOptions["query"],
  baseUrl: string = API_BASE,
) {
  const base = ABSOLUTE_HTTP_URL.test(baseUrl)
    ? new URL(baseUrl)
    : new URL(baseUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const prefix = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
  base.pathname = `${prefix}${normalizedPath}`.replace(/\/{2,}/g, "/");

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined && value !== "") {
        base.searchParams.set(key, String(value));
      }
    }
  }

  return ABSOLUTE_HTTP_URL.test(baseUrl)
    ? base.toString()
    : `${base.pathname}${base.search}`;
}

async function tryRefreshSession() {
  if (typeof window === "undefined") {
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });
        return response.ok;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

function notifyAuthExpired() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

async function parseResponse<T>(response: Response) {
  const text = await response.text();
  if (!text) {
    return null as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { query, baseUrl, retryOnAuth = true, headers, body, ...init } = options;
  const method = (init.method ?? "GET").toUpperCase();
  const retryable = method === "GET" || method === "HEAD";
  const maxAttempts = retryable ? 3 : 1;

  const normalizedHeaders = new Headers(headers ?? undefined);
  if (!(body instanceof FormData) && !normalizedHeaders.has("Content-Type")) {
    normalizedHeaders.set("Content-Type", "application/json");
  }

  let response: Response | null = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      response = await fetch(buildUrl(path, query, baseUrl), {
        credentials: "include",
        cache: "no-store",
        ...init,
        headers: normalizedHeaders,
        body:
          body == null || typeof body === "string" || body instanceof FormData
            ? body
            : JSON.stringify(body),
      });
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) {
        throw error;
      }
      await sleep(250 * attempt);
      continue;
    }

    if (![429, 502, 503, 504].includes(response.status) || attempt >= maxAttempts) {
      break;
    }

    await sleep(250 * attempt);
  }

  if (!response) {
    throw (lastError instanceof Error ? lastError : new Error("Network request failed."));
  }

  if (response.status === 401 && retryOnAuth) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, retryOnAuth: false });
    }
    notifyAuthExpired();
  } else if (response.status === 401) {
    notifyAuthExpired();
  }

  if (!response.ok) {
    const payload = await parseResponse<{ detail?: string } | string>(response);
    const message =
      typeof payload === "string"
        ? payload
        : payload && typeof payload === "object" && "detail" in payload
          ? String(payload.detail)
          : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return parseResponse<T>(response);
}
