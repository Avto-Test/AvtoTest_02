import { NextRequest, NextResponse } from "next/server";

import {
  buildCheckoutReturnUrls,
  getRequestAuthToken,
  getServerApiBaseUrl,
} from "@/lib/server-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const token = getRequestAuthToken(request);
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

  const checkoutReturnUrls = buildCheckoutReturnUrls(request);
  const requestPayload =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? {
          ...payload,
          success_url: checkoutReturnUrls.successUrl,
          cancel_url: checkoutReturnUrls.cancelUrl,
        }
      : {
          success_url: checkoutReturnUrls.successUrl,
          cancel_url: checkoutReturnUrls.cancelUrl,
        };

  try {
    const response = await fetch(`${getServerApiBaseUrl()}/api/payments/create-session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
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
