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
    return token.length > 0 ? token : null;
  }

  const cookieToken = request.cookies.get("access_token")?.value;
  return cookieToken && cookieToken.length > 0 ? cookieToken : null;
}

export async function POST(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json(
      { detail: "Authentication required." },
      { status: 401 }
    );
  }

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/payments/create-session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const responseText = await response.text();
    let body: unknown = {};
    if (responseText.trim().length > 0) {
      try {
        body = JSON.parse(responseText);
      } catch {
        body = { detail: responseText };
      }
    }

    return NextResponse.json(body, { status: response.status });
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach payments backend." },
      { status: 502 }
    );
  }
}

