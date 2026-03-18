import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from "@/lib/auth-session";
import { getServerApiBaseUrl } from "@/lib/server-api";

interface MeResponse {
  is_admin?: boolean;
}

const protectedRoutes = [
  "/admin",
  "/dashboard",
  "/practice",
  "/simulation",
  "/analytics",
  "/lessons",
  "/learning-path",
  "/achievements",
  "/leaderboard",
  "/schools",
  "/instructors",
  "/school",
  "/instructor",
  "/profile",
  "/settings",
  "/upgrade",
];

const authRoutes = ["/login", "/register", "/verify"];

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(AUTH_ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(AUTH_REFRESH_COOKIE)?.value;
  const hasSession = Boolean(accessToken || refreshToken);
  const { pathname } = request.nextUrl;

  if (protectedRoutes.some((route) => pathname.startsWith(route)) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (authRoutes.some((route) => pathname.startsWith(route)) && accessToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/admin") && accessToken) {
    try {
      const response = await fetch(`${getServerApiBaseUrl()}/api/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          cookie: request.headers.get("cookie") ?? "",
        },
        cache: "no-store",
      });

      if (response.status === 401) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }

      if (response.ok) {
        const me = (await response.json()) as MeResponse;
        if (me.is_admin !== true) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
      }
    } catch {
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/practice/:path*",
    "/simulation/:path*",
    "/analytics/:path*",
    "/lessons/:path*",
    "/learning-path/:path*",
    "/achievements/:path*",
    "/leaderboard/:path*",
    "/schools/:path*",
    "/instructors/:path*",
    "/school/:path*",
    "/instructor/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/upgrade/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/verify",
  ],
};
