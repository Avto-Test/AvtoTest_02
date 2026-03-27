"use client";

import { Brain, ShieldCheck, Sparkles, Target } from "lucide-react";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/app-shell";
import { ReadinessRing } from "@/components/charts/readiness-ring";
import { TopicRadar } from "@/components/charts/topic-radar";
import { useAnalytics } from "@/hooks/use-analytics";
import {
  buildLearningPathTopicProgress,
  masteryStateMeta,
  PRIMARY_TOPIC_VISUALIZATION_TOPICS,
} from "@/lib/learning";
import { Badge } from "@/shared/ui/badge";
import { ChartContainer } from "@/shared/ui/chart-container";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Progress } from "@/shared/ui/progress";

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
  });
}

function readinessStory(score: number, launchReady: boolean | undefined) {
  if (launchReady) {
    return "Simulyatsiyani boshlash uchun yetarli tayyorgarlikka erishdingiz.";
  }
  if (score >= 70) {
    return "Yakuniy mustahkamlash bosqichidasiz. Yana bir necha mashq foydali bo'ladi.";
  }
  if (score >= 45) {
    return "Asosiy baza shakllanmoqda. Zaif mavzularni ko'rib chiqish eng katta ta'sir beradi.";
  }
  return "Hozir asosiy mavzularni mustahkamlash va qisqa mashq bloklarini ko'paytirish muhim.";
}

function MetricTile({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)]/40 bg-[var(--card)] p-5 shadow-[var(--shadow-soft)] surface-hover-lift">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-caption font-medium text-[var(--muted-foreground)]">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          <p className="text-caption mt-1">{description}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
          <Icon className="h-5 w-5 text-[var(--primary)]" />
        </div>
      </div>
    </div>
  );
}

function AnalyticsPageContent() {
  const analytics = useAnalytics();
  const dashboard = analytics.dashboard;
  const summary = analytics.summary;

  const accuracyTrend = dashboard?.progress_trend ?? [];
  const confidenceScore = Math.round((dashboard?.overview.confidence_score ?? 0) * 100);
  const historyTrend = useMemo(
    () =>
      analytics.history.slice(-8).map((item) => ({
        label: formatShortDate(item.date),
        readiness: Math.round(item.readiness_score),
        confidence: Math.round(item.confidence * 100),
        passProbability: Math.round(item.pass_probability),
      })),
    [analytics.history],
  );
  const topicMastery = useMemo(() => {
    if (!dashboard) return [];
    return buildLearningPathTopicProgress(dashboard)
      .map((topic) => ({
        ...topic,
        meta: masteryStateMeta(topic.state),
      }))
      .sort((left, right) => left.mastery - right.mastery);
  }, [dashboard]);
  const radarData = useMemo(() => {
    const topicLookup = new Map(topicMastery.map((topic) => [topic.topic, topic]));
    return PRIMARY_TOPIC_VISUALIZATION_TOPICS.map((topicName) => {
      const topic = topicLookup.get(topicName);
      return {
        topic: topicName,
        mastery: topic?.mastery ?? 0,
        accuracy: topic?.accuracy ?? 0,
        retention: topic?.retention ?? 0,
      };
    });
  }, [topicMastery]);

  if (analytics.loading) {
    return (
      <div className="space-y-8">
        <div className="h-24 animate-pulse rounded-xl bg-[var(--muted)]/60" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-xl bg-[var(--muted)]/60" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl bg-[var(--muted)]/60" />
          <div className="h-80 animate-pulse rounded-xl bg-[var(--muted)]/60" />
        </div>
      </div>
    );
  }

  if (analytics.error || !dashboard || !summary) {
    return <ErrorState description="Analitika ma'lumotlari yuklanmadi." onRetry={() => void analytics.reload()} />;
  }

  const simulationStatus = dashboard.simulation_status;
  const lockReasons = simulationStatus?.lock_reasons ?? [];
  const readinessValue = Math.round(simulationStatus?.readiness_gate_score ?? dashboard.overview.readiness_score);
  const weakestTopic = topicMastery[0] ?? null;
  const strongestTopic = topicMastery[topicMastery.length - 1] ?? null;

  return (
    <div className="space-y-10">
      <PageHeader
        title="Analitika"
        description="Aniqlik trendi, mavzu mastery si va simulyatsiya tayyorgarligi."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          icon={Target}
          label="Aniqlik"
          value={`${Math.round(dashboard.overview.average_score)}%`}
          description={`${summary.total_attempts} ta urinish`}
        />
        <MetricTile
          icon={ShieldCheck}
          label="Tayyorlik"
          value={`${Math.round(dashboard.overview.readiness_score)}%`}
          description={simulationStatus?.launch_ready ? "Tayyor" : "Mustahkamlash kerak"}
        />
        <MetricTile
          icon={Brain}
          label="Ishonch"
          value={`${confidenceScore}%`}
          description="Predictive signal"
        />
        <MetricTile
          icon={Sparkles}
          label="O'tish ehtimoli"
          value={`${Math.round(dashboard.overview.pass_probability)}%`}
          description={dashboard.overview.pass_prediction_label}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)]/40 bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] surface-hover-lift">
          <h3 className="text-section font-semibold">Aniqlik trendi</h3>
          <p className="text-caption mt-1">So&apos;nggi urinishlar bo&apos;yicha.</p>
          <div className="mt-6">
            {accuracyTrend.length === 0 ? (
              <EmptyState title="Trend yo'q" description="Bir nechta urinishdan keyin ko'rinadi." />
            ) : (
              <ChartContainer className="h-72">
                {({ width, height }) => (
                  <AreaChart width={width} height={height} data={accuracyTrend}>
                    <defs>
                      <linearGradient id="analytics-accuracy" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" domain={[0, 100]} fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fill="url(#analytics-accuracy)"
                      animationDuration={800}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                )}
              </ChartContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)]/40 bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] surface-hover-lift">
          <h3 className="text-section font-semibold">Tayyorlik va ishonch</h3>
          <p className="text-caption mt-1">Readiness, confidence, pass signal.</p>
          <div className="mt-6">
            {historyTrend.length === 0 ? (
              <EmptyState title="Ma'lumot yo'q" description="Yakunlangan urinishlardan keyin ko'rinadi." />
            ) : (
              <ChartContainer className="h-72">
                {({ width, height }) => (
                  <LineChart width={width} height={height} data={historyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" domain={[0, 100]} fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                    <Line
                      type="monotone"
                      dataKey="readiness"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      animationDuration={800}
                      animationEasing="ease-out"
                    />
                    <Line
                      type="monotone"
                      dataKey="confidence"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={false}
                      animationDuration={800}
                      animationEasing="ease-out"
                    />
                    <Line
                      type="monotone"
                      dataKey="passProbability"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                      animationDuration={800}
                      animationEasing="ease-out"
                    />
                  </LineChart>
                )}
              </ChartContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-[var(--border)]/40 bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] surface-hover-lift">
          <h3 className="text-section font-semibold">Mavzu mastery</h3>
          <p className="text-caption mt-1">Qaysi mavzular kuchli, qaysilari ko&apos;proq e&apos;tibor talab qiladi.</p>

          <div className="mt-6 rounded-[1.5rem] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_8%,transparent),color-mix(in_oklab,var(--card)_96%,transparent))] p-4">
            {topicMastery.length === 0 ? (
              <EmptyState title="Ma'lumot yo'q" description="Mavzu bo'yicha urinishlar ko'paygach ko'rinadi." />
            ) : (
              <TopicRadar data={radarData} />
            )}
          </div>

          {topicMastery.length > 0 ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.25rem] bg-[color-mix(in_oklab,var(--muted)_82%,transparent)] px-4 py-4">
                <p className="text-caption">Eng ko&apos;p e&apos;tibor kerak</p>
                <p className="mt-2 font-semibold">{weakestTopic?.topic}</p>
                <p className="text-caption mt-1">{weakestTopic?.mastery}% mastery</p>
              </div>
              <div className="rounded-[1.25rem] bg-[color-mix(in_oklab,var(--accent-soft)_42%,transparent)] px-4 py-4">
                <p className="text-caption">Eng kuchli mavzu</p>
                <p className="mt-2 font-semibold">{strongestTopic?.topic}</p>
                <p className="text-caption mt-1">{strongestTopic?.mastery}% mastery</p>
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {topicMastery.length === 0 ? (
              <EmptyState title="Ma'lumot yo'q" description="Mavzu bo'yicha urinishlar ko'paygach ko'rinadi." />
            ) : (
              topicMastery.map((topic) => (
                <div
                  key={topic.topic}
                  className="rounded-[1.25rem] bg-[color-mix(in_oklab,var(--card)_90%,var(--muted))] px-4 py-4 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.25)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{topic.topic}</p>
                      <p className="text-caption mt-0.5">{topic.meta.description}</p>
                    </div>
                    <Badge variant={topic.meta.badgeVariant}>{topic.meta.label}</Badge>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-caption">
                        <span>Mastery</span>
                        <span className="font-semibold">{topic.mastery}%</span>
                      </div>
                      <Progress
                        value={topic.mastery}
                        className="mt-1.5 h-1.5"
                        indicatorClassName={
                          topic.state === "mastered"
                            ? "progress-animated bg-gradient-to-r from-emerald-500 to-emerald-300"
                            : topic.state === "stable"
                              ? "progress-animated bg-gradient-to-r from-[#22c55e] to-[#60a5fa]"
                              : topic.state === "improving"
                                ? "progress-animated bg-gradient-to-r from-[#3b82f6] to-[#6366f1]"
                                : "progress-animated bg-gradient-to-r from-[#f59e0b] to-[#ef4444]"
                        }
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="flex justify-between text-caption">
                          <span>Accuracy</span>
                          <span className="font-semibold">{topic.accuracy}%</span>
                        </div>
                        <Progress value={topic.accuracy} className="mt-1.5 h-1.5" />
                      </div>
                      <div>
                        <div className="flex justify-between text-caption">
                          <span>Retention</span>
                          <span className="font-semibold">{topic.retention}%</span>
                        </div>
                        <Progress value={topic.retention} className="mt-1.5 h-1.5" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)]/40 bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] surface-hover-lift">
          <h3 className="text-section font-semibold">Simulyatsiya holati</h3>
          <p className="text-caption mt-1">Imtihonga qanchalik yaqin ekaningizni bir qarashda ko&apos;ring.</p>

          <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
            <ReadinessRing
              value={readinessValue}
              description={readinessStory(readinessValue, simulationStatus?.launch_ready)}
              className="mx-auto"
            />

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.25rem] bg-[color-mix(in_oklab,var(--muted)_84%,transparent)] p-4">
                  <p className="text-caption">Confidence</p>
                  <p className="mt-2 text-2xl font-semibold">{confidenceScore}%</p>
                </div>
                <div className="rounded-[1.25rem] bg-[color-mix(in_oklab,var(--primary-soft)_62%,transparent)] p-4">
                  <p className="text-caption">Pass signal</p>
                  <p className="mt-2 text-2xl font-semibold">{Math.round(dashboard.overview.pass_probability)}%</p>
                </div>
              </div>

              <div className="rounded-[1.25rem] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_6%,transparent),color-mix(in_oklab,var(--card)_96%,transparent))] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">Holat</p>
                  <Badge
                    variant={
                      simulationStatus?.launch_ready
                        ? "success"
                        : simulationStatus?.cooldown_ready
                          ? "outline"
                          : "warning"
                    }
                  >
                    {simulationStatus?.launch_ready
                      ? "Tayyor"
                      : simulationStatus?.cooldown_ready
                        ? "Yopiq"
                        : "Cooldown"}
                  </Badge>
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex justify-between text-caption">
                      <span>Readiness gate</span>
                      <span className="font-semibold">{readinessValue}%</span>
                    </div>
                    <Progress
                      value={readinessValue}
                      className="mt-1.5 h-1.5"
                      indicatorClassName="progress-animated bg-gradient-to-r from-[#ef4444] via-[#f59e0b] to-[#22c55e]"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-caption">
                      <span>Tavsiya etilgan savollar</span>
                      <span className="font-semibold">{simulationStatus?.recommended_question_count ?? 0} ta</span>
                    </div>
                    <Progress
                      value={Math.min(100, (simulationStatus?.recommended_question_count ?? 0) * 2)}
                      className="mt-1.5 h-1.5"
                      indicatorClassName="progress-animated bg-gradient-to-r from-[#3b82f6] to-[#6366f1]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {lockReasons.length > 0 ? (
            <div className="mt-5 space-y-2">
              {lockReasons.map((reason) => (
                <div
                  key={reason}
                  className="rounded-lg bg-[color-mix(in_oklab,var(--muted)_86%,transparent)] px-4 py-3 text-caption text-[var(--muted-foreground)]"
                >
                  {reason}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  return (
    <AppShell>
      <AnalyticsPageContent />
    </AppShell>
  );
}
