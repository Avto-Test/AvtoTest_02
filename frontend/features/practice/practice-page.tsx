"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { getFreeTestStatus } from "@/api/tests";
import { AppShell } from "@/components/app-shell";
import { PracticeSessionExperience } from "@/components/practice-session-experience";
import { useProgressSnapshot } from "@/components/providers/progress-provider";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { useWeakTopicPreferences } from "@/hooks/use-weak-topic-preferences";
import { useUser } from "@/hooks/use-user";
import { resolveTopicMasteryState } from "@/lib/learning";
import { startIntelligentPracticeSession, type PracticeSessionPayload } from "@/lib/practice-session";
import { Badge } from "@/shared/ui/badge";
import { buttonStyles } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { DashboardSmartTestCard } from "@/widgets/dashboard/dashboard-smart-test-card";
import { WeakTopicsCard } from "@/widgets/dashboard/weak-topics-card";

function PracticePageContent() {
  const searchParams = useSearchParams();
  const { user, authenticated } = useUser();
  const progress = useProgressSnapshot();
  const freeStatusResource = useAsyncResource(getFreeTestStatus, [authenticated], authenticated, {
    cacheKey: "tests:free-status",
    staleTimeMs: 15_000,
  });
  const dashboardData = progress.dashboard;
  const weakTopics = dashboardData
    ? dashboardData.topic_breakdown
        .slice()
        .sort((left, right) => left.accuracy - right.accuracy)
        .map((topic) => ({
          topic: topic.topic,
          state: resolveTopicMasteryState(topic.topic, dashboardData),
          lessonHref: `/lessons?topic=${encodeURIComponent(topic.topic)}`,
        }))
        .filter((topic) => topic.state !== "mastered")
        .slice(0, 4)
    : [];
  const weakTopicPreferences = useWeakTopicPreferences(
    weakTopics.map((topic) => ({ topic: topic.topic, state: topic.state })),
  );
  const [activeSession, setActiveSession] = useState<PracticeSessionPayload | null>(null);
  const [startingSession, setStartingSession] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const topic = searchParams.get("topic");
    if (!topic) {
      return;
    }
    weakTopicPreferences.rememberTopic(topic);
  }, [searchParams, weakTopicPreferences]);

  const startPractice = async () => {
    if (startingSession || !progress.dashboard) {
      return;
    }

    setActionError(null);
    setStartingSession(true);
    try {
      const response = await startIntelligentPracticeSession({
        dashboard: progress.dashboard,
        user,
        freeStatus: freeStatusResource.data,
        topicPreferences: weakTopicPreferences.selectedTopics,
      });
      setActiveSession(response);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Mashqni boshlashda xatolik yuz berdi.");
    } finally {
      setStartingSession(false);
    }
  };

  if (activeSession) {
    return (
      <PracticeSessionExperience
        session={activeSession}
        onExit={() => setActiveSession(null)}
        onFinished={() => void Promise.allSettled([progress.reload(), freeStatusResource.reload()])}
      />
    );
  }

  if (progress.dashboardLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[18rem] rounded-[1.9rem]" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Skeleton className="h-72 rounded-[1.9rem]" />
          <Skeleton className="h-72 rounded-[1.9rem]" />
        </div>
      </div>
    );
  }

  if (progress.dashboardError || !progress.dashboard) {
    return (
      <ErrorState
        description="Amaliyot ma'lumotlarini yuklab bo'lmadi."
        onRetry={() => void Promise.allSettled([progress.reload(), freeStatusResource.reload()])}
      />
    );
  }

  const dashboard = progress.dashboard;
  const lessonRecommendations = dashboard.lesson_recommendations.slice(0, 4);
  const selectedTopicCount = weakTopicPreferences.selectedTopics.length;
  const recommendedQuestionCount = Math.max(5, dashboard.recommendation.question_count || 12);

  return (
    <div className="space-y-5 lg:space-y-6">
      <section className="flex flex-col gap-3 rounded-[1.15rem] border border-[var(--glass-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-bg-elevated)_88%,transparent),color-mix(in_srgb,var(--card-bg)_92%,transparent))] px-4 py-3 shadow-[0_18px_36px_-34px_rgba(0,0,0,0.58)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center rounded-full border border-emerald-500/16 bg-emerald-500/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Amaliyot
            </span>
            <p className="text-[0.82rem] leading-6 text-[var(--text-secondary)] sm:text-[0.84rem]">
              Tizim sizning zaif mavzularingiz va natijalaringizga qarab mashqni avtomatik tanlaydi.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="rounded-full border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          {selectedTopicCount > 0 ? `${selectedTopicCount} ta fokus mavzu` : "Adaptive practice"}
        </Badge>
      </section>

      {actionError ? <ErrorState description={actionError} /> : null}

      <DashboardSmartTestCard
        title={`${recommendedQuestionCount} ta savol mashqni boshlang`}
        description={
          weakTopicPreferences.selectedTopics.length > 0
            ? "Tanlangan zaif mavzular asosida practice session qayta yig'iladi va savollar shu fokusdan boshlanadi."
            : "Tizim sizning natijalaringizga qarab eng foydali practice sessionni avtomatik tanlaydi."
        }
        topic={dashboard.recommendation.topic}
        selectedTopics={weakTopicPreferences.selectedTopics}
        buttonLabel="Mashqni boshlash"
        helperText="Savol, AI Coach izohi va reward oqimi tizim tomonidan adaptiv boshqariladi."
        onStart={() => void startPractice()}
        loading={startingSession}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <WeakTopicsCard
          items={weakTopics.map((topic) => ({
            ...topic,
            selected: weakTopicPreferences.isSelected(topic.topic),
            improved: weakTopicPreferences.isImproved(topic.topic),
          }))}
          onToggleTopic={weakTopicPreferences.toggleTopic}
          onLessonOpen={weakTopicPreferences.rememberTopic}
        />

        <div className="relative overflow-hidden rounded-[1.45rem] border border-[color-mix(in_srgb,var(--accent-blue)_12%,var(--glass-border))] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-bg-elevated)_92%,transparent),color-mix(in_srgb,var(--card-bg)_94%,transparent))] p-4 shadow-[0_20px_44px_-36px_color-mix(in_srgb,var(--accent-blue)_24%,transparent)] backdrop-blur-2xl surface-hover-lift">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--accent-blue)_14%,transparent),transparent_26%),radial-gradient(circle_at_bottom_left,color-mix(in_srgb,var(--accent-green)_12%,transparent),transparent_28%)]" />
          <div className="relative">
            <div className="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--accent-green)_18%,var(--glass-border))] bg-[color-mix(in_srgb,var(--accent-green-soft)_68%,var(--card-bg)_32%)] px-2.75 py-1.25 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--accent-green)]">
              Dars tavsiyalari
            </div>
            <p className="text-caption mt-2">{"So'nggi natijalarga mos darslar."}</p>
          </div>
          <div className="relative mt-4 space-y-2.5">
            {lessonRecommendations.length === 0 ? (
              <EmptyState
                title={"Dars tavsiyasi yo'q"}
                description={"Mashqlardan keyin shu yerda ko'rinadi."}
              />
            ) : (
              lessonRecommendations.map((lesson) => (
                <div
                  key={lesson.lesson_id}
                  className="rounded-[1.05rem] border border-[var(--border)]/45 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-bg-muted)_78%,transparent),color-mix(in_srgb,var(--card-bg-elevated)_64%,transparent))] p-3.5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--glass-highlight)_26%,transparent)] transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[0.95rem] font-semibold">{lesson.title}</p>
                    {lesson.topic ? <Badge variant="outline">{lesson.topic}</Badge> : null}
                  </div>
                  <p className="text-caption mt-1.5">{lesson.reason}</p>
                  <Link
                    href={`/lessons${lesson.topic ? `?topic=${encodeURIComponent(lesson.topic)}` : ""}`}
                    className={buttonStyles({ variant: "outline", size: "sm", className: "mt-2.5 rounded-xl" })}
                  >
                    <BookOpen className="h-4 w-4" />
                    {"Darsni ko'rish"}
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PracticePage() {
  return (
    <AppShell>
      <PracticePageContent />
    </AppShell>
  );
}
