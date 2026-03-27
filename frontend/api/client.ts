"use client";

import { AUTH_EXPIRED_EVENT, hasAuthPresenceCookie } from "@/lib/auth-session";

const ABSOLUTE_HTTP_URL = /^https?:\/\//i;
const DEFAULT_BROWSER_API_BASE = "/api";

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

function extractPayloadMessage(payload: unknown, status: number): string {
  if (typeof payload === "string") {
    return sanitizeErrorMessage(payload, status);
  }

  if (payload && typeof payload === "object") {
    if ("detail" in payload && typeof payload.detail === "string") {
      return sanitizeErrorMessage(payload.detail, status);
    }

    if ("message" in payload && typeof payload.message === "string") {
      return sanitizeErrorMessage(payload.message, status);
    }
  }

  return sanitizeErrorMessage(`Request failed with status ${status}`, status);
}

function sanitizeErrorMessage(message: string, status: number): string {
  const normalized = message.trim();
  const lowered = normalized.toLowerCase();

  if (
    lowered.includes("request timed out") ||
    lowered.includes("timed out") ||
    lowered.includes("aborted") ||
    status === 504
  ) {
    return "Server javobi juda sekin bo'ldi. Bir ozdan keyin qayta urinib ko'ring.";
  }

  if (
    lowered.includes("database schema is not initialized") ||
    lowered.includes("ma'lumotlar bazasi tayyor emas") ||
    lowered.includes("relation \"users\" does not exist") ||
    lowered.includes("undefinedtableerror")
  ) {
    return "Server bazasi hali tayyor emas. Administrator migratsiyalarni ishga tushirishi kerak.";
  }

  if (
    lowered.includes("sqlalchemy") ||
    lowered.includes("asyncpg") ||
    lowered.includes("traceback") ||
    lowered.includes("programmingerror") ||
    lowered.includes("internal server error") ||
    status >= 500
  ) {
    return "Serverda ichki xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko'ring.";
  }

  return normalized;
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  baseUrl?: string;
  retryOnAuth?: boolean;
  timeoutMs?: number;
};

let refreshPromise: Promise<boolean> | null = null;

function sleep(delayMs: number) {
  return new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

function getDefaultApiBaseUrl() {
  if (typeof window !== "undefined") {
    return DEFAULT_BROWSER_API_BASE;
  }

  return (
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_BROWSER_API_BASE
  );
}

function normalizeBaseUrl(baseUrl?: string) {
  const candidate = baseUrl?.trim() ? baseUrl : getDefaultApiBaseUrl();

  if (typeof window === "undefined" || !ABSOLUTE_HTTP_URL.test(candidate)) {
    return candidate;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.origin === window.location.origin) {
      return parsed.pathname || "/";
    }
  } catch {
    return DEFAULT_BROWSER_API_BASE;
  }

  return DEFAULT_BROWSER_API_BASE;
}

function buildUrl(
  path: string,
  query?: RequestOptions["query"],
  baseUrl?: string,
) {
  const resolvedBaseUrl = normalizeBaseUrl(baseUrl);
  const base = ABSOLUTE_HTTP_URL.test(resolvedBaseUrl)
    ? new URL(resolvedBaseUrl)
    : new URL(resolvedBaseUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

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

  return ABSOLUTE_HTTP_URL.test(resolvedBaseUrl)
    ? base.toString()
    : `${base.pathname}${base.search}`;
}

async function tryRefreshSession() {
  if (typeof window === "undefined") {
    return false;
  }

  if (!hasAuthPresenceCookie()) {
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
  const { query, baseUrl, retryOnAuth = true, headers, body, timeoutMs, ...init } = options;
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
    const controller = typeof timeoutMs === "number" && timeoutMs > 0 && !init.signal ? new AbortController() : null;
    const signal = init.signal ?? controller?.signal;
    let timeoutId: number | null = null;
    let timedOut = false;

    if (controller) {
      timeoutId = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
    }

    try {
      response = await fetch(buildUrl(path, query, baseUrl), {
        credentials: "include",
        cache: "no-store",
        ...init,
        headers: normalizedHeaders,
        signal,
        body:
          body == null || typeof body === "string" || body instanceof FormData
            ? body
            : JSON.stringify(body),
      });
    } catch (error) {
      lastError = timedOut ? new Error("Request timed out") : error;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (attempt >= maxAttempts) {
        throw (lastError instanceof Error ? lastError : error);
      }
      await sleep(250 * attempt);
      continue;
    }

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
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
    const message = extractPayloadMessage(payload, response.status);
    throw new ApiError(message, response.status, payload);
  }

  return parseResponse<T>(response);
}
