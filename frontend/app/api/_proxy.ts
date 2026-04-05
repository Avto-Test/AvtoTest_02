import { NextRequest, NextResponse } from "next/server";

import { getRequestAuthToken, getServerApiBaseUrl } from "@/lib/server-api";

type ProxyOptions = {
  requireAuth?: boolean;
};

function buildForwardHeaders(request: NextRequest, bodyText?: string | null) {
  const headers: Record<string, string> = {};
  const token = getRequestAuthToken(request);

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

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

  const contentType = request.headers.get("content-type");
  if (bodyText && bodyText.trim().length > 0) {
    headers["Content-Type"] = contentType && contentType.trim().length > 0 ? contentType : "application/json";
  }

  return { headers, token };
}

export async function proxyBackendRequest(
  request: NextRequest,
  backendPath: string,
  options: ProxyOptions = {},
) {
  const bodyText = request.method === "GET" || request.method === "HEAD" ? null : await request.text();
  const { headers, token } = buildForwardHeaders(request, bodyText);

  if ((options.requireAuth ?? true) && !token) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(`${getServerApiBaseUrl()}${backendPath}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body: bodyText && bodyText.trim().length > 0 ? bodyText : undefined,
      cache: "no-store",
    });

    const responseText = await response.text();
    const responseHeaders = new Headers();
    const contentType = response.headers.get("content-type");
    const wwwAuthenticate = response.headers.get("www-authenticate");

    if (contentType) {
      responseHeaders.set("content-type", contentType);
    }
    if (wwwAuthenticate) {
      responseHeaders.set("www-authenticate", wwwAuthenticate);
    }

    if (!responseText) {
      return new NextResponse(null, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    try {
      const payload = JSON.parse(responseText) as unknown;
      return NextResponse.json(payload, {
        status: response.status,
        headers: responseHeaders,
      });
    } catch {
      return new NextResponse(responseText, {
        status: response.status,
        headers: responseHeaders,
      });
    }
  } catch {
    return NextResponse.json({ detail: "Backend bilan aloqa o'rnatilmadi." }, { status: 502 });
  }
}
