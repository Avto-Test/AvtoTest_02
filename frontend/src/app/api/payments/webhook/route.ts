import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getApiBaseUrl(): string {
  const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return rawBaseUrl.trim().replace(/\/+$/, "");
}

function getForwardHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers["Content-Type"] = contentType;
  } else {
    headers["Content-Type"] = "application/json";
  }

  const signatureHeaders = [
    "x-tspay-signature",
    "tspay-signature",
    "x-webhook-signature",
    "stripe-signature",
  ];
  for (const headerName of signatureHeaders) {
    const value = request.headers.get(headerName);
    if (value) {
      headers[headerName] = value;
    }
  }
  return headers;
}

export async function POST(request: NextRequest) {
  const body = await request.arrayBuffer();

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/payments/webhook`, {
      method: "POST",
      headers: getForwardHeaders(request),
      body,
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

    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach payments backend." },
      { status: 502 }
    );
  }
}

