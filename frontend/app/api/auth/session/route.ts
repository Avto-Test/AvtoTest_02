import { NextRequest, NextResponse } from "next/server";

import { AUTH_ACCESS_COOKIE, AUTH_PRESENCE_COOKIE, AUTH_REFRESH_COOKIE } from "@/lib/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const hasAccessToken = Boolean(request.cookies.get(AUTH_ACCESS_COOKIE)?.value);
  const hasRefreshToken = Boolean(request.cookies.get(AUTH_REFRESH_COOKIE)?.value);
  const hasPresenceMarker = request.cookies.get(AUTH_PRESENCE_COOKIE)?.value === "1";

  return NextResponse.json({
    authenticated: hasAccessToken || hasRefreshToken || hasPresenceMarker,
  });
}
