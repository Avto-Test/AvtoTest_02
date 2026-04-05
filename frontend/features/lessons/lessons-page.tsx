"use client";

import { useSearchParams } from "next/navigation";
import { BookOpen, Layers3, Sparkles } from "lucide-react";
import { useMemo } from "react";

import { getLessonsFeed } from "@/api/lessons";
import { AppShell } from "@/components/app-shell";
import { useProgressSnapshot } from "@/components/providers/progress-provider";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { useUser } from "@/hooks/use-user";
import { Badge } from "@/shared/ui/badge";
import { buttonStyles } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";

function normalizeLessonTopic(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function stemLessonToken(token: string) {
  for (const suffix of ["lari", "lar", "ning", "ni", "ga", "da", "dan"]) {
    if (token.endsWith(suffix) && token.length > suffix.length + 2) {
      return token.slice(0, -suffix.length);
    }
  }
  return token;
}

function lessonTopicTokens(...values: Array<string | null | undefined>) {
  const tokens = new Set<string>();
  for (const value of values) {
    const normalized = normalizeLessonTopic(value);
    if (!normalized) {
      continue;
    }
    tokens.add(normalized);
    for (const token of normalized.split(/\s+/)) {
      if (!token || token === "va") {
        continue;
      }
      tokens.add(token);
      tokens.add(stemLessonToken(token));
    }
  }
  return tokens;
}

function lessonMatchesTopic(
  selectedTopic: string | null,
  lessonTopic?: string | null,
  lessonSection?: string | null,
) {
  if (!selectedTopic) {
    return true;
  }

  const normalizedSelected = normalizeLessonTopic(selectedTopic);
  const lessonTopicKey = normalizeLessonTopic(lessonTopic);
  const lessonSectionKey = normalizeLessonTopic(lessonSection);
  if (normalizedSelected === lessonTopicKey || normalizedSelected === lessonSectionKey) {
    return true;
  }

  const selectedTokens = lessonTopicTokens(selectedTopic);
  const lessonTokens = lessonTopicTokens(lessonTopic, lessonSection);
  for (const token of selectedTokens) {
    if (!token) {
      continue;
    }
    for (const lessonToken of lessonTokens) {
      if (!lessonToken) {
        continue;
      }
      if (token === lessonToken || token.includes(lessonToken) || lessonToken.includes(token)) {
        return true;
      }
    }
  }

  return false;
}

function LessonsPageContent() {
  const searchParams = useSearchParams();
  const selectedTopic = searchParams.get("topic");
  const { authenticated } = useUser();
  const progress = useProgressSnapshot();
  const lessonsResource = useAsyncResource(getLessonsFeed, [authenticated], authenticated, {
    cacheKey: "lessons:feed",
    staleTimeMs: 30_000,
  });

  const filteredLessons = useMemo(() => {
    const lessons = lessonsResource.data?.lessons ?? [];
    return lessons.filter((lesson) => lessonMatchesTopic(selectedTopic, lesson.topic, lesson.section));
  }, [lessonsResource.data?.lessons, selectedTopic]);

  const filteredSections = useMemo(() => {
    const sections = lessonsResource.data?.sections ?? [];
    return sections
      .map((section) => ({
        ...section,
        lessons: section.lessons.filter((lesson) => lessonMatchesTopic(selectedTopic, lesson.topic, lesson.section)),
      }))
      .filter((section) => section.lessons.length > 0);
  }, [lessonsResource.data?.sections, selectedTopic]);

  const recommendedLessons = useMemo(() => {
    const lessonsById = new Map((lessonsResource.data?.lessons ?? []).map((lesson) => [lesson.id, lesson]));
    return (progress.dashboard?.lesson_recommendations ?? [])
      .filter((recommendation) => lessonMatchesTopic(selectedTopic, recommendation.topic, recommendation.section))
      .slice(0, 6)
      .map((recommendation) => ({
        recommendation,
        lesson:
          lessonsById.get(recommendation.lesson_id) ??
          (lessonsResource.data?.lessons ?? []).find((lesson) =>
            lessonMatchesTopic(recommendation.topic ?? selectedTopic, lesson.topic, lesson.section),
          ) ??
          null,
      }));
  }, [lessonsResource.data?.lessons, progress.dashboard?.lesson_recommendations, selectedTopic]);

  if (progress.dashboardLoading || lessonsResource.loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-[1.8rem]" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Skeleton className="h-72 rounded-[1.8rem]" />
          <Skeleton className="h-72 rounded-[1.8rem]" />
        </div>
      </div>
    );
  }

  if (progress.dashboardError || !progress.dashboard || lessonsResource.error || !lessonsResource.data) {
    return (
      <ErrorState
        description="Darslar ma'lumotini yuklab bo'lmadi."
        onRetry={() => void Promise.allSettled([progress.reload(), lessonsResource.reload()])}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Darslar"
        description="Zaif mavzular va tavsiyalarga mos darslar shu yerda jamlangan."
      />

      {selectedTopic ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{selectedTopic}</Badge>
          <p className="text-sm text-[var(--muted-foreground)]">Tanlangan mavzu bo&apos;yicha darslar ko&apos;rsatilmoqda.</p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="card-hover-lift">
          <CardHeader>
            <CardTitle>Dars tavsiyalari</CardTitle>
            <CardDescription>Oxirgi natijalarga mos tavsiya qilingan darslar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendedLessons.length === 0 ? (
              <EmptyState title="Dars tavsiyasi yo&apos;q" description="Analytics signaliga mos dars topilmadi." />
            ) : (
              recommendedLessons.map(({ recommendation, lesson }) => (
                <div
                  key={recommendation.lesson_id}
                  className="rounded-[1.3rem] border border-[color-mix(in_oklab,var(--border)_84%,transparent)] bg-[color-mix(in_oklab,var(--card)_92%,transparent)] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{recommendation.title}</p>
                        {recommendation.topic ? <Badge variant="outline">{recommendation.topic}</Badge> : null}
                        {lesson?.is_premium ? <Badge>Premium</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{recommendation.reason}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={lesson?.content_url ?? recommendation.content_url}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonStyles({ variant: "outline", className: "rounded-full" })}
                    >
                      Kontentni ochish
                    </a>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="card-hover-lift">
          <CardHeader>
            <CardTitle>Darslar ro&apos;yxati</CardTitle>
            <CardDescription>Barcha mavjud darslar va materiallar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredLessons.length === 0 ? (
              <EmptyState title="Dars topilmadi" description="Tanlangan mavzu bo'yicha dars mavjud emas." />
            ) : (
              filteredLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="rounded-[1.3rem] border border-[color-mix(in_oklab,var(--border)_84%,transparent)] bg-[color-mix(in_oklab,var(--card)_92%,transparent)] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)]">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{lesson.title}</p>
                        {lesson.topic ? <Badge variant="outline">{lesson.topic}</Badge> : null}
                        {lesson.is_premium ? <Badge>Premium</Badge> : null}
                      </div>
                      {lesson.description ? <p className="mt-1 text-sm text-[var(--muted-foreground)]">{lesson.description}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">{lesson.content_type}</Badge>
                        {lesson.section ? <Badge variant="outline">{lesson.section}</Badge> : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={lesson.content_url}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonStyles({ variant: "outline", className: "rounded-full" })}
                    >
                      Ochish
                    </a>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="card-hover-lift">
        <CardHeader>
          <CardTitle>Bo&apos;limlar</CardTitle>
          <CardDescription>Premium foydalanuvchilar uchun darslar bo&apos;yicha jamlangan bo&apos;limlar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredSections.length === 0 ? (
            <EmptyState
              title={lessonsResource.data.is_premium_user ? "Bo&apos;lim topilmadi" : "Bo&apos;limlar premium uchun ochiladi"}
              description={
                lessonsResource.data.is_premium_user
                  ? "Tanlangan mavzu bo&apos;yicha bo&apos;lim mavjud emas."
                  : "Premium bo&apos;lganda jamlangan bo&apos;limlar shu yerda ko&apos;rinadi."
              }
            />
          ) : (
            filteredSections.map((section) => (
              <div
                key={section.key}
                className="rounded-[1.3rem] border border-[color-mix(in_oklab,var(--border)_84%,transparent)] bg-[color-mix(in_oklab,var(--card)_92%,transparent)] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)]">
                      <Layers3 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{section.title}</p>
                      <p className="text-sm text-[var(--muted-foreground)]">{section.lessons.length} ta dars</p>
                    </div>
                  </div>
                  <Badge>Premium</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function LessonsPage() {
  return (
    <AppShell>
      <LessonsPageContent />
    </AppShell>
  );
}
