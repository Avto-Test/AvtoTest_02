"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, BookOpen, Clock, Gauge, Infinity, Lock, Sparkles, Target } from "lucide-react";

import api from "@/lib/axios";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/store/useAuth";
import type { FreeTestStatus } from "@/types/test";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumUpgradeDialog } from "@/components/tests/PremiumUpgradeDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { fetchWithSessionRefresh } from "@/lib/fetch-with-session";

const QUESTION_COUNTS = [20, 30, 40, 50] as const;

type AttemptSummary = {
  id: string;
  test_title: string;
  score: number;
  finished_at: string | null;
};

type TopicAccuracy = {
  topic: string;
  accuracy: number;
};

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
  const [recentAttempts, setRecentAttempts] = useState<AttemptSummary[]>([]);
  const [topics, setTopics] = useState<TopicAccuracy[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    if (!hydrated || authLoading || user) {
      return;
    }

    void fetchUser();
  }, [hydrated, authLoading, user, fetchUser]);

  const hasPremiumAccess = user?.plan === "premium" || user?.is_admin === true;
  const pressureEnabled = searchParams.get("pressure") === "true";
  const completed = searchParams.get("completed") === "1";
  const focusedTopic = searchParams.get("topic")?.trim() ?? "";

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      try {
        setAnalyticsLoading(true);
        const response = await fetchWithSessionRefresh("/api/analytics/dashboard", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }
        const payload = await response.json() as {
          overview?: { last_attempts?: AttemptSummary[] };
          topic_breakdown?: TopicAccuracy[];
        };
        if (!active) return;
        setRecentAttempts(payload.overview?.last_attempts ?? []);
        setTopics(payload.topic_breakdown ?? []);
      } finally {
        if (active) {
          setAnalyticsLoading(false);
        }
      }
    }

    void loadAnalytics();
    return () => {
      active = false;
    };
  }, []);

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
      return "∞ / cheksiz";
    }
    if (!freeStatus) {
      return "-- / 2";
    }

    return `${freeStatus.attempts_used_today}/${freeStatus.attempts_limit} urinish ishlatildi`;
  }, [freeStatus, hasPremiumAccess]);

  const topicQuerySuffix = focusedTopic ? `&topic=${encodeURIComponent(focusedTopic)}` : "";

  const clearFocusedTopic = () => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("topic");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `/tests?${nextQuery}` : "/tests");
  };

  const openUpgradeModal = (source: string, count?: number) => {
    setUpgradeCopy({
      title: "Premium bilan ko'proq imkoniyat ochiladi",
      description: "Cheksiz testlar, adaptiv AI rejimi va batafsil analitika Premium tarifda mavjud.",
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
      router.push(`/tests/adaptive?count=${questionCount}${pressureEnabled ? "&pressure=true" : ""}${topicQuerySuffix}`);
      return;
    }

    if (freeStatus?.limit_reached) {
      setUpgradeCopy({
        title: "Bugungi urinishlar soni tugadi",
        description: "Premium bilan cheksiz test yeching va adaptiv AI rejimini oching.",
      });
      setUpgradeOpen(true);
      void trackEvent("premium_upgrade_click", { source: "daily_limit_exhausted" });
      return;
    }

    router.push(`/tests/free?count=20${topicQuerySuffix}`);
  };

  const handleAdaptiveStart = () => {
    if (!hasPremiumAccess) {
      openUpgradeModal("adaptive_mode_locked");
      return;
    }

    router.push(`/tests/adaptive?count=${questionCount}${pressureEnabled ? "&pressure=true" : ""}${topicQuerySuffix}`);
  };

  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">
            Practice Mode
          </h1>
          <p className="text-sm text-muted-foreground">
            Improve your driving knowledge with targeted practice sessions.
          </p>
        </div>

        {completed ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900">
            The latest test has finished and your daily usage has been updated.
          </div>
        ) : null}

        {focusedTopic ? (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.08)]"
            aria-label={`Recommended focus topic ${focusedTopic}`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              <span>
                Focus topic: <span className="font-semibold text-white">{focusedTopic}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={clearFocusedTopic}
              className="rounded-lg border border-cyan-300/25 bg-cyan-400/5 px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/10"
            >
              Clear focus
            </button>
          </div>
        ) : null}

        {/* Practice modes */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Activity className="h-5 w-5" />
              </div>
              <CardTitle>Practice tests</CardTitle>
              <CardDescription>Adaptive practice questions based on your level.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Free users get 2 random tests per day. Premium unlocks adaptive AI practice and full analytics.
              </p>
              <Button
                className="w-full"
                type="button"
                onClick={() => {
                  if (hasPremiumAccess) {
                    handleAdaptiveStart();
                  } else {
                    void handleFreeStart();
                  }
                }}
              >
                Start Practice
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Gauge className="h-5 w-5" />
              </div>
              <CardTitle>Simulation exam</CardTitle>
              <CardDescription>
                Full exam simulation under real test conditions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                type="button"
                onClick={() => router.push("/tests?pressure=true")}
              >
                Start Simulation
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between md:col-span-2 xl:col-span-1">
            <CardHeader className="pb-3">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <BookOpen className="h-5 w-5" />
              </div>
              <CardTitle>Learning session</CardTitle>
              <CardDescription>
                Guided learning with explanations and structured topics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                type="button"
                onClick={() => router.push("/learning/session")}
              >
                Continue Learning
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Daily limit + question count */}
        <section className="space-y-4">
          <Card className="border-border bg-card/90">
            <CardHeader className="pb-4">
              <CardTitle>Daily limit</CardTitle>
              <CardDescription>
                {hasPremiumAccess
                  ? "Premium users have no daily test limit."
                  : "Free users can take 2 random tests per day."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-border bg-background px-4 py-3 text-lg font-semibold">
                  {statusLoading ? "..." : usageLabel}
                </div>
                {hasPremiumAccess ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-600">
                    <Infinity className="h-4 w-4" />
                    Unlimited
                  </div>
                ) : null}
              </div>

              {!hasPremiumAccess && freeStatus?.limit_reached ? (
                <div className="flex flex-col items-start gap-3 md:items-end">
                  <div className="text-sm text-amber-700">Bugungi barcha urinishlar ishlatildi.</div>
                  <Button onClick={() => openUpgradeModal("daily_limit_banner")}>
                    Unlock unlimited tests with Premium
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
            <span className="mr-2 text-sm font-medium text-muted-foreground">Number of questions:</span>
            {QUESTION_COUNTS.map((count) => {
              const locked = !hasPremiumAccess && count !== 20;
              return (
                <Button
                  key={count}
                  type="button"
                  variant={questionCount === count ? "default" : "outline"}
                  onClick={() => handleCountClick(count)}
                  className={locked ? "gap-2 border-amber-500/30 text-amber-600" : ""}
                >
                  {count}
                  {locked ? <Lock className="h-4 w-4" /> : null}
                </Button>
              );
            })}
          </div>
        </section>

        {/* Recent attempts and topic practice */}
        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Recent attempts
              </CardTitle>
              <CardDescription>Your latest completed tests.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analyticsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-36" />
                </div>
              ) : recentAttempts.length ? (
                recentAttempts.slice(0, 5).map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-card/80 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground line-clamp-1">
                        {attempt.test_title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {attempt.finished_at
                          ? new Date(attempt.finished_at).toLocaleDateString()
                          : "In progress"}
                      </p>
                    </div>
                    <span className="ml-3 rounded-md bg-muted px-2 py-1 text-xs font-semibold text-primary">
                      {attempt.score}%
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Siz hali test ishlamagansiz.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                Topic practice
              </CardTitle>
              <CardDescription>Focus on topics where you make mistakes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analyticsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-52" />
                </div>
              ) : topics.length ? (
                topics
                  .slice()
                  .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
                  .slice(0, 6)
                  .map((topic) => (
                    <button
                      key={topic.topic}
                      type="button"
                      onClick={() => router.push(`/tests?topic=${encodeURIComponent(topic.topic)}`)}
                      className="w-full rounded-lg border border-border/60 bg-card/80 px-3 py-2 text-left text-sm hover:border-primary/30 hover:bg-muted/70"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground line-clamp-1">
                          {topic.topic}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {Math.max(0, Math.min(100, topic.accuracy ?? 0)).toFixed(0)}%
                        </span>
                      </div>
                      <Progress
                        value={Math.max(0, Math.min(100, topic.accuracy ?? 0))}
                        className="h-1.5"
                      />
                    </button>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Topic analytics are not available yet. Complete a few tests to unlock focused topic
                  practice.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
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
