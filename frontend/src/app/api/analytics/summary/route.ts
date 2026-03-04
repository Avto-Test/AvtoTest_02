import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getApiBaseUrl(): string {
  const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return rawBaseUrl.trim().replace(/\/+$/, "");
}

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token.length > 0) return token;
  }
  const cookieToken = request.cookies.get("access_token")?.value;
  return cookieToken && cookieToken.length > 0 ? cookieToken : null;
}

export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${getApiBaseUrl()}/analytics/me/summary`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const text = await response.text();
    let payload: unknown = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { detail: text || "Invalid JSON response from backend" };
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Summary proxy error";
    return NextResponse.json({ detail: message }, { status: 502 });
  }
}

