import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from '@/lib/auth-session';
import { getServerApiBaseUrl } from '@/lib/server-api';

interface MeResponse {
    is_admin?: boolean;
}

export async function proxy(request: NextRequest) {
    const accessToken = request.cookies.get(AUTH_ACCESS_COOKIE)?.value;
    const refreshToken = request.cookies.get(AUTH_REFRESH_COOKIE)?.value;
    const hasSession = Boolean(accessToken || refreshToken);
    const { pathname } = request.nextUrl;

    // Protected routes (require auth)
    const protectedRoutes = ['/dashboard', '/admin', '/profile', '/billing', '/analytics', '/upgrade', '/feedback', '/practice', '/simulation', '/leaderboard', '/achievements', '/learning-path', '/instructor', '/school'];
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    const isAdminRoute = pathname.startsWith('/admin');

    // Auth routes (should not be accessible if logged in)
    const authRoutes = ['/login', '/register', '/verify', '/forgot-password', '/reset-password'];
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

    if (isProtectedRoute && !hasSession) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (isAdminRoute && accessToken) {
        try {
            const response = await fetch(`${getServerApiBaseUrl()}/api/auth/me`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    cookie: request.headers.get("cookie") ?? "",
                },
                cache: 'no-store',
            });

            // Only hard-redirect when auth status is explicit. If the backend is
            // temporarily unreachable, let the client-side admin guard decide.
            if (response.status === 401) {
                const loginUrl = new URL('/login', request.url);
                loginUrl.searchParams.set('next', pathname);
                return NextResponse.redirect(loginUrl);
            }

            if (!response.ok) {
                return NextResponse.next();
            }

            const me = (await response.json()) as MeResponse;
            if (me.is_admin !== true) {
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        } catch {
            return NextResponse.next();
        }
    }

    if (isAuthRoute && accessToken) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/admin/:path*',
        '/profile/:path*',
        '/billing/:path*',
        '/analytics/:path*',
        '/upgrade/:path*',
        '/feedback/:path*',
        '/practice/:path*',
        '/simulation/:path*',
        '/leaderboard/:path*',
        '/achievements/:path*',
        '/learning-path/:path*',
        '/instructor/:path*',
        '/school/:path*',
        '/login',
        '/register',
        '/verify',
        '/forgot-password',
        '/reset-password',
    ],
};
