import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getApiBaseUrl(): string {
  const rawBaseUrl = process.env.API_URL;
  if (!rawBaseUrl) {
    throw new Error("API_URL is not defined");
  }
  return rawBaseUrl.trim().replace(/\/+$/, "");
}

export async function GET() {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/payments/plans`, {
      method: "GET",
      cache: "no-store",
    });

    const responseText = await response.text();
    let payload: unknown = [];
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
