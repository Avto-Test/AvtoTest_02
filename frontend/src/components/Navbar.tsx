"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/store/useAuth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/i18n-provider";
import { Headset } from "lucide-react";
import AppNavbar from "@/components/AppNavbar";

export default function Navbar() {
    const { user, token, hydrated, loading, fetchUser } = useAuth();
    const { t } = useI18n();
    const isAuthenticated = Boolean(token);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (hydrated && token && !user && !loading && !hasFetched.current) {
            hasFetched.current = true;
            fetchUser();
        }
    }, [hydrated, token, user, loading, fetchUser]);

    if (!hydrated) {
        return <div className="h-16 border-b border-border bg-background" />;
    }

    // Keep one consistent navbar for authenticated users across all route groups.
    if (isAuthenticated) {
        if (!user || loading) {
            return <div className="h-16 border-b border-border bg-background" />;
        }
        return <AppNavbar />;
    }

    return (
        <nav className="sticky top-0 z-50 border-b border-border/70 bg-background/72 backdrop-blur-xl supports-[backdrop-filter]:bg-background/68">
            <div className="container-app flex h-16 items-center justify-between gap-4">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
                        <span className="inline-flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-xs font-bold text-white shadow-sm">
                            A
                        </span>
                        AUTOTEST
                    </Link>
                    <div className="hidden items-center gap-1 rounded-xl border border-border/70 bg-card/65 p-1 text-sm text-muted-foreground md:flex">
                        <Link href="/" className="rounded-lg px-3 py-2 transition-colors hover:bg-muted hover:text-foreground">{t("nav.product")}</Link>
                        <Link href="/tests?mode=adaptive" className="rounded-lg px-3 py-2 transition-colors hover:bg-muted hover:text-foreground">{t("nav.tests")}</Link>
                        <Link href="/driving-schools" className="rounded-lg px-3 py-2 transition-colors hover:bg-muted hover:text-foreground">{t("nav.driving_schools", "Avtomaktablar")}</Link>
                        <Link href="/driving-instructors" className="rounded-lg px-3 py-2 transition-colors hover:bg-muted hover:text-foreground">{t("nav.driving_instructors", "Instruktorlar")}</Link>
                        <Link href="/pricing" className="rounded-lg px-3 py-2 transition-colors hover:bg-muted hover:text-foreground">{t("nav.pricing")}</Link>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <LanguageSwitcher />
                    <ThemeToggle />
                    <Link
                        href="/contact"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label="Aloqa"
                        title="Aloqa"
                    >
                        <Headset className="h-4 w-4" />
                    </Link>
                    <Button asChild size="sm" className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm hover:brightness-110">
                        <Link href="/tests?mode=adaptive">{t("nav.start_test")}</Link>
                    </Button>
                    <Link href="/login" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                        {t("nav.login")}
                    </Link>
                    <Button asChild size="sm" className="rounded-xl bg-emerald-500 hover:bg-emerald-400">
                        <Link href="/register">{t("nav.register")}</Link>
                    </Button>
                </div>
            </div>
        </nav>
    );
}
