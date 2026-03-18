"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BookOpen, CheckCircle2, Flag, Sparkles, Target } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ReadinessRing } from "@/components/charts/readiness-ring";
import { useProgressSnapshot } from "@/components/providers/progress-provider";
import {
  buildLearningPathTopicProgress,
  masteryStateMeta,
  type TopicMasteryState,
} from "@/lib/learning";
import { Badge } from "@/shared/ui/badge";
import { buttonStyles } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Progress } from "@/shared/ui/progress";
import { Skeleton } from "@/shared/ui/skeleton";

function normalizeTopic(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function matchesAliases(value: string | null | undefined, aliases: string[]) {
  const normalizedValue = normalizeTopic(value);
  if (!normalizedValue) return false;
  return aliases.some((alias) => {
    const normalizedAlias = normalizeTopic(alias);
    return (
      normalizedAlias &&
      (
        normalizedValue === normalizedAlias ||
        normalizedValue.includes(normalizedAlias) ||
        normalizedAlias.includes(normalizedValue)
      )
    );
  });
}

function readinessLabel(score: number) {
  if (score >= 75) return "Yuqori";
  if (score >= 45) return "O'rta";
  return "Past";
}

function stateProgressClass(state: TopicMasteryState) {
  if (state === "mastered") {
    return "progress-animated bg-gradient-to-r from-emerald-500 to-emerald-300";
  }
  if (state === "stable") {
    return "progress-animated bg-gradient-to-r from-[#22c55e] to-[#60a5fa]";
  }
  if (state === "improving") {
    return "progress-animated bg-gradient-to-r from-[#3b82f6] to-[#6366f1]";
  }
  return "progress-animated bg-gradient-to-r from-[#f59e0b] to-[#ef4444]";
}

function stateNodeClasses(state: TopicMasteryState) {
  if (state === "mastered") {
    return "bg-[color-mix(in_oklab,var(--accent)_82%,white)] text-white shadow-[0_18px_36px_-22px_rgba(34,197,94,0.8)]";
  }
  if (state === "stable") {
    return "bg-[linear-gradient(135deg,#22c55e,#60a5fa)] text-white shadow-[0_18px_36px_-22px_rgba(37,99,235,0.55)]";
  }
  if (state === "improving") {
    return "bg-[linear-gradient(135deg,#3b82f6,#6366f1)] text-white shadow-[0_18px_36px_-22px_rgba(59,130,246,0.55)]";
  }
  return "bg-[linear-gradient(135deg,#f59e0b,#ef4444)] text-white shadow-[0_18px_36px_-22px_rgba(239,68,68,0.45)]";
}

function stateConnectorClasses(state: TopicMasteryState) {
  if (state === "mastered") {
    return "bg-[linear-gradient(180deg,rgba(34,197,94,0.5),rgba(96,165,250,0.12))]";
  }
  if (state === "stable") {
    return "bg-[linear-gradient(180deg,rgba(96,165,250,0.45),rgba(34,197,94,0.12))]";
  }
  if (state === "improving") {
    return "bg-[linear-gradient(180deg,rgba(59,130,246,0.4),rgba(99,102,241,0.12))]";
  }
  return "bg-[linear-gradient(180deg,rgba(245,158,11,0.35),rgba(239,68,68,0.12))]";
}

function LearningPathPageContent() {
  const progress = useProgressSnapshot();

  const roadmap = useMemo(() => {
    if (!progress.dashboard) return [];
    return buildLearningPathTopicProgress(progress.dashboard).map((topic) => {
      const masteryMeta = masteryStateMeta(topic.state);
      const recommended = matchesAliases(progress.dashboard?.recommendation.topic, topic.aliases);
      const lessonMatch = progress.dashboard?.lesson_recommendations.find((lesson) =>
        matchesAliases(lesson.topic ?? lesson.section, topic.aliases),
      );

      return {
        ...topic,
        masteryMeta,
        lessonHref: `/lessons?topic=${encodeURIComponent(lessonMatch?.topic ?? topic.topic)}`,
        practiceHref: `/practice?topic=${encodeURIComponent(topic.topic)}`,
        recommended,
        highlighted: topic.state === "weak",
      };
    });
  }, [progress.dashboard]);

  if (progress.dashboardLoading) {
    return (
      <div className="space-y-8">
        <div className="h-48 animate-pulse rounded-xl bg-[var(--muted)]/60" />
        <div className="space-y-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-[1.5rem]" />
          ))}
        </div>
      </div>
    );
  }

  if (progress.dashboardError || !progress.dashboard) {
    return <ErrorState description="O'quv yo'li ma'lumotlari yuklanmadi." onRetry={() => void progress.reload()} />;
  }

  if (roadmap.length === 0) {
    return <EmptyState title="O'quv yo'li bo'sh" description="Mashqlardan keyin mavzular ko'rinadi." />;
  }

  const masteredCount = roadmap.filter((item) => item.state === "mastered").length;
  const stableCount = roadmap.filter((item) => item.state === "stable" || item.state === "mastered").length;
  const weakCount = roadmap.filter((item) => item.state === "weak").length;
  const pathProgress = Math.round(roadmap.reduce((sum, item) => sum + item.score, 0) / roadmap.length);
  const readiness = Math.round(progress.dashboard.overview.readiness_score);
  const readinessText = readinessLabel(readiness);
  const nextFocus = roadmap.find((item) => item.state === "weak") ?? roadmap.find((item) => item.state === "improving") ?? roadmap[0];
  const simulationStatus = progress.dashboard.simulation_status;

  return (
    <div className="space-y-10">
      <PageHeader
        title="O'quv yo'li"
        description="Imtihongacha bo'lgan yo'lingizni mavzular kesimida kuzating."
      />

      <div className="rounded-xl border border-[var(--border)]/40 bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] surface-hover-lift">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-caption font-semibold uppercase tracking-wider text-[var(--primary)]">O&apos;quv yo&apos;li</p>
            <h2 className="text-title mt-2 text-2xl font-semibold sm:text-3xl">
              {masteredCount} / {roadmap.length} mavzu o&apos;zlashtirildi
            </h2>
            <p className="text-body mt-2 max-w-2xl text-[var(--muted-foreground)]">
              Keyingi e&apos;tibor talab qilayotgan mavzu:{" "}
              <span className="font-medium text-[var(--foreground)]">{nextFocus.topic}</span>.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[color-mix(in_oklab,var(--muted)_86%,transparent)] px-4 py-3">
              <p className="text-caption">Tayyorlik</p>
              <p className="mt-2 text-xl font-bold">{readinessText}</p>
            </div>
            <div className="rounded-xl bg-[color-mix(in_oklab,var(--primary-soft)_60%,transparent)] px-4 py-3">
              <p className="text-caption">Barqaror</p>
              <p className="mt-2 text-xl font-bold">{stableCount}</p>
            </div>
            <div className="rounded-xl bg-[color-mix(in_oklab,var(--accent-soft)_46%,transparent)] px-4 py-3">
              <p className="text-caption">Zaif</p>
              <p className="mt-2 text-xl font-bold">{weakCount}</p>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[color-mix(in_oklab,var(--muted)_86%,transparent)] px-4 py-3">
              <p className="text-caption">PASS</p>
              <p className="mt-2 text-lg font-semibold">70%+</p>
              <p className="text-caption mt-1">Keyingi bosqich ochiladi.</p>
            </div>
            <div className="rounded-xl bg-[color-mix(in_oklab,var(--primary-soft)_60%,transparent)] px-4 py-3">
              <p className="text-caption">GOOD</p>
              <p className="mt-2 text-lg font-semibold">85%+</p>
              <p className="text-caption mt-1">Tavsiya etilgan mustahkam daraja.</p>
            </div>
            <div className="rounded-xl bg-[color-mix(in_oklab,var(--accent-soft)_46%,transparent)] px-4 py-3">
              <p className="text-caption">PERFECT</p>
              <p className="mt-2 text-lg font-semibold">95%+</p>
              <p className="text-caption mt-1">Qo&apos;shimcha +15 coin bonus.</p>
            </div>
          </div>
          <div className="flex justify-between text-caption">
            <span>Umumiy yo&apos;l</span>
            <span className="font-semibold">{pathProgress}%</span>
          </div>
          <Progress
            value={pathProgress}
            className="mt-2 h-2"
            indicatorClassName="progress-animated bg-gradient-to-r from-[#3b82f6] via-[#6366f1] to-[#22c55e]"
          />
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-[var(--border)]/35 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_4%,transparent),color-mix(in_oklab,var(--card)_98%,transparent))] p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <div className="space-y-5">
          {roadmap.map((item, index) => (
            <div
              key={item.topic}
              className="grid gap-4 lg:grid-cols-[72px_minmax(0,1fr)]"
            >
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full ${stateNodeClasses(item.state)}`}
                >
                  {item.state === "mastered" ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : item.recommended ? (
                    <Sparkles className="h-6 w-6" />
                  ) : (
                    <Target className="h-6 w-6" />
                  )}
                </div>
                <div
                  className={`mt-3 w-1 flex-1 rounded-full ${stateConnectorClasses(item.state)} ${
                    index === roadmap.length - 1 ? "min-h-12" : "min-h-24"
                  }`}
                />
              </div>

              <div
                className={`rounded-[1.5rem] border border-[var(--border)]/35 p-5 shadow-[0_20px_45px_-32px_rgba(15,23,42,0.28)] surface-hover-lift ${
                  item.state === "mastered"
                    ? "bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent-soft)_62%,transparent),color-mix(in_oklab,var(--card)_98%,transparent))]"
                    : item.recommended
                      ? "bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary-soft)_62%,transparent),color-mix(in_oklab,var(--card)_98%,transparent))]"
                      : "bg-[color-mix(in_oklab,var(--card)_98%,transparent)]"
                }`}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--muted)]/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                        {index + 1}-bosqich
                      </span>
                      {item.recommended ? <Badge>Keyingi</Badge> : null}
                      {item.highlighted ? <Badge variant="warning">Zaif</Badge> : null}
                      {item.state === "mastered" ? <Badge variant="success">Tugallandi</Badge> : null}
                    </div>
                    <h3 className="mt-3 text-xl font-semibold">{item.topic}</h3>
                    <p className="text-body mt-2 max-w-2xl text-[var(--muted-foreground)]">{item.description}</p>
                  </div>

                  <div className="rounded-[1.25rem] bg-[color-mix(in_oklab,var(--card)_88%,var(--muted))] px-4 py-4">
                    <p className="text-caption">Mastery</p>
                    <p className="mt-2 text-2xl font-semibold">{item.mastery}%</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)] lg:items-end">
                  <div className="space-y-3">
                    <div className="flex justify-between text-caption">
                      <span>Progress</span>
                      <span className="font-semibold">{item.score}%</span>
                    </div>
                    <Progress
                      value={item.score}
                      className="h-2"
                      indicatorClassName={stateProgressClass(item.state)}
                    />
                    <p className="text-caption">{item.masteryMeta.description}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                    <div className="rounded-[1rem] bg-[color-mix(in_oklab,var(--muted)_82%,transparent)] px-3 py-3">
                      <p className="text-caption">Accuracy</p>
                      <p className="mt-1 text-lg font-semibold">{item.accuracy}%</p>
                    </div>
                    <div className="rounded-[1rem] bg-[color-mix(in_oklab,var(--muted)_82%,transparent)] px-3 py-3">
                      <p className="text-caption">Retention</p>
                      <p className="mt-1 text-lg font-semibold">{item.retention}%</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={item.lessonHref} className={buttonStyles({ variant: "outline", className: "rounded-xl" })}>
                    <BookOpen className="h-4 w-4" />
                    Darsni ko&apos;rish
                  </Link>
                  <Link href={item.practiceHref} className={buttonStyles({ className: "rounded-xl" })}>
                    Mashq qilish
                  </Link>
                </div>
              </div>
            </div>
          ))}

          <div className="grid gap-4 lg:grid-cols-[72px_minmax(0,1fr)]">
            <div className="flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#3b82f6,#22c55e)] text-white shadow-[var(--shadow-soft)]">
                <Flag className="h-6 w-6" />
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--border)]/35 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_6%,transparent),color-mix(in_oklab,var(--card)_98%,transparent))] p-5 shadow-[0_20px_45px_-32px_rgba(15,23,42,0.28)] surface-hover-lift">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--muted)]/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                      Final bosqich
                    </span>
                    <Badge
                      variant={
                        simulationStatus?.launch_ready
                          ? "success"
                          : simulationStatus?.cooldown_ready
                            ? "outline"
                            : "warning"
                      }
                    >
                      {simulationStatus?.launch_ready ? "Tayyor" : "Simulyatsiya"}
                    </Badge>
                  </div>

                  <h3 className="mt-3 text-xl font-semibold">Simulation</h3>
                  <p className="text-body mt-2 max-w-2xl text-[var(--muted-foreground)]">
                    70%+ darajadagi yo&apos;l progressi simulyatsiyani tavsiya etilgan usulda ochadi. Xohlasangiz coin bilan ham tez ochish mumkin.
                  </p>

                  {simulationStatus?.warning_message ? (
                    <div className="mt-4 rounded-[1rem] border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                      {simulationStatus.warning_message}
                    </div>
                  ) : null}

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1rem] bg-[color-mix(in_oklab,var(--card)_88%,var(--muted))] px-4 py-3">
                      <p className="text-caption">Readiness gate</p>
                      <p className="mt-1 text-lg font-semibold">
                        {Math.round(simulationStatus?.readiness_gate_score ?? readiness)}%
                      </p>
                    </div>
                    <div className="rounded-[1rem] bg-[color-mix(in_oklab,var(--card)_88%,var(--muted))] px-4 py-3">
                      <p className="text-caption">Pass signal</p>
                      <p className="mt-1 text-lg font-semibold">
                        {Math.round(progress.dashboard.overview.pass_probability)}%
                      </p>
                    </div>
                  </div>
                </div>

                <ReadinessRing
                  value={Math.round(simulationStatus?.readiness_gate_score ?? readiness)}
                  title="Imtihon"
                  description={
                    simulationStatus?.launch_ready
                      ? "Simulyatsiyani boshlash uchun tayyorsiz."
                      : "Yo&apos;l bo&apos;ylab yana bir necha qadam sizni simulyatsiyaga olib chiqadi."
                  }
                  size={180}
                  className="mx-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LearningPathPage() {
  return (
    <AppShell>
      <LearningPathPageContent />
    </AppShell>
  );
}
