"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/store/useAuth";
import FullScreenLoader from "./FullScreenLoader";

export default function GlobalAuthGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const hasFetched = useRef(false);
    const bootstrapAttempted = useRef(false);
    const isPublicAuthRoute =
        pathname.startsWith("/verify")
        || pathname.startsWith("/forgot-password")
        || pathname.startsWith("/reset-password");

    const { user, token, loading, hydrated, fetchUser, signOut } = useAuth();

    // 1. Handle Multi-tab Sync
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "auth-storage") {
                // If the auth storage was cleared or changed in another tab, re-sync or logout
                if (!e.newValue) {
                    signOut();
                } else {
                    // You could reload here, but Zustand persist handles state sync mostly.
                    // We trigger fetchUser to be sure we have the right user for the new token.
                    window.location.reload();
                }
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, [signOut]);

    // 2. Bootstrap auth identity from the cookie-backed frontend session.
    useEffect(() => {
        if (hydrated && !isPublicAuthRoute && !user && !loading && !hasFetched.current && !bootstrapAttempted.current) {
            bootstrapAttempted.current = true;
            hasFetched.current = true;
            void fetchUser().finally(() => {
                hasFetched.current = false;
            });
        }
    }, [hydrated, user, loading, fetchUser, isPublicAuthRoute]);

    useEffect(() => {
        // Reset bootstrap flag when auth state changes, so fresh tokens can refetch user safely.
        if (token || user || pathname.startsWith("/login") || isPublicAuthRoute) {
            bootstrapAttempted.current = false;
        }
    }, [token, user, pathname, isPublicAuthRoute]);

    // 3. Handle Redirects (Only inside Protected Routes)
    // Note: This Gate is intended to wrap only (app) layouts.
    useEffect(() => {
        if (hydrated && !token && !user && !loading && !isPublicAuthRoute) {
            const nextParam = encodeURIComponent(pathname);
            router.replace(`/login?next=${nextParam}`);
        }
    }, [hydrated, token, user, loading, router, pathname, isPublicAuthRoute]);

    // Block rendering only while hydration/bootstrap auth identity is unresolved.
    // NOTE: do not block whole app for generic loading=true once user is already known.
    if (!hydrated || (loading && !user) || (token && !user)) {
        return <FullScreenLoader />;
    }

    // If we are hydrated, have no token, and aren't loading, redirections will trigger
    // but we still return null to prevent content flash.
    if (!token) {
        if (isPublicAuthRoute) {
            return <>{children}</>;
        }
        return null;
    }

    return <>{children}</>;
}
