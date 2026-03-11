import type { NextRequest } from "next/server";

import {
  AUTH_ACCESS_COOKIE,
  AUTH_SESSION_MARKER,
} from "@/lib/auth-session";

const ABSOLUTE_HTTP_URL = /^https?:\/\//i;
const DEFAULT_BACKEND_API_URL = "http://127.0.0.1:8000";

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function getServerApiBaseUrl(): string {
  const publicBase = process.env.NEXT_PUBLIC_API_BASE;
  const candidates = [
    process.env.API_URL,
    process.env.NEXT_PUBLIC_API_URL,
    publicBase && ABSOLUTE_HTTP_URL.test(publicBase) ? publicBase : undefined,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return normalizeBaseUrl(candidate);
    }
  }

  return DEFAULT_BACKEND_API_URL;
}

export function getRequestAuthToken(
  request: Pick<NextRequest, "headers" | "cookies">
): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token.length > 0 && token !== AUTH_SESSION_MARKER) {
      return token;
    }
  }

  const cookieToken = request.cookies.get(AUTH_ACCESS_COOKIE)?.value;
  return cookieToken && cookieToken.length > 0 ? cookieToken : null;
}

export function buildCheckoutReturnUrls(
  request: Pick<NextRequest, "nextUrl">
): { successUrl: string; cancelUrl: string } {
  const origin = normalizeBaseUrl(request.nextUrl.origin);
  return {
    successUrl: `${origin}/payment/success`,
    cancelUrl: `${origin}/payment/cancel`,
  };
}
