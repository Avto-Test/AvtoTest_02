"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart2,
  Compass,
  Gauge,
  LineChart,
  Target,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { fetchWithSessionRefresh } from "@/lib/fetch-with-session";
import { useAuth } from "@/store/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatsCard } from "@/components/dashboard/StatsCard";

type TrendPoint = { label: string; value: number };
type ActivityPoint = { label: string; tests_count: number };

type TopicAccuracy = {
  topic: string;
  accuracy: number;
};

type DashboardOverviewPayload = {
  total_attempts: number;
  average_score: number;
  best_score: number;
  improvement_delta: number;
  improvement_direction: "up" | "down" | "stable";
  readiness_score: number;
  pass_probability: number;
  current_rank?: string | null;
  xp_total?: number | null;
};

type DashboardApiResponse = {
  overview: DashboardOverviewPayload;
  topic_breakdown: TopicAccuracy[];
  progress_trend: TrendPoint[];
  test_activity: ActivityPoint[];
};

function clampPercent(raw: number | undefined | null) {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function ChartContainer({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="h-64">
        {children}
      </CardContent>
    </Card>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <Compass className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actionLabel && actionHref && (
          <Button asChild size="sm">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  tone?: "primary" | "warning" | "success";
}) {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-600"
      : tone === "warning"
      ? "bg-amber-500/10 text-amber-700"
      : "bg-primary/10 text-primary";

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses}`}>
          <Icon className="h-4 w-4" />
        </div>
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full" size="sm">
          <Link href={href}>Start</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function WeakTopicsList({
  topics,
}: {
  topics: TopicAccuracy[];
}) {
  if (!topics.length) {
    return (
      <EmptyState
        title="No weak topics yet"
        description="Once you complete a few tests, we’ll highlight topics that need more practice."
        actionLabel="Start Practice"
        actionHref="/tests"
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-foreground">Weak topics</CardTitle>
        <p className="text-xs text-muted-foreground">
          Focus areas where your accuracy is below 70%.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {topics.map((item) => (
          <Link
            key={item.topic}
            href={`/tests?topic=${encodeURIComponent(item.topic)}`}
            className="block rounded-lg border border-transparent px-2 py-1.5 text-sm transition-colors hover:border-primary/20 hover:bg-muted/60"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">{item.topic}</span>
              <span className="text-xs text-muted-foreground">
                {clampPercent(item.accuracy).toFixed(0)}%
              </span>
            </div>
            <Progress value={clampPercent(item.accuracy)} className="h-1.5" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export function DashboardOverview() {
  const { user, signOut } = useAuth();
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const response = await fetchWithSessionRefresh("/api/analytics/dashboard", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (response.status === 401) {
          signOut();
          if (typeof window !== "undefined") {
            const next = `${window.location.pathname}${window.location.search}`;
            window.location.replace(`/login?next=${encodeURIComponent(next)}`);
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Dashboard API failed: ${response.status}`);
        }

        const payload = (await response.json()) as DashboardApiResponse;
        if (!active) return;
        setData(payload);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load dashboard analytics:", error);
        setData(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, [signOut]);

  const displayName = user?.full_name || user?.email?.split("@")[0] || "Learner";

  const overview = data?.overview;
  const activitySeriesRaw = data?.test_activity ?? [];

  const weakTopics = useMemo(
    () =>
      (data?.topic_breakdown ?? [])
        .filter((x) => typeof x.accuracy === "number")
        .map((x) => ({ ...x, accuracy: clampPercent(x.accuracy) }))
        .filter((x) => x.accuracy < 70)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 6),
    [data?.topic_breakdown],
  );

  const hasAnyData = (overview?.total_attempts ?? 0) > 0;

  const accuracy = clampPercent(overview?.average_score ?? 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!overview || !hasAnyData) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="No progress yet"
          description="Start your first practice session to see your progress here."
          action={
            <Button asChild>
              <Link href="/tests">Start Practice</Link>
            </Button>
          }
        />
        <EmptyState
          title="No progress yet"
          description="Start your first practice session to see your learning statistics and weak topics."
          actionLabel="Start Practice"
          actionHref="/tests"
        />
      </div>
    );
  }

  const xpValue = overview.xp_total ?? overview.total_attempts * 10;
  const rankLabel = overview.current_rank ?? "Rising learner";

  const activitySeries = activitySeriesRaw.length
    ? activitySeriesRaw
    : [{ label: "Today", tests_count: 0 }];

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`Dashboard`}
        description={`Hi ${displayName}, here is your learning overview for the driving exam.`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/analytics">
              <BarChart2 className="mr-2 h-4 w-4" />
              Open Analytics
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="XP"
          value={xpValue}
          description="Estimated learning XP"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatsCard
          title="Current rank"
          value={rankLabel}
          description="Relative position among learners"
          icon={<Gauge className="h-4 w-4" />}
        />
        <StatsCard
          title="Completed tests"
          value={overview.total_attempts}
          description="Total finished attempts"
          icon={<Target className="h-4 w-4" />}
        />
        <StatsCard
          title="Average accuracy"
          value={`${accuracy.toFixed(0)}%`}
          description="Across all completed tests"
          icon={<LineChart className="h-4 w-4" />}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <ChartContainer
          title="Weekly activity"
          description="How many tests you completed each day."
        >
          {activitySeriesRaw.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activitySeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(59,130,246,0.08)" }}
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "#e5e7eb",
                    fontSize: 12,
                  }}
                  formatter={(value) => [value as number, "Tests"]}
                />
                <Bar
                  dataKey="tests_count"
                  radius={[6, 6, 0, 0]}
                  fill="url(#activityFill)"
                />
                <defs>
                  <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground px-4 text-center">
              No activity yet — start your first practice session to see your weekly chart here.
            </div>
          )}
        </ChartContainer>

        <div className="space-y-4">
          <SectionHeader
            title="Quick actions"
            description="Jump back into practice or run a full simulation."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <QuickActionCard
              icon={Activity}
              title="Start practice"
              description="Adaptive practice sessions based on your level."
              href="/tests"
              tone="primary"
            />
            <QuickActionCard
              icon={Gauge}
              title="Start simulation exam"
              description="Full exam simulation with real constraints."
              href="/tests?pressure=true"
              tone="warning"
            />
            <QuickActionCard
              icon={BarChart2}
              title="Continue learning"
              description="Pick up where you left in learning mode."
              href="/learning/session"
              tone="success"
            />
          </div>
        </div>
      </section>

      <section>
        <WeakTopicsList topics={weakTopics} />
      </section>
    </div>
  );
}

