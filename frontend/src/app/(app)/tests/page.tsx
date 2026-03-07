"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Crown, Infinity, Lock, Sparkles } from "lucide-react";

import api from "@/lib/axios";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/store/useAuth";
import { FreeTestStatus } from "@/types/test";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumUpgradeDialog } from "@/components/tests/PremiumUpgradeDialog";

const QUESTION_COUNTS = [20, 30, 40, 50] as const;

export default function TestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hydrated, loading: authLoading, fetchUser } = useAuth();

  const [questionCount, setQuestionCount] = useState(20);
  const [freeStatus, setFreeStatus] = useState<FreeTestStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeCopy, setUpgradeCopy] = useState({
    title: "Premium imkoniyatlari yopiq",
    description: "Premium bilan cheksiz testlar, adaptiv AI testlari va batafsil analitikani ochasiz.",
  });
  const limitTrackedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || authLoading || user) {
      return;
    }
    void fetchUser();
  }, [hydrated, authLoading, user, fetchUser]);

  const hasPremiumAccess = user?.plan === "premium" || user?.is_admin === true;
  const pressureEnabled = searchParams.get("pressure") === "true";
  const completed = searchParams.get("completed") === "1";

  useEffect(() => {
    if (!hydrated || authLoading || !user) {
      return;
    }

    if (hasPremiumAccess) {
      setFreeStatus({
        attempts_used_today: 0,
        attempts_limit: 0,
        attempts_remaining: 999999,
        limit_reached: false,
        is_premium: true,
      });
      setStatusLoading(false);
      return;
    }

    let cancelled = false;
    setStatusLoading(true);

    async function loadStatus() {
      try {
        const response = await api.get<FreeTestStatus>("/tests/free-status");
        if (!cancelled) {
          setFreeStatus(response.data);
        }
      } catch {
        if (!cancelled) {
          setFreeStatus(null);
        }
      } finally {
        if (!cancelled) {
          setStatusLoading(false);
        }
      }
    }

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [hydrated, authLoading, user, hasPremiumAccess]);

  useEffect(() => {
    if (!freeStatus || hasPremiumAccess || !freeStatus.limit_reached || limitTrackedRef.current) {
      return;
    }
    limitTrackedRef.current = true;
    void trackEvent("daily_limit_reached", {
      attempts_used_today: freeStatus.attempts_used_today,
      attempts_limit: freeStatus.attempts_limit,
      location: "tests_start_page",
    });
  }, [freeStatus, hasPremiumAccess]);

  const usageLabel = useMemo(() => {
    if (hasPremiumAccess) {
      return "∞ / unlimited";
    }
    if (!freeStatus) {
      return "-- / 2";
    }
    return `${freeStatus.attempts_used_today}/${freeStatus.attempts_limit} attempts used`;
  }, [freeStatus, hasPremiumAccess]);

  const openUpgradeModal = (source: string, count?: number) => {
    setUpgradeCopy({
      title: "Premium bilan ko'proq imkoniyat ochiladi",
      description: "Cheksiz testlar, adaptive AI rejimi va batafsil analytics Premium tarifda mavjud.",
    });
    setUpgradeOpen(true);
    void trackEvent("premium_upgrade_click", {
      source,
      count,
    });
  };

  const handleCountClick = (count: number) => {
    if (!hasPremiumAccess && count !== 20) {
      openUpgradeModal("locked_question_count", count);
      return;
    }
    setQuestionCount(count);
  };

  const handleFreeStart = async () => {
    if (hasPremiumAccess) {
      router.push(`/tests/adaptive?count=${questionCount}${pressureEnabled ? "&pressure=true" : ""}`);
      return;
    }

    if (freeStatus?.limit_reached) {
      setUpgradeCopy({
        title: "Bugungi urinishlar soni tugadi",
        description: "Premium bilan cheksiz test yeching va adaptive AI rejimini oching.",
      });
      setUpgradeOpen(true);
      void trackEvent("premium_upgrade_click", { source: "daily_limit_exhausted" });
      return;
    }

    router.push("/tests/free?count=20");
  };

  const handleAdaptiveStart = () => {
    if (!hasPremiumAccess) {
      openUpgradeModal("adaptive_mode_locked");
      return;
    }
    router.push(`/tests/adaptive?count=${questionCount}${pressureEnabled ? "&pressure=true" : ""}`);
  };

  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">Test rejimlari</h1>
          <p className="text-muted-foreground">
            Free foydalanuvchilar uchun kuniga 2 ta random test. Premium bilan adaptive AI va cheksiz urinishlar ochiladi.
          </p>
        </div>

        {completed ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Test yakunlandi. Kunlik limit indikatori yangilandi.
          </div>
        ) : null}

        <Card className="border-border bg-card/90">
          <CardHeader className="pb-4">
            <CardTitle>Kunlik limit</CardTitle>
            <CardDescription>
              {hasPremiumAccess ? "Premium foydalanuvchilar uchun cheklov yo'q." : "Free foydalanuvchilar kuniga 2 ta random test ishlata oladi."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border bg-background px-4 py-3 text-lg font-semibold">
                {statusLoading ? "..." : usageLabel}
              </div>
              {hasPremiumAccess ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
                  <Infinity className="h-4 w-4" />
                  Unlimited
                </div>
              ) : null}
            </div>

            {!hasPremiumAccess && freeStatus?.limit_reached ? (
              <div className="flex flex-col items-start gap-3 md:items-end">
                <div className="text-sm text-amber-300">Bugungi urinishlar soni tugadi</div>
                <Button onClick={() => openUpgradeModal("daily_limit_banner")}>
                  Premium bilan cheksiz test yeching
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <span className="mr-2 text-sm font-medium text-muted-foreground">Question count:</span>
          {QUESTION_COUNTS.map((count) => {
            const locked = !hasPremiumAccess && count !== 20;
            return (
              <Button
                key={count}
                type="button"
                variant={questionCount === count ? "default" : "outline"}
                onClick={() => handleCountClick(count)}
                className={locked ? "gap-2 border-amber-500/30 text-amber-300" : ""}
              >
                {count}
                {locked ? <Lock className="h-4 w-4" /> : null}
              </Button>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {!hasPremiumAccess ? (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <CardTitle>Free random mode</CardTitle>
                <CardDescription>
                  20 ta random savol, kuniga 2 marta. Natijadan keyin to'liq hisobot ko'rsatilmaydi.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Random questions, instant feedback, auto-next. Analytics report yo'q.
                </div>
                <Button
                  onClick={handleFreeStart}
                  disabled={statusLoading || freeStatus?.limit_reached}
                  className="w-full"
                >
                  Free testni boshlash
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card className={`border-border shadow-sm ${hasPremiumAccess ? "lg:col-span-2" : ""}`}>
            <CardHeader>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
                <Crown className="h-5 w-5" />
              </div>
              <CardTitle>{hasPremiumAccess ? "Adaptive mode" : "Premium adaptive mode"}</CardTitle>
              <CardDescription>
                {hasPremiumAccess
                  ? "Adaptive algorithm, unlimited attempts va full analytics siz uchun ochiq."
                  : "Adaptive algorithm, unlimited attempts va full analytics faqat Premium'da ochiladi."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {hasPremiumAccess ? (
                  <>
                    Tanlangan savollar soni: <strong>{questionCount}</strong> | Unlimited tests | Full analytics
                  </>
                ) : (
                  <>
                    Tanlangan savollar soni: <strong>{questionCount}</strong>
                  </>
                )}
              </div>
              <Button onClick={handleAdaptiveStart} className="w-full">
                {hasPremiumAccess ? "Adaptive testni boshlash" : "Premium bilan ochish"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <PremiumUpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title={upgradeCopy.title}
        description={upgradeCopy.description}
      />
    </>
  );
}
