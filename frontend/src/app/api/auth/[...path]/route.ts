import { NextRequest, NextResponse } from "next/server";

import { getRequestAuthToken, getServerApiBaseUrl } from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_AUTH_PATHS = new Set([
  "login",
  "register",
  "verify",
  "resend-verification",
  "forgot-password",
  "reset-password",
  "me",
]);

function getForwardPath(pathSegments: string[] | undefined): string | null {
  if (!Array.isArray(pathSegments) || pathSegments.length !== 1) {
    return null;
  }

  const [segment] = pathSegments;
  return ALLOWED_AUTH_PATHS.has(segment) ? segment : null;
}

async function proxyAuthRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const forwardPath = getForwardPath(path);

  if (!forwardPath) {
    return NextResponse.json({ detail: "Not found." }, { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getRequestAuthToken(request);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const backendUrl = `${getServerApiBaseUrl()}/api/auth/${forwardPath}${request.nextUrl.search}`;
  const bodyText =
    request.method === "GET" || request.method === "HEAD"
      ? null
      : await request.text();

  try {
    const response = await fetch(backendUrl, {
      method: request.method,
      headers,
      body: bodyText && bodyText.trim().length > 0 ? bodyText : undefined,
      cache: "no-store",
    });

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

    return NextResponse.json(payload, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach auth backend." },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyAuthRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyAuthRequest(request, context);
}
