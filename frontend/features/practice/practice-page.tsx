"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { PracticeSessionExperience } from "@/components/practice-session-experience";
import { useProgressSnapshot } from "@/components/providers/progress-provider";
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

const topicStateOrder = {
  weak: 0,
  improving: 1,
  stable: 2,
  mastered: 3,
} as const;

function PracticePageContent() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const requestedTopic = searchParams.get("topic")?.trim() || null;
  const progress = useProgressSnapshot();
  const dashboardData = progress.dashboard;
  const weakTopics = dashboardData
    ? dashboardData.topic_breakdown
        .map((topic) => ({
          topic: topic.topic,
          accuracy: topic.accuracy,
          state: resolveTopicMasteryState(topic.topic, dashboardData),
          lessonHref: `/lessons?topic=${encodeURIComponent(topic.topic)}`,
        }))
        .sort(
          (left, right) =>
            topicStateOrder[left.state] - topicStateOrder[right.state] || left.accuracy - right.accuracy,
        )
        .filter((topic) => topic.state === "weak" || topic.state === "improving")
        .slice(0, 4)
    : [];
  const weakTopicPreferences = useWeakTopicPreferences(
    weakTopics.map((topic) => ({ topic: topic.topic, state: topic.state })),
  );
  const { rememberTopic } = weakTopicPreferences;
  const [activeSession, setActiveSession] = useState<PracticeSessionPayload | null>(null);
  const [startingSession, setStartingSession] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<20 | 30 | 40>(20);

  useEffect(() => {
    if (!requestedTopic) {
      return;
    }
    rememberTopic(requestedTopic);
  }, [rememberTopic, requestedTopic]);

  const effectiveTopicPreferences = requestedTopic
    ? [requestedTopic]
    : weakTopicPreferences.selectedTopics;

  const isPremiumUser = Boolean(user?.is_premium);
  const questionCountOptions = [
    { value: 20 as const, label: "20", locked: false },
    { value: 30 as const, label: "30", locked: !isPremiumUser },
    { value: 40 as const, label: "40", locked: !isPremiumUser },
  ];

  const startPractice = async () => {
    if (startingSession || !progress.dashboard) {
      return;
    }

    setActionError(null);
    setStartingSession(true);
    try {
      const response = await startIntelligentPracticeSession({
        questionCount: selectedQuestionCount,
        topicPreferences: effectiveTopicPreferences,
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
        onFinished={() => void progress.reload()}
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
        onRetry={() => void progress.reload()}
      />
    );
  }

  const dashboard = progress.dashboard;
  const lessonRecommendations = dashboard.lesson_recommendations;
  const fallbackLessonTopics = Array.from(
    new Set(
      (
        effectiveTopicPreferences.length > 0
          ? effectiveTopicPreferences
          : weakTopics.map((topic) => topic.topic)
      ).slice(0, 4),
    ),
  );
  const selectedTopicCount = effectiveTopicPreferences.length;

  return (
    <div className="space-y-4 lg:space-y-5">
      <section className="flex flex-col gap-2.5 rounded-[1.05rem] border border-[var(--glass-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-bg-elevated)_88%,transparent),color-mix(in_srgb,var(--card-bg)_92%,transparent))] px-4 py-3 shadow-[0_18px_36px_-34px_rgba(0,0,0,0.58)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center rounded-full border border-emerald-500/16 bg-emerald-500/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Amaliyot
            </span>
            <p className="text-[0.8rem] leading-5.5 text-[var(--text-secondary)] sm:text-[0.82rem]">
              Savollar xatolar va zaif mavzular asosida yig&apos;iladi.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="rounded-full border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          {selectedTopicCount > 0 ? `${selectedTopicCount} ta fokus mavzu` : "Mashq"}
        </Badge>
      </section>

      {actionError ? <ErrorState description={actionError} /> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.04fr)_minmax(20rem,0.96fr)] xl:items-stretch">
        <div className="flex min-h-0 flex-col gap-4">
          <DashboardSmartTestCard
            title=""
            description={
              effectiveTopicPreferences.length > 0
                ? "Tanlangan zaif mavzular asosida savollar shu yo'nalishda yig'iladi."
                : "Savollar xatolar, unutilayotgan joylar va zaif mavzular asosida yig'iladi."
            }
            selectedQuestionCount={selectedQuestionCount}
            questionCountOptions={questionCountOptions}
            topic={dashboard.recommendation.topic}
            selectedTopics={effectiveTopicPreferences}
            buttonLabel="Mashqni boshlash"
            helperText="Savollar sonini tanlang."
            onSelectQuestionCount={setSelectedQuestionCount}
            onStart={() => void startPractice()}
            loading={startingSession}
          />

          <WeakTopicsCard
            items={weakTopics.map((topic) => ({
              ...topic,
              selected: weakTopicPreferences.isSelected(topic.topic),
              improved: weakTopicPreferences.isImproved(topic.topic),
            }))}
            onToggleTopic={weakTopicPreferences.toggleTopic}
            onLessonOpen={rememberTopic}
            className="xl:flex-1"
          />
        </div>

        <section className="relative flex min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-[color-mix(in_srgb,var(--accent-blue)_12%,var(--glass-border))] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-bg-elevated)_92%,transparent),color-mix(in_srgb,var(--card-bg)_94%,transparent))] p-4 shadow-[0_20px_44px_-36px_color-mix(in_srgb,var(--accent-blue)_24%,transparent)] backdrop-blur-2xl xl:max-h-[calc(100vh-12rem)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--accent-blue)_14%,transparent),transparent_26%),radial-gradient(circle_at_bottom_left,color-mix(in_srgb,var(--accent-green)_12%,transparent),transparent_28%)]" />
          <div className="relative shrink-0">
            <div className="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--accent-green)_18%,var(--glass-border))] bg-[color-mix(in_srgb,var(--accent-green-soft)_68%,var(--card-bg)_32%)] px-2.75 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--accent-green)]">
              Dars tavsiyalari
            </div>
            <p className="text-caption mt-2">{"Natijangizga mos darslar."}</p>
          </div>
          <div className="subtle-scroll-area relative mt-4 flex-1 min-h-0 space-y-2.5 overflow-y-auto pr-1">
            {lessonRecommendations.length === 0 ? (
              fallbackLessonTopics.length === 0 ? (
                <EmptyState
                  title={"Dars tavsiyasi yo'q"}
                  description={"Mashqlardan keyin shu yerda ko'rinadi."}
                />
              ) : (
                fallbackLessonTopics.map((topic) => (
                  <div
                    key={topic}
                    className="rounded-[1rem] border border-[var(--border)]/45 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-bg-muted)_78%,transparent),color-mix(in_srgb,var(--card-bg-elevated)_64%,transparent))] p-3 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--glass-highlight)_26%,transparent)] transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[0.92rem] font-semibold">{topic} bo&apos;yicha darslar</p>
                      <Badge variant="outline">{topic}</Badge>
                    </div>
                    <p className="text-caption mt-1.25">
                      Tanlangan yoki zaif mavzu asosida shu darslarni ko&apos;rib chiqish tavsiya etiladi.
                    </p>
                    <Link
                      href={`/lessons?topic=${encodeURIComponent(topic)}`}
                      onClick={() => rememberTopic(topic)}
                      className={buttonStyles({ variant: "outline", size: "sm", className: "mt-2 rounded-xl" })}
                    >
                      <BookOpen className="h-4 w-4" />
                      {"Darsni ko'rish"}
                    </Link>
                  </div>
                ))
              )
            ) : (
              lessonRecommendations.map((lesson) => (
                <div
                  key={lesson.lesson_id}
                  className="rounded-[1rem] border border-[var(--border)]/45 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-bg-muted)_78%,transparent),color-mix(in_srgb,var(--card-bg-elevated)_64%,transparent))] p-3 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--glass-highlight)_26%,transparent)] transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[0.92rem] font-semibold">{lesson.title}</p>
                    {lesson.topic ? <Badge variant="outline">{lesson.topic}</Badge> : null}
                  </div>
                  <p className="text-caption mt-1.25">{lesson.reason}</p>
                  <Link
                    href={`/lessons${lesson.topic ? `?topic=${encodeURIComponent(lesson.topic)}` : ""}`}
                    className={buttonStyles({ variant: "outline", size: "sm", className: "mt-2 rounded-xl" })}
                  >
                    <BookOpen className="h-4 w-4" />
                    {"Darsni ko'rish"}
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>
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
