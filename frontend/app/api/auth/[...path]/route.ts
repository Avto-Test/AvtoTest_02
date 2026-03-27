import { NextRequest, NextResponse } from "next/server";

import {
  AUTH_ACCESS_COOKIE,
  AUTH_PRESENCE_COOKIE,
  AUTH_REFRESH_COOKIE,
  AUTH_SESSION_MARKER,
} from "@/lib/auth-session";
import { getRequestAuthToken, getServerApiBaseUrl } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedAuthPaths = new Set([
  "login",
  "register",
  "verify",
  "resend-verification",
  "forgot-password",
  "reset-password",
  "refresh",
  "logout",
  "me",
]);

const AUTH_BACKEND_TIMEOUT_MS = 8000;

type BackendTokenPayload = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  access_token_expires_in?: number;
  refresh_token_expires_in?: number;
};

function getForwardPath(pathSegments: string[] | undefined) {
  if (!Array.isArray(pathSegments) || pathSegments.length !== 1) {
    return null;
  }

  const [segment] = pathSegments;
  return allowedAuthPaths.has(segment) ? segment : null;
}

function hasBackendTokenPayload(payload: unknown): payload is BackendTokenPayload {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      typeof (payload as BackendTokenPayload).access_token === "string" &&
      typeof (payload as BackendTokenPayload).refresh_token === "string",
  );
}

function shouldUseSecureCookies(request: NextRequest) {
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    ?.toLowerCase();
  const forwardedSsl = request.headers.get("x-forwarded-ssl")?.trim()?.toLowerCase();

  return request.nextUrl.protocol === "https:" || forwardedProto === "https" || forwardedSsl === "on";
}

function setAuthCookies(response: NextResponse, request: NextRequest, payload: BackendTokenPayload) {
  const secure = shouldUseSecureCookies(request);
  const accessMaxAge = Math.max(payload.access_token_expires_in ?? 20 * 60, 60);
  const refreshMaxAge = Math.max(payload.refresh_token_expires_in ?? 14 * 24 * 60 * 60, 3600);
  const domain = process.env.NODE_ENV === "production" ? "auto-drive.online" : undefined;

  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    domain,
  };

  response.cookies.set(AUTH_ACCESS_COOKIE, payload.access_token, {
    ...cookieOptions,
    maxAge: accessMaxAge,
  });
  response.cookies.set(AUTH_REFRESH_COOKIE, payload.refresh_token, {
    ...cookieOptions,
    maxAge: refreshMaxAge,
  });
  response.cookies.set(AUTH_PRESENCE_COOKIE, "1", {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    domain,
    maxAge: refreshMaxAge,
  });
}

function clearAuthCookies(response: NextResponse, request: NextRequest) {
  const secure = shouldUseSecureCookies(request);
  const domain = process.env.NODE_ENV === "production" ? "auto-drive.online" : undefined;
  const options = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    domain,
    maxAge: 0,
    expires: new Date(0),
  };

  response.cookies.set(AUTH_ACCESS_COOKIE, "", options);
  response.cookies.set(AUTH_REFRESH_COOKIE, "", options);
  response.cookies.set(AUTH_PRESENCE_COOKIE, "", {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    domain,
    maxAge: 0,
    expires: new Date(0),
  });
}

function buildClientSessionPayload(payload: BackendTokenPayload) {
  return {
    access_token: AUTH_SESSION_MARKER,
    token_type: payload.token_type ?? "bearer",
  };
}

async function proxyAuthRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const forwardPath = getForwardPath(path);

  if (!forwardPath) {
    return NextResponse.json({ detail: "Not found." }, { status: 404 });
  }

  const headers: Record<string, string> = {};
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    headers["x-forwarded-for"] = forwardedFor;
  }

  const userAgent = request.headers.get("user-agent");
  if (userAgent) {
    headers["user-agent"] = userAgent;
  }

  const token = getRequestAuthToken(request);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const bodyText = request.method === "GET" || request.method === "HEAD" ? null : await request.text();
  if (bodyText && bodyText.trim().length > 0) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AUTH_BACKEND_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(
        `${getServerApiBaseUrl()}/api/auth/${forwardPath}${request.nextUrl.search}`,
        {
          method: request.method,
          headers,
          body: bodyText && bodyText.trim().length > 0 ? bodyText : undefined,
          cache: "no-store",
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const responseText = await response.text();
    let payload: unknown = {};

    if (responseText.trim().length > 0) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        payload = { detail: responseText };
      }
    }

    const responseHeaders = new Headers();
    const wwwAuthenticate = response.headers.get("www-authenticate");
    if (wwwAuthenticate) {
      responseHeaders.set("www-authenticate", wwwAuthenticate);
    }

    const clientPayload =
      response.ok && hasBackendTokenPayload(payload) ? buildClientSessionPayload(payload) : payload;

    const nextResponse = NextResponse.json(clientPayload, {
      status: response.status,
      headers: responseHeaders,
    });

    if (response.ok && hasBackendTokenPayload(payload)) {
      setAuthCookies(nextResponse, request, payload);
    } else if (forwardPath === "logout" || (forwardPath === "refresh" && response.status === 401)) {
      clearAuthCookies(nextResponse, request);
    }

    return nextResponse;
  } catch (error) {
    if (forwardPath === "logout") {
      const fallback = NextResponse.json({ message: "Sessiya yopildi" }, { status: 200 });
      clearAuthCookies(fallback, request);
      return fallback;
    }

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ detail: "Auth backend request timed out." }, { status: 504 });
    }

    return NextResponse.json({ detail: "Unable to reach auth backend." }, { status: 502 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyAuthRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyAuthRequest(request, context);
}
