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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cheque_id: string }> }
) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json(
      { detail: "Authentication required." },
      { status: 401 }
    );
  }

  const { cheque_id } = await context.params;
  const normalizedChequeId = cheque_id.trim();
  if (!normalizedChequeId) {
    return NextResponse.json(
      { detail: "cheque_id is required." },
      { status: 422 }
    );
  }

  try {
    const response = await fetch(
      `${getApiBaseUrl()}/api/payments/transactions/${encodeURIComponent(
        normalizedChequeId
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

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
