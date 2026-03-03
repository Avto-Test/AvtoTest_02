"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/store/useAuth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/i18n-provider";
import { Headset, Menu, X } from "lucide-react";
import AppNavbar from "@/components/AppNavbar";

export default function Navbar() {
    const { user, token, hydrated, loading, fetchUser } = useAuth();
    const { t } = useI18n();
    const isAuthenticated = Boolean(token);
    const hasFetched = useRef(false);
    const [mobileOpen, setMobileOpen] = useState(false);

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
        <>
        <nav className="sticky top-0 z-50 border-b border-border/70 bg-background/72 backdrop-blur-xl supports-[backdrop-filter]:bg-background/68">
            <div className="container-app flex h-16 min-w-0 items-center justify-between gap-2 sm:gap-4">
                <div className="flex min-w-0 items-center gap-8">
                    <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
                        <span className="inline-flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-xs font-bold text-white shadow-sm">
                            A
                        </span>
                        AUTOTEST
                    </Link>
                    <div className="hidden items-center gap-1 rounded-xl border border-border/70 bg-card/65 p-1 text-sm text-muted-foreground lg:flex">
                        <Link href="/" className="rounded-lg px-3 py-2 transition-colors hover:bg-muted hover:text-foreground">{t("nav.product")}</Link>
                        <Link href="/tests?mode=adaptive" className="rounded-lg px-3 py-2 transition-colors hover:bg-muted hover:text-foreground">{t("nav.tests")}</Link>
                        <Link href="/driving-schools" className="rounded-lg px-3 py-2 transition-colors hover:bg-muted hover:text-foreground">{t("nav.driving_schools", "Avtomaktablar")}</Link>
                        <Link href="/driving-instructors" className="rounded-lg px-3 py-2 transition-colors hover:bg-muted hover:text-foreground">{t("nav.driving_instructors", "Instruktorlar")}</Link>
                        <Link href="/pricing" className="rounded-lg px-3 py-2 transition-colors hover:bg-muted hover:text-foreground">{t("nav.pricing")}</Link>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <div className="hidden lg:block">
                        <LanguageSwitcher />
                    </div>
                    <div className="hidden lg:block">
                        <ThemeToggle />
                    </div>
                    <Link
                        href="/contact"
                        className="hidden h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground lg:inline-flex"
                        aria-label="Aloqa"
                        title="Aloqa"
                    >
                        <Headset className="h-4 w-4" />
                    </Link>
                    <Button asChild size="sm" className="hidden rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm hover:brightness-110 lg:inline-flex">
                        <Link href="/tests?mode=adaptive">{t("nav.start_test")}</Link>
                    </Button>
                    <Link href="/login" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground lg:inline">
                        {t("nav.login")}
                    </Link>
                    <Button asChild size="sm" className="hidden rounded-xl bg-emerald-500 hover:bg-emerald-400 lg:inline-flex">
                        <Link href="/register">{t("nav.register")}</Link>
                    </Button>
                    <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted lg:hidden"
                        aria-label="Menyu"
                        onClick={() => setMobileOpen(true)}
                    >
                        <Menu className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </nav>
        {mobileOpen ? (
            <div className="fixed inset-0 z-[60] lg:hidden">
                <button
                    type="button"
                    className="absolute inset-0 bg-black/55 backdrop-blur-sm"
                    aria-label="Menyuni yopish"
                    onClick={() => setMobileOpen(false)}
                />
                <div className="absolute inset-y-0 left-0 w-full max-w-sm border-r border-border bg-background p-4 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between">
                        <p className="text-base font-semibold">Menyu</p>
                        <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border"
                            aria-label="Yopish"
                            onClick={() => setMobileOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="space-y-1 overflow-y-auto">
                        <div className="flex items-center gap-2 px-1 pb-2">
                            <LanguageSwitcher compact />
                            <ThemeToggle />
                        </div>
                        <Link href="/" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">{t("nav.product")}</Link>
                        <Link href="/tests?mode=adaptive" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">{t("nav.tests")}</Link>
                        <Link href="/driving-schools" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">{t("nav.driving_schools", "Avtomaktablar")}</Link>
                        <Link href="/driving-instructors" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">{t("nav.driving_instructors", "Instruktorlar")}</Link>
                        <Link href="/pricing" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">{t("nav.pricing")}</Link>
                        <Link href="/contact" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">Aloqa</Link>
                        <div className="my-2 h-px bg-border" />
                        <Link href="/login" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">{t("nav.login")}</Link>
                        <Link href="/register" className="block rounded-md px-3 py-2 text-sm font-medium text-emerald-500 hover:bg-muted">{t("nav.register")}</Link>
                    </div>
                </div>
            </div>
        ) : null}
        </>
    );
}
