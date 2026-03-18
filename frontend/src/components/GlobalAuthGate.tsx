"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/store/useAuth";
import FullScreenLoader from "./FullScreenLoader";

export default function GlobalAuthGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const bootstrapAttemptedRef = useRef(false);
    const isPublicAuthRoute =
        pathname.startsWith("/verify")
        || pathname.startsWith("/forgot-password")
        || pathname.startsWith("/reset-password");

    const { user, loading, hydrated, fetchUser, signOut } = useAuth();

    // 1. Handle Multi-tab Sync
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "auth-storage") {
                if (!e.newValue) {
                    signOut();
                } else {
                    window.location.reload();
                }
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, [signOut]);

    // 2. Handle Initialization (Bootstrap)
    useEffect(() => {
        if (hydrated && !isPublicAuthRoute && !user && !loading && !bootstrapAttemptedRef.current) {
            bootstrapAttemptedRef.current = true;
            void fetchUser();
        }
    }, [hydrated, user, loading, fetchUser, isPublicAuthRoute]);

    // 3. Handle Redirects (Only inside Protected Routes)
    useEffect(() => {
        if (hydrated && bootstrapAttemptedRef.current && !user && !loading && !isPublicAuthRoute) {
            const nextParam = encodeURIComponent(pathname);
            router.replace(`/login?next=${nextParam}`);
        }
    }, [hydrated, user, loading, router, pathname, isPublicAuthRoute]);

    const isAuthenticated = !!user;
    if (!isPublicAuthRoute && (!hydrated || !isAuthenticated)) {
        return <FullScreenLoader />;
    }

    if (!isAuthenticated) {
        if (isPublicAuthRoute) {
            return <>{children}</>;
        }
        return null;
    }

    return <>{children}</>;
}
