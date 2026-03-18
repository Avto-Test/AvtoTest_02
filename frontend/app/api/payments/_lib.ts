import { NextRequest, NextResponse } from "next/server";

import {
  buildCheckoutReturnUrls,
  getRequestAuthToken,
  getServerApiBaseUrl,
} from "@/lib/server-api";

async function parseJsonResponse(response: Response) {
  const responseText = await response.text();
  if (!responseText.trim()) {
    return {};
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return { detail: responseText };
  }
}

async function readRequestPayload(request: NextRequest) {
  try {
    const payload = await request.json();
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      return payload as Record<string, unknown>;
    }
  } catch {
    // Ignore empty or invalid JSON bodies and forward an empty object instead.
  }

  return {} as Record<string, unknown>;
}

export async function proxyPublicPaymentRequest(path: string) {
  try {
    const response = await fetch(`${getServerApiBaseUrl()}${path}`, {
      method: "GET",
      cache: "no-store",
    });

    return NextResponse.json(await parseJsonResponse(response), {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach payments backend." },
      { status: 502 },
    );
  }
}

export async function proxyAuthedPaymentRequest(
  request: NextRequest,
  path: string,
  options: {
    method?: "GET" | "POST";
    includeCheckoutReturnUrls?: boolean;
    payload?: Record<string, unknown>;
  } = {},
) {
  const token = getRequestAuthToken(request);
  if (!token) {
    return NextResponse.json(
      { detail: "Authentication required." },
      { status: 401 },
    );
  }

  const method = options.method ?? "POST";
  const requestPayload =
    options.payload ??
    (method === "GET" ? {} : await readRequestPayload(request));
  const checkoutReturnUrls = options.includeCheckoutReturnUrls
    ? buildCheckoutReturnUrls(request)
    : null;

  const body =
    method === "GET"
      ? undefined
      : JSON.stringify(
          checkoutReturnUrls
            ? {
                ...requestPayload,
                success_url: checkoutReturnUrls.successUrl,
                cancel_url: checkoutReturnUrls.cancelUrl,
              }
            : requestPayload,
        );

  try {
    const response = await fetch(`${getServerApiBaseUrl()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
      cache: "no-store",
    });

    return NextResponse.json(await parseJsonResponse(response), {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach payments backend." },
      { status: 502 },
    );
  }
}
