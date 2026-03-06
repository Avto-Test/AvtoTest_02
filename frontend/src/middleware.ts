import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getApiBaseUrl(request: NextRequest): string {
    const rawBaseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_BASE || "/api";
    return new URL(rawBaseUrl, request.url).toString().replace(/\/+$/, "");
}

interface MeResponse {
    is_admin?: boolean;
}

export async function middleware(request: NextRequest) {
    const token = request.cookies.get('access_token')?.value;
    const { pathname } = request.nextUrl;

    // Protected routes (require auth)
    const protectedRoutes = ['/dashboard', '/admin', '/profile', '/billing', '/analytics', '/upgrade', '/feedback'];
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    const isAdminRoute = pathname.startsWith('/admin');

    // Auth routes (should not be accessible if logged in)
    const authRoutes = ['/login', '/register', '/verify', '/forgot-password', '/reset-password'];
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

    if (isProtectedRoute && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (isAdminRoute && token) {
        try {
            const response = await fetch(`${getApiBaseUrl(request)}/users/me`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: 'no-store',
            });

            if (!response.ok) {
                if (response.status === 401) {
                    const loginUrl = new URL('/login', request.url);
                    loginUrl.searchParams.set('from', pathname);
                    return NextResponse.redirect(loginUrl);
                }
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }

            const me = (await response.json()) as MeResponse;
            if (me.is_admin !== true) {
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        } catch {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    if (isAuthRoute && token) {
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
        '/login',
        '/register',
        '/verify',
        '/forgot-password',
        '/reset-password',
    ],
};
