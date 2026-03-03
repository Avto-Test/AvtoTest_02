"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/store/useAuth";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/i18n-provider";
import {
    Bell,
    ChevronDown,
    Headset,
    Home,
    Mail,
    Menu,
    MessageCircle,
    Phone,
    Play,
    Settings,
    UserCircle2,
    X,
} from "lucide-react";
import {
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    UserNotification,
} from "@/lib/notifications";

export default function AppNavbar() {
    const { user, signOut } = useAuth();
    const { t } = useI18n();
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [supportOpen, setSupportOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    const notificationsRef = useRef<HTMLDivElement | null>(null);
    const supportRef = useRef<HTMLDivElement | null>(null);
    const profileRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!user) return;

        let isMounted = true;
        const loadNotifications = async () => {
            try {
                const data = await getNotifications();
                if (isMounted) setNotifications(data);
            } catch {
                // ignore polling errors
            }
        };

        void loadNotifications();
        const intervalId = window.setInterval(() => {
            void loadNotifications();
        }, 8000);

        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
        };
    }, [user]);

    useEffect(() => {
        function onDocumentClick(event: MouseEvent) {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setNotificationsOpen(false);
            }
            if (supportRef.current && !supportRef.current.contains(event.target as Node)) {
                setSupportOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setProfileOpen(false);
            }
        }

        document.addEventListener("mousedown", onDocumentClick);
        return () => document.removeEventListener("mousedown", onDocumentClick);
    }, []);

    const unreadCount = useMemo(
        () => notifications.filter((item) => !item.is_read).length,
        [notifications]
    );

    const userInitial = useMemo(() => {
        const source = user?.full_name?.trim() || user?.email?.trim() || "U";
        return source.charAt(0).toUpperCase();
    }, [user?.email, user?.full_name]);

    const panelLink = useMemo(() => {
        if (!user) return "/dashboard";
        if (user.is_admin) return "/admin";
        if (user.has_school_profile) return "/school/dashboard";
        if (user.has_instructor_profile) return "/instructor/dashboard";
        return "/dashboard";
    }, [user]);

    const panelLabel = useMemo(() => {
        if (!user) return "Panel";
        if (user.is_admin) return t("nav.admin", "Admin");
        if (user.has_school_profile) return "Maktab paneli";
        if (user.has_instructor_profile) return "Instruktor paneli";
        return "Panel";
    }, [t, user]);

    const primaryLinks = useMemo(
        () => [
            { href: "/driving-schools", label: t("nav.driving_schools", "Avtomaktablar") },
            { href: "/driving-instructors", label: t("nav.driving_instructors", "Instruktorlar") },
            { href: "/lessons", label: t("nav.lessons") },
            { href: "/feedback", label: t("nav.feedback") },
            { href: "/dashboard/history", label: t("nav.history") },
        ],
        [t]
    );

    if (!user) return null;

    return (
        <>
            <nav className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
                <div className="mx-auto flex h-16 w-full max-w-[1700px] min-w-0 items-center gap-2 px-2 sm:px-4 xl:px-6">
                    <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted xl:hidden"
                        onClick={() => setMobileNavOpen(true)}
                        aria-label="Menyu"
                    >
                        <Menu className="h-4 w-4" />
                    </button>

                    <Link
                        href="/dashboard"
                        className="hidden items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted lg:inline-flex"
                    >
                        <Home className="h-4 w-4" />
                        <span>Asosiy</span>
                    </Link>

                    <Link
                        href="/tests?mode=adaptive"
                        className="hidden h-10 items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#1d8dff] to-[#16c2b8] px-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 sm:px-4 lg:inline-flex"
                    >
                        <Play className="h-4 w-4" />
                        <span>{t("nav.start_test")}</span>
                    </Link>

                    <div className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto xl:flex">
                        {primaryLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="shrink-0 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                            >
                                {link.label}
                            </Link>
                        ))}
                        {user.plan === "free" ? (
                            <Link
                                href="/upgrade"
                                className="ml-2 shrink-0 rounded-md px-3 py-2 text-sm font-bold text-[#F59E0B] hover:bg-muted"
                            >
                                Upgrade (Free)
                            </Link>
                        ) : (
                            <span className="ml-2 inline-flex shrink-0 rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#F59E0B]">
                                {t("nav.premium")}
                            </span>
                        )}
                        <Link
                            href={panelLink}
                            className="ml-2 inline-flex shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                        >
                            {panelLabel}
                        </Link>
                    </div>

                    <div className="ml-auto flex shrink-0 items-center gap-2">
                        <div className="hidden md:block">
                            <LanguageSwitcher compact />
                        </div>

                        <div className="relative hidden lg:block" ref={supportRef}>
                            <button
                                type="button"
                                onClick={() => setSupportOpen((prev) => !prev)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
                                aria-label="Aloqa markazi"
                                title="Aloqa markazi"
                            >
                                <Headset className="h-4 w-4" />
                            </button>
                            {supportOpen ? (
                                <div className="absolute right-0 z-[60] mt-2 w-80 rounded-md border border-border bg-card shadow-xl">
                                    <div className="border-b border-border px-3 py-2">
                                        <p className="text-sm font-semibold">Aloqa markazi</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Savol yoki muammo bo&apos;lsa biz bilan bog&apos;laning.
                                        </p>
                                    </div>
                                    <div className="space-y-1 p-2">
                                        <a
                                            href="tel:+998900000000"
                                            className="flex items-center gap-2 rounded px-2 py-2 text-sm hover:bg-muted"
                                        >
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <span>+998 90 000 00 00</span>
                                        </a>
                                        <a
                                            href="https://t.me/autotest_support"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 rounded px-2 py-2 text-sm hover:bg-muted"
                                        >
                                            <MessageCircle className="h-4 w-4 text-muted-foreground" />
                                            <span>@autotest_support</span>
                                        </a>
                                        <a
                                            href="mailto:support@autotest.ai"
                                            className="flex items-center gap-2 rounded px-2 py-2 text-sm hover:bg-muted"
                                        >
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <span>support@autotest.ai</span>
                                        </a>
                                    </div>
                                    <div className="border-t border-border p-2">
                                        <Link
                                            href="/contact"
                                            className="block rounded px-2 py-2 text-sm font-medium text-primary hover:bg-muted"
                                        >
                                            Batafsil aloqa ma&apos;lumotlari
                                        </Link>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="relative" ref={notificationsRef}>
                            <button
                                type="button"
                                onClick={() => setNotificationsOpen((prev) => !prev)}
                                className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
                                aria-label="Bildirishnomalar"
                            >
                                <Bell className="h-4 w-4" />
                                {unreadCount > 0 ? (
                                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                ) : null}
                            </button>

                            {notificationsOpen ? (
                                <div className="absolute right-0 z-[60] mt-2 max-h-96 w-80 overflow-auto rounded-md border border-border bg-card shadow-xl">
                                    <div className="flex items-center justify-between border-b border-border px-3 py-2">
                                        <span className="text-sm font-semibold">Bildirishnomalar</span>
                                        <button
                                            type="button"
                                            className="text-xs text-primary hover:underline"
                                            onClick={() => {
                                                void markAllNotificationsRead().then(() => {
                                                    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
                                                });
                                            }}
                                        >
                                            Hammasini o&apos;qildi
                                        </button>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {notifications.length === 0 ? (
                                            <p className="px-3 py-4 text-sm text-muted-foreground">Hozircha bildirishnomalar yo&apos;q.</p>
                                        ) : (
                                            notifications.map((notification) => (
                                                <button
                                                    key={notification.id}
                                                    type="button"
                                                    className={`w-full px-3 py-3 text-left hover:bg-muted/50 ${notification.is_read ? "opacity-70" : ""}`}
                                                    onClick={() => {
                                                        if (!notification.is_read) {
                                                            void markNotificationRead(notification.id).then(() => {
                                                                setNotifications((prev) =>
                                                                    prev.map((item) =>
                                                                        item.id === notification.id ? { ...item, is_read: true } : item
                                                                    )
                                                                );
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <p className="text-sm font-medium">{notification.title}</p>
                                                    <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="hidden sm:block">
                            <ThemeToggle />
                        </div>

                        <Link
                            href="/dashboard/settings"
                            className="hidden h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted lg:inline-flex"
                            aria-label={t("nav.settings")}
                        >
                            <Settings className="h-4 w-4" />
                        </Link>

                        <div className="relative" ref={profileRef}>
                            <button
                                type="button"
                                onClick={() => setProfileOpen((prev) => !prev)}
                                className="inline-flex items-center gap-2 rounded-full border border-border px-2 py-1.5 hover:bg-muted"
                                aria-label="Account menu"
                            >
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                                    {userInitial}
                                </span>
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            {profileOpen ? (
                                <div className="absolute right-0 z-[60] mt-2 w-64 rounded-md border border-border bg-card shadow-xl">
                                    <div className="border-b border-border px-3 py-3">
                                        <div className="flex items-center gap-2">
                                            <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                                            <p className="text-sm font-medium">{user.full_name || "Foydalanuvchi"}</p>
                                        </div>
                                        <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                    <div className="p-2">
                                        <Link href="/dashboard" className="block rounded px-2 py-2 text-sm hover:bg-muted">Asosiy</Link>
                                        <Link href={panelLink} className="block rounded px-2 py-2 text-sm hover:bg-muted">{panelLabel}</Link>
                                        <Link href="/dashboard/history" className="block rounded px-2 py-2 text-sm hover:bg-muted">{t("nav.history")}</Link>
                                        <Link href="/dashboard/settings" className="block rounded px-2 py-2 text-sm hover:bg-muted">{t("nav.settings")}</Link>
                                        <button
                                            type="button"
                                            onClick={() => signOut()}
                                            className="block w-full rounded px-2 py-2 text-left text-sm text-red-500 hover:bg-muted"
                                        >
                                            {t("nav.sign_out")}
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </nav>

            {mobileNavOpen ? (
                <div className="fixed inset-0 z-50 xl:hidden">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
                        onClick={() => setMobileNavOpen(false)}
                        aria-label="Menyuni yopish"
                    />
                    <div className="absolute inset-y-0 left-0 flex w-full max-w-sm flex-col border-r border-border bg-background p-4 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-base font-semibold">Menyu</p>
                            <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border"
                                onClick={() => setMobileNavOpen(false)}
                                aria-label="Yopish"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-1 overflow-y-auto">
                            <div className="mb-2 flex items-center gap-2 px-1">
                                <LanguageSwitcher compact />
                                <ThemeToggle />
                            </div>
                            <Link href="/dashboard" onClick={() => setMobileNavOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">Asosiy</Link>
                            <Link href="/tests?mode=adaptive" onClick={() => setMobileNavOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">{t("nav.start_test")}</Link>
                            {primaryLinks.map((link) => (
                                <Link key={link.href} href={link.href} onClick={() => setMobileNavOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                                    {link.label}
                                </Link>
                            ))}
                            <Link href={panelLink} onClick={() => setMobileNavOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">{panelLabel}</Link>
                            {user.plan === "free" ? (
                                <Link href="/upgrade" onClick={() => setMobileNavOpen(false)} className="block rounded-md px-3 py-2 text-sm font-bold text-[#F59E0B] hover:bg-muted">
                                    Upgrade (Free)
                                </Link>
                            ) : (
                                <div className="px-3 py-2">
                                    <span className="inline-flex rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#F59E0B]">
                                        {t("nav.premium")}
                                    </span>
                                </div>
                            )}
                            <Link href="/contact" onClick={() => setMobileNavOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">Aloqa</Link>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
