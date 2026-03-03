"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/store/useAuth";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/i18n-provider";
import { Bell, ChevronDown, Headset, Home, Mail, MessageCircle, Phone, Play, Settings, UserCircle2 } from "lucide-react";
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
    const [menuOpen, setMenuOpen] = useState(false);
    const [supportOpen, setSupportOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const supportRef = useRef<HTMLDivElement | null>(null);
    const profileRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!user) {
            return;
        }
        let isMounted = true;
        const loadNotifications = async () => {
            try {
                const data = await getNotifications();
                if (isMounted) {
                    setNotifications(data);
                }
            } catch {
                // ignore polling fetch failures
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
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
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

    if (!user) return null;

    return (
        <nav className="h-16 border-b border-border bg-background px-6">
            <div className="flex h-full items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-sm font-medium text-foreground">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted">
                        <Home className="h-4 w-4" />
                        <span>Asosiy</span>
                    </Link>
                    <Link
                        href="/tests?mode=adaptive"
                        className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#1d8dff] to-[#16c2b8] px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                    >
                        <Play className="h-4 w-4" />
                        <span>{t("nav.start_test")}</span>
                    </Link>
                    <Link href="/driving-schools" className="px-3 py-2 hover:bg-muted rounded-md">{t("nav.driving_schools", "Avtomaktablar")}</Link>
                    <Link href="/driving-instructors" className="px-3 py-2 hover:bg-muted rounded-md">{t("nav.driving_instructors", "Instruktorlar")}</Link>
                    <Link href="/lessons" className="px-3 py-2 hover:bg-muted rounded-md">{t("nav.lessons")}</Link>
                    <Link href="/feedback" className="px-3 py-2 hover:bg-muted rounded-md">{t("nav.feedback")}</Link>
                    <Link href="/dashboard/history" className="px-3 py-2 hover:bg-muted rounded-md">{t("nav.history")}</Link>
                    {user.plan === "free" ? (
                        <Link href="/upgrade" className="font-bold text-[#F59E0B]">Upgrade (Free)</Link>
                    ) : (
                        <span className="rounded bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#F59E0B]">
                            {t("nav.premium")}
                        </span>
                    )}
                    <Link href={panelLink} className="px-3 py-2 bg-primary text-primary-foreground rounded-md">
                        {panelLabel}
                    </Link>
                </div>

                <div className="flex items-center gap-3">
                    <LanguageSwitcher compact />

                    <div className="relative" ref={supportRef}>
                        <button
                            type="button"
                            onClick={() => setSupportOpen((prev) => !prev)}
                            className="h-9 w-9 rounded-md border border-border flex items-center justify-center hover:bg-muted"
                            aria-label="Aloqa markazi"
                            title="Aloqa markazi"
                        >
                            <Headset className="w-4 h-4" />
                        </button>
                        {supportOpen ? (
                            <div className="absolute right-0 z-50 mt-2 w-80 rounded-md border border-border bg-card shadow-xl">
                                <div className="border-b border-border px-3 py-2">
                                    <p className="text-sm font-semibold">Aloqa markazi</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Savol yoki muammo bo‘lsa biz bilan bog‘laning.</p>
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
                                        Batafsil aloqa ma’lumotlari
                                    </Link>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setMenuOpen((prev) => !prev)}
                            className="relative h-9 w-9 rounded-md border border-border flex items-center justify-center hover:bg-muted"
                            aria-label="Notifications"
                        >
                            <Bell className="w-4 h-4" />
                            {unreadCount > 0 ? (
                                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            ) : null}
                        </button>
                        {menuOpen ? (
                            <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-md border border-border bg-card shadow-xl z-50">
                                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
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
                                                className={`w-full text-left px-3 py-3 hover:bg-muted/50 ${notification.is_read ? "opacity-70" : ""}`}
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
                                                <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <ThemeToggle />

                    <Link
                        href="/dashboard/settings"
                        className="h-9 w-9 rounded-md border border-border flex items-center justify-center hover:bg-muted"
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
                            <div className="absolute right-0 mt-2 w-64 rounded-md border border-border bg-card shadow-xl z-50">
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
    );
}
