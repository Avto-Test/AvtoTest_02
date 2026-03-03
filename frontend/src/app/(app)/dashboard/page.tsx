"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/store/useAuth";
import api from "@/lib/axios";
import { createCheckoutSession } from "@/lib/billing";
import { trackEvent } from "@/lib/analytics";
import type { DashboardResponse } from "@/types/analytics";
import { toast } from "sonner";
import {
    RecentAttempts,
    LessonRecommendationsCard,
    RecommendationCard,
    SystemStatusBar
} from "@/components/dashboard";
import { ZonePrimaryAI } from "@/components/dashboard/zones/ZonePrimaryAI";
import { ZoneActionCenter } from "@/components/dashboard/zones/ZoneActionCenter";
import { ZonePerformance } from "@/components/dashboard/zones/ZonePerformance";
import { ZonePremium } from "@/components/dashboard/zones/ZonePremium";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";

type UpgradeCelebration = {
    gift: boolean;
};

export default function DashboardPage() {
    const { user, fetchUser } = useAuth();
    const { t } = useI18n();
    const searchParams = useSearchParams();
    const [overview, setOverview] = useState<DashboardResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [celebration, setCelebration] = useState<UpgradeCelebration | null>(null);
    const pressureEnabled = false;
    const handledUpgradeKeyRef = useRef<string | null>(null);
    const confettiPieces = useMemo(
        () =>
            Array.from({ length: 48 }, (_, index) => {
                const colors = ["#00B37E", "#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444"];
                return {
                    id: index,
                    color: colors[index % colors.length],
                    left: Math.random() * 100,
                    delay: Math.random() * 0.35,
                    duration: 1.8 + Math.random() * 1.2,
                    size: 5 + Math.random() * 7,
                    rotate: Math.random() * 360,
                };
            }),
        []
    );

    // Handle upgrade success
    useEffect(() => {
        const upgraded = searchParams.get("upgraded") === "true";
        if (!upgraded) return;
        if (typeof window !== "undefined") {
            const dedupKey = `upgrade-toast:${window.location.pathname}${window.location.search}`;
            if (window.sessionStorage.getItem(dedupKey) === "1") {
                return;
            }
            window.sessionStorage.setItem(dedupKey, "1");
            window.setTimeout(() => {
                window.sessionStorage.removeItem(dedupKey);
            }, 5000);
        }

        const gift = searchParams.get("gift") === "true";
        const key = `${upgraded ? "1" : "0"}:${gift ? "1" : "0"}`;
        if (handledUpgradeKeyRef.current === key) return;
        handledUpgradeKeyRef.current = key;

        trackEvent("upgrade_success", {
            source: "dashboard_return",
            gift,
        });

        setCelebration({ gift });
        toast.success(gift ? "Premium hadya qilindi!" : "Premium muvaffaqiyatli faollashtirildi!", {
            description: gift
                ? "Siz premium tarifni sovg'a sifatida oldingiz."
                : `${t("nav.premium")} yoqildi.`,
        });

        if (typeof window !== "undefined") {
            window.history.replaceState(window.history.state, "", "/dashboard");
        }

        void fetchUser().catch(() => undefined);

        const timer = window.setTimeout(() => {
            setCelebration(null);
        }, 2400);

        return () => window.clearTimeout(timer);
    }, [searchParams, fetchUser, t]);

    useEffect(() => {
        async function loadAnalytics() {
            try {
                const { data } = await api.get("/analytics/me/dashboard");
                setOverview(data);
            } catch (err) {
                console.error("Failed to load analytics:", err);
            } finally {
                setIsLoading(false);
            }
        }

        loadAnalytics();
    }, []);

    // Memoize overview for zones
    const dashboardData = useMemo(() => {
        if (!overview) return null;
        return overview.overview;
    }, [overview]);

    const recommendation = useMemo(() => {
        return overview?.recommendation || null;
    }, [overview]);
    const lessonRecommendations = useMemo(() => {
        return overview?.lesson_recommendations || [];
    }, [overview]);

    const userDisplayName = user?.full_name || user?.email?.split("@")[0] || "User";
    const lastAttempt = dashboardData?.last_attempts?.[0] ?? null;
    const todayAttemptCount = useMemo(() => {
        if (!dashboardData?.last_attempts?.length) return 0;
        const today = new Date().toDateString();
        return dashboardData.last_attempts.filter((item) => {
            if (!item.finished_at) return false;
            return new Date(item.finished_at).toDateString() === today;
        }).length;
    }, [dashboardData?.last_attempts]);

    if (isLoading && !dashboardData) {
        return (
            <div className="space-y-8 max-w-7xl mx-auto pb-8">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                    <Skeleton className="lg:col-span-2 h-48 rounded-2xl" />
                    <Skeleton className="lg:col-span-1 h-48 rounded-2xl" />
                </div>
                <Skeleton className="h-32 w-full rounded-2xl" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array(4).fill(0).map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-12 max-w-7xl mx-auto pb-12 px-4 md:px-0">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">{t("dashboard.title")}</h1>
                        <p className="text-muted-foreground">
                            {t("dashboard.subtitle").replace("{name}", userDisplayName)}
                        </p>
                    </div>
                </div>

                {!dashboardData || dashboardData.total_attempts === 0 ? (
                    <div className="space-y-10">
                        <Card className="border-dashed border-2 bg-card/60">
                            <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <div className="p-4 bg-background rounded-full shadow-sm">
                                    <TrendingUp className="w-8 h-8 text-[#00B37E]" />
                                </div>
                                <div className="space-y-2 max-w-sm">
                                    <h3 className="text-xl font-bold text-foreground">{t("dashboard.start_title")}</h3>
                                    <p className="text-muted-foreground text-sm">{t("dashboard.start_desc")}</p>
                                </div>
                                <Button asChild className="bg-[#00B37E] hover:bg-[#009468]">
                                    <Link href="/tests">{t("dashboard.take_first_test")}</Link>
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Keep premium intelligence visible even before first attempt */}
                        <ZonePremium
                            overview={overview || {}}
                            user={user}
                        />

                        <RecommendationCard
                            recommendation={recommendation}
                            isPremium={user?.plan === "premium"}
                            onUpgrade={createCheckoutSession}
                        />
                        <LessonRecommendationsCard
                            lessons={lessonRecommendations}
                            isPremium={user?.plan === "premium"}
                        />

                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* SYSTEM STATUS BAR */}
                        <SystemStatusBar
                            driftStatus={dashboardData.drift_status}
                            modelVersion={dashboardData.model_version}
                            lastRetrained={dashboardData.last_retrained}
                            inferenceLatency={dashboardData.inference_latency}
                        />

                        {/* ZONE A: PRIMARY AI */}
                        <ZonePrimaryAI
                            overview={dashboardData}
                            user={user}
                        />

                        {/* PRIORITY: LAST RESULT + TODAY PROGRESS + NEXT RECOMMENDATION */}
                        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                            <div className="space-y-6">
                                <RecommendationCard
                                    recommendation={recommendation}
                                    isPremium={user?.plan === "premium"}
                                    onUpgrade={createCheckoutSession}
                                />
                                <div className="grid gap-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-xl font-bold text-foreground">{t("dashboard.recent_activity")}</h2>
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href="/dashboard/history">{t("nav.history")}</Link>
                                        </Button>
                                    </div>
                                    <RecentAttempts attempts={dashboardData?.last_attempts || []} />
                                </div>
                            </div>

                            <Card className="h-fit border-border/80 bg-card/80">
                                <CardContent className="space-y-4 p-5">
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                        Bugungi holat
                                    </h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Oxirgi natija</span>
                                            <span className="font-semibold text-foreground">
                                                {lastAttempt ? `${Math.round(lastAttempt.score)}%` : "Noma'lum"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Bugungi progress</span>
                                            <span className="font-semibold text-foreground">{todayAttemptCount} ta urinish</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Keyingi tavsiya</span>
                                            <span className="max-w-[180px] truncate text-right font-semibold text-foreground">
                                                {recommendation?.topic || "Mavzu tavsiyasi tayyorlanmoqda"}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* ZONE B: PERFORMANCE SNAPSHOT */}
                        <ZonePerformance
                            overview={dashboardData}
                            user={user}
                        />

                        {/* ZONE D: ACTION CENTER */}
                        <ZoneActionCenter
                            pressureEnabled={pressureEnabled}
                        />

                        {/* ZONE C: PREMIUM INTELLIGENCE */}
                        <ZonePremium
                            overview={overview}
                            user={user}
                        />

                        {/* Footer */}
                        <div className="space-y-8">
                            <LessonRecommendationsCard
                                lessons={lessonRecommendations}
                                isPremium={user?.plan === "premium"}
                            />
                        </div>
                    </div>
                )}
            </div>

            {celebration ? (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/70 backdrop-blur-sm">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        {confettiPieces.map((piece) => (
                            <span
                                key={piece.id}
                                className="absolute top-[-10%] block rounded-[2px]"
                                style={{
                                    left: `${piece.left}%`,
                                    width: `${piece.size}px`,
                                    height: `${piece.size * 0.4}px`,
                                    backgroundColor: piece.color,
                                    transform: `rotate(${piece.rotate}deg)`,
                                    animation: `dashboard-confetti-fall ${piece.duration}s linear ${piece.delay}s forwards`,
                                }}
                            />
                        ))}
                    </div>

                    <Card className="relative mx-4 w-full max-w-lg border-[#00B37E]/40 shadow-2xl">
                        <CardContent className="space-y-4 py-8 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#00B37E]/15 text-[#00B37E]">
                                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-foreground">Tabriklaymiz!</h3>
                            <p className="text-base text-foreground">
                                {celebration.gift
                                    ? "Siz premiumni sovg'a sifatida oldingiz."
                                    : "Premium tarifingiz muvaffaqiyatli faollashtirildi."}
                            </p>
                            <p className="text-sm text-muted-foreground">Premium imkoniyatlar hozir yoqildi.</p>
                        </CardContent>
                    </Card>

                    <style jsx>{`
                        @keyframes dashboard-confetti-fall {
                            0% {
                                transform: translate3d(0, 0, 0) rotate(0deg);
                                opacity: 0;
                            }
                            10% {
                                opacity: 1;
                            }
                            100% {
                                transform: translate3d(0, 110vh, 0) rotate(720deg);
                                opacity: 0.1;
                            }
                        }
                    `}</style>
                </div>
            ) : null}
        </>
    );
}
