"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Flag, Timer, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { getDashboardAnalytics, getReviewQueue } from "@/api/analytics";
import { getLessonsFeed } from "@/api/lessons";
import { submitAttempt } from "@/api/tests";
import { AIFeedback } from "@/components/ai/ai-feedback";
import { useOptionalProgressSnapshot } from "@/components/providers/progress-provider";
import { RewardSummary } from "@/components/rewards/reward-summary";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { buildAdaptiveStudyPlan } from "@/lib/adaptive-study-plan";
import { useUser } from "@/hooks/use-user";
import { deriveWeakestTopicFromResult, masteryStateMeta, resolveAttemptTopicState } from "@/lib/learning";
import { formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonStyles } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import type { DashboardAnalytics } from "@/types/analytics";
import type { AttemptResult, PublicQuestion } from "@/types/test";

type SessionPayload = {
  attemptId: string;
  title: string;
  subtitle: string;
  durationMinutes: number;
  questions: PublicQuestion[];
  modeLabel: string;
};

function getLockedAnalysisMessage(reason?: string | null) {
  switch (reason) {
    case "premium_required":
      return "Batafsil javob tahlili premium tarifda yoki demo sinovda ochiladi.";
    case "first_test_demo":
      return "Batafsil tahlil ushbu sinov uchun ochilgan.";
    case "demo_account":
      return "Demo akkaunt uchun batafsil javob tahlili ochilgan.";
    default:
      return "Batafsil javob tahlili hozircha yopiq.";
  }
}

function normalizeTopic(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function findTopicAccuracy(dashboard: DashboardAnalytics | null | undefined, topic?: string | null) {
  if (!dashboard || !topic) {
    return null;
  }

  const normalizedTopic = normalizeTopic(topic);
  const match = dashboard.topic_breakdown.find((item) => {
    const normalizedCandidate = normalizeTopic(item.topic);
    return (
      normalizedCandidate === normalizedTopic ||
      normalizedCandidate.includes(normalizedTopic) ||
      normalizedTopic.includes(normalizedCandidate)
    );
  });

  return match ? Math.round(match.accuracy) : null;
}

function buildImprovementMessage({
  result,
  focusTopic,
  baselineDashboard,
  postAttemptDashboard,
}: {
  result: AttemptResult;
  focusTopic?: string | null;
  baselineDashboard: DashboardAnalytics | null | undefined;
  postAttemptDashboard: DashboardAnalytics | null | undefined;
}) {
  const previousAccuracy = findTopicAccuracy(baselineDashboard, focusTopic);
  const currentAccuracy = findTopicAccuracy(postAttemptDashboard, focusTopic);

  if (
    focusTopic &&
    previousAccuracy !== null &&
    currentAccuracy !== null &&
    currentAccuracy - previousAccuracy >= 3
  ) {
    return `${focusTopic} bo'yicha natijangiz ${currentAccuracy - previousAccuracy}% ga oshdi.`;
  }

  const improvementDirection = postAttemptDashboard?.overview.improvement_direction ?? "stable";
  const improvementDelta = Math.round(postAttemptDashboard?.overview.improvement_delta ?? 0);

  if (improvementDirection === "up" && improvementDelta > 0) {
    return `Bugun siz ${improvementDelta}% yaxshilandingiz.`;
  }

  if (result.passed) {
    return "Siz yaxshi rivojlanayapsiz.";
  }

  return focusTopic
    ? `${focusTopic} bo'yicha keyingi qadam aniq bo'ldi.`
    : "Bugungi mashq sizga keyingi qadamni aniq ko'rsatdi.";
}

function buildFollowUpMessage({
  focusTopic,
  readinessScore,
  passProbability,
  dueReviews,
  launchReady,
}: {
  focusTopic?: string | null;
  readinessScore?: number | null;
  passProbability?: number | null;
  dueReviews: number;
  launchReady?: boolean;
}) {
  if (launchReady) {
    return "Natija yaxshi. Xohlasangiz endi simulyatsiyaga o'tishingiz mumkin.";
  }

  if ((readinessScore ?? 0) >= 70) {
    return "Yana biroz mashq qilsangiz simulyatsiyaga tayyor bo'lasiz.";
  }

  if (focusTopic && dueReviews > 0) {
    return `${focusTopic} bo'yicha dars va qisqa review sizga eng katta foyda beradi.`;
  }

  if (focusTopic && (passProbability ?? 0) >= 60) {
    return `${focusTopic} ustida yana bir mashq blokini bajarsangiz natija yanada barqarorlashadi.`;
  }

  if (focusTopic) {
    return `${focusTopic} ustida ishlashni davom ettirsangiz tayyorgarlik bosqichma-bosqich oshadi.`;
  }

  return "Kichik, muntazam mashqlar sizni imtihonga yaqinlashtiradi.";
}

export function AssessmentSession({
  session,
  onExit,
  onFinished,
}: {
  session: SessionPayload;
  onExit: () => void;
  onFinished?: (result: AttemptResult) => void;
}) {
  const { authenticated } = useUser();
  const progressSnapshot = useOptionalProgressSnapshot();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(session.durationMinutes * 60);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const questionStartedAt = useRef<number>(Date.now());
  const responseTimesRef = useRef<Record<string, number>>({});
  const initialDashboardRef = useRef<DashboardAnalytics | null>(progressSnapshot?.dashboard ?? null);
  const isSubmittingRef = useRef(false);
  const postAttemptDashboard = useAsyncResource(
    getDashboardAnalytics,
    [authenticated, result?.finished_at],
    authenticated && Boolean(result),
  );
  const reviewQueueResource = useAsyncResource(
    getReviewQueue,
    [authenticated, result?.finished_at],
    authenticated && Boolean(result),
  );
  const lessonsFeed = useAsyncResource(
    getLessonsFeed,
    [authenticated, result?.finished_at],
    authenticated && Boolean(result),
  );

  const currentQuestion = session.questions[currentIndex];

  useEffect(() => {
    if (!result && progressSnapshot?.dashboard && !initialDashboardRef.current) {
      initialDashboardRef.current = progressSnapshot.dashboard;
    }
  }, [progressSnapshot?.dashboard, result]);

  useEffect(() => {
    if (result || remainingSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          void handleSubmit();
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [remainingSeconds, result]);

  const recordResponseTime = (questionId: string) => {
    const elapsed = Date.now() - questionStartedAt.current;
    responseTimesRef.current = {
      ...responseTimesRef.current,
      [questionId]: (responseTimesRef.current[questionId] ?? 0) + elapsed,
    };
    questionStartedAt.current = Date.now();
    return responseTimesRef.current;
  };

  const goToQuestion = (index: number) => {
    if (!result) {
      recordResponseTime(currentQuestion.id);
    }
    setCurrentIndex(index);
  };

  const handleSelect = (optionId: string) => {
    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: optionId,
    }));
  };

  const handleSubmit = async () => {
    if (submitting || result || isSubmittingRef.current) {
      return;
    }

    const responseTimes = recordResponseTime(currentQuestion.id);
    setSubmitting(true);
    isSubmittingRef.current = true;

    try {
      const nextResult = await submitAttempt({
        attempt_id: session.attemptId,
        answers,
        response_times: session.questions.map((question) => responseTimes[question.id] ?? 0),
      });
      setResult(nextResult);
      onFinished?.(nextResult);
      void progressSnapshot?.reload();
    } catch (error) {
      console.error("Submission failed:", error);
      isSubmittingRef.current = false;
      setSubmitting(false);
    } finally {
      // We don't reset isSubmittingRef here if success, because we don't want to allow another submission
      // even if the component stays mounted (though result guard above will catch it too).
      setSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / session.questions.length) * 100;
  const timeLabel = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;

  const answerBreakdown = useMemo(() => {
    if (!result) {
      return [];
    }

    return session.questions.map((question) => {
      const answerMeta = result.answers.find((item) => item.question_id === question.id);
      const selected = question.answer_options.find((item) => item.id === answers[question.id]);
      const correct = question.answer_options.find((item) => item.id === answerMeta?.correct_option_id);
      return {
        question,
        answerMeta,
        selected,
        correct,
      };
    });
  }, [answers, result, session.questions]);

  const weakestTopic = useMemo(() => {
    if (!result) {
      return null;
    }

    return deriveWeakestTopicFromResult(result, session.questions);
  }, [result, session.questions]);

  const postAttemptGuidance = useMemo(() => {
    if (!result || !weakestTopic) {
      return null;
    }

    const masteryState = resolveAttemptTopicState(weakestTopic, result);
    const masteryMeta = masteryStateMeta(masteryState);
    const recommendation =
      postAttemptDashboard.data?.lesson_recommendations.find((item) => item.topic === weakestTopic) ??
      postAttemptDashboard.data?.lesson_recommendations[0] ??
      null;
    const lesson =
      (lessonsFeed.data?.lessons ?? []).find((item) => item.id === recommendation?.lesson_id) ??
      (lessonsFeed.data?.lessons ?? []).find((item) => item.topic === weakestTopic) ??
      null;
    const guidanceMessage =
      result.skill_messages.find((message) => message.toLowerCase().includes(weakestTopic.toLowerCase())) ??
      result.skill_messages[0] ??
      (result.fading_topics.includes(weakestTopic)
        ? `${weakestTopic} bo'yicha signal pasaygan. Endi darsni ko'rib, keyin mashqni davom ettiring.`
        : masteryMeta.description);

    return {
      topic: weakestTopic,
      masteryMeta,
      guidanceMessage,
      lessonTitle: recommendation?.title ?? lesson?.title ?? null,
      lessonTopic: recommendation?.topic ?? lesson?.topic ?? weakestTopic,
    };
  }, [lessonsFeed.data?.lessons, postAttemptDashboard.data?.lesson_recommendations, result, weakestTopic]);

  const aiFeedback = useMemo(() => {
    if (!result) {
      return null;
    }

    const focusTopic = postAttemptGuidance?.topic ?? weakestTopic ?? null;
    const nextDashboard = postAttemptDashboard.data ?? progressSnapshot?.dashboard ?? null;
    const plan = nextDashboard
      ? buildAdaptiveStudyPlan({
          dashboard: nextDashboard,
          reviewQueue: reviewQueueResource.data,
          focusTopic,
          lessonTitle: postAttemptGuidance?.lessonTitle ?? null,
          lessonTopic: postAttemptGuidance?.lessonTopic ?? focusTopic,
          completedOverrides: {
            practice: true,
            lesson: false,
            review:
              (initialDashboardRef.current?.overview.total_due ?? 0) > 0 &&
              (reviewQueueResource.data?.total_due ?? nextDashboard.overview.total_due) === 0,
          },
        })
      : null;
    const message = buildImprovementMessage({
      result,
      focusTopic,
      baselineDashboard: initialDashboardRef.current,
      postAttemptDashboard: nextDashboard,
    });
    const secondaryMessage = buildFollowUpMessage({
      focusTopic,
      readinessScore: nextDashboard?.overview.readiness_score ?? null,
      passProbability: nextDashboard?.overview.pass_probability ?? null,
      dueReviews: nextDashboard?.overview.total_due ?? 0,
      launchReady: nextDashboard?.simulation_status?.launch_ready,
    });

    return {
      message,
      secondaryMessage,
      focusTopic,
      readinessScore: nextDashboard?.overview.readiness_score ?? null,
      passProbability: nextDashboard?.overview.pass_probability ?? null,
      progressMessage: plan?.progressMessage ?? null,
      readinessPrediction: plan?.readinessPrediction ?? null,
      actions: [
        {
          href: "/practice",
          label: "Mashq qilish",
          icon: "arrow" as const,
        },
        {
          href: `/lessons?topic=${encodeURIComponent(postAttemptGuidance?.lessonTopic ?? focusTopic ?? "umumiy")}`,
          label: "Darsni ko'rish",
          variant: "outline" as const,
          icon: "book" as const,
        },
      ],
    };
  }, [
    postAttemptDashboard.data,
    postAttemptGuidance,
    progressSnapshot?.dashboard,
    result,
    reviewQueueResource.data,
    weakestTopic,
  ]);

  return (
    <div className="assessment-focus min-h-screen rounded-[1.5rem]">
      <header className="flex flex-col gap-4 rounded-xl border border-[var(--border)]/50 bg-[var(--card)] p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="-ml-1" onClick={onExit}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-caption font-medium">{session.modeLabel}</p>
            <h2 className="text-lg font-semibold">{session.title}</h2>
            <p className="text-caption mt-0.5">
              Savol {currentIndex + 1} / {session.questions.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-sm font-medium ${
              remainingSeconds < 60
                ? "bg-[var(--accent-red-soft)] text-[var(--accent-red)]"
                : remainingSeconds < 300
                  ? "bg-[var(--accent-yellow-soft)] text-[var(--accent-yellow)]"
                  : "bg-[var(--muted)]"
            }`}
          >
            <Timer className="h-4 w-4" />
            <span>{timeLabel}</span>
          </div>
          {!result ? (
            <Button
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="rounded-xl"
            >
              {submitting ? "Yuborilmoqda..." : "Yakunlash"}
            </Button>
          ) : null}
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-caption">
              <span>{answeredCount} / {session.questions.length} javoblangan</span>
              <span className="font-semibold">{Math.round(progress)}%</span>
            </div>
            <Progress
              value={progress}
              className="h-1.5"
              indicatorClassName="progress-animated bg-[var(--progress-gradient)]"
            />
          </div>

          {result ? (
            <Card className={`rounded-xl border ${result.passed 
              ? "border-[var(--primary)]/30 bg-[var(--primary-soft)]" 
              : "border-[var(--accent)]/30 bg-[var(--accent-soft)]"
            }`}>
              <CardContent className="space-y-5 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    {result.passed 
                      ? <CheckCircle2 className="h-12 w-12 text-[var(--primary)]" /> 
                      : <XCircle className="h-12 w-12 text-[var(--accent)]" />
                    }
                    <div>
                      <h3 className="text-2xl font-bold">{result.passed ? "Imtihon yakunlandi" : "Yana bir urinish kerak"}</h3>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {result.pass_prediction_label ?? (result.passed ? "Natija muvaffaqiyatli." : "Ko'proq mashq qilish tavsiya etiladi.")}
                      </p>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-4xl font-bold">{result.score}%</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {result.correct_count}/{result.total} to'g'ri - {formatRelativeTime(result.finished_at)}
                    </p>
                  </div>
                </div>
                {result.reward_summary ? (
                  <RewardSummary result={result} gamification={progressSnapshot?.gamification ?? null} />
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {result && aiFeedback ? (
            <AIFeedback
              message={aiFeedback.message}
              secondaryMessage={aiFeedback.secondaryMessage}
              focusTopic={aiFeedback.focusTopic}
              readinessScore={aiFeedback.readinessScore}
              passProbability={aiFeedback.passProbability}
              progressMessage={aiFeedback.progressMessage}
              readinessPrediction={aiFeedback.readinessPrediction}
              actions={aiFeedback.actions}
            />
          ) : null}

          <div className="rounded-xl border border-[var(--border)]/50 bg-[var(--card)] p-8 shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl font-semibold leading-relaxed">{currentQuestion.text}</h3>
                {!result ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={flagged[currentQuestion.id] ? "text-[var(--accent-yellow)]" : ""}
                    onClick={() =>
                      setFlagged((previous) => ({
                        ...previous,
                        [currentQuestion.id]: !previous[currentQuestion.id],
                      }))
                    }
                  >
                    <Flag className="h-5 w-5" />
                  </Button>
                ) : null}
              </div>

            {currentQuestion.image_url ? (
              <div className="my-6 rounded-xl bg-[var(--muted)]/60 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentQuestion.image_url} alt={currentQuestion.text} className="mx-auto max-h-64 rounded-lg object-contain" />
              </div>
            ) : null}

            <div className="mt-8 space-y-3">
              {currentQuestion.answer_options.map((option, index) => {
                const answerMeta = result?.answers.find((item) => item.question_id === currentQuestion.id);
                const isSelected = answers[currentQuestion.id] === option.id;
                const isCorrect = answerMeta?.correct_option_id === option.id;
                const isWrongSelection = Boolean(result && isSelected && !isCorrect);
                return (
                  <button
                    key={option.id}
                    className={`w-full rounded-xl border-2 px-5 py-4 text-left transition-all ${
                      result
                        ? isCorrect
                          ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                          : isWrongSelection
                            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                            : "border-[var(--border)]/50 opacity-60"
                        : isSelected
                          ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                          : "border-[var(--border)]/60 hover:border-[var(--primary)]/40 hover:bg-[var(--muted)]/50"
                    }`}
                    disabled={Boolean(result)}
                    onClick={() => handleSelect(option.id)}
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--muted)] text-sm font-semibold">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <div className="flex-1">
                        <p className="leading-relaxed">{option.text}</p>
                        {result && isCorrect ? <p className="mt-2 text-sm font-semibold text-[var(--primary)]">To'g'ri javob</p> : null}
                        {result && isWrongSelection ? <p className="mt-2 text-sm font-semibold text-[var(--accent)]">Sizning javobingiz</p> : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {!result ? (
              <div className="mt-8 flex items-center justify-between border-t border-[var(--border)]/50 pt-6">
                <Button variant="outline" className="rounded-xl" disabled={currentIndex === 0} onClick={() => goToQuestion(currentIndex - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                  Oldingi
                </Button>
                <Button
                  className="rounded-xl"
                  disabled={currentIndex >= session.questions.length - 1}
                  onClick={() => goToQuestion(currentIndex + 1)}
                >
                  Keyingi
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>

          {result ? (
            <div className="rounded-xl border border-[var(--border)]/50 bg-[var(--card)] p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-section font-semibold">Javoblar tahlili</h3>
                  {!result.answers_unlocked ? (
                    <Badge variant="warning">Batafsil tahlil yopiq</Badge>
                  ) : null}
                </div>
                {!result.answers_unlocked ? (
                  <div className="flex items-start gap-3 rounded-xl bg-[var(--accent-soft)] p-4 text-sm text-[var(--accent)]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{getLockedAnalysisMessage(result.unlock_reason)}</p>
                  </div>
                ) : (
                  answerBreakdown.map((item, index) => (
                    <div key={item.question.id} className="rounded-xl border border-[var(--border)]/50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--muted-foreground)]">Savol {index + 1}</p>
                          <p className="mt-1 font-medium">{item.question.text}</p>
                        </div>
                        <Badge variant={item.answerMeta?.is_correct ? "success" : "warning"}>
                          {item.answerMeta?.is_correct ? "To'g'ri" : "Xato"}
                        </Badge>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl bg-[var(--muted)]/60 p-3">
                          <p className="text-caption">Sizning javobingiz</p>
                          <p className="mt-2 text-sm">{item.selected?.text ?? "Javob berilmagan"}</p>
                        </div>
                        <div className="rounded-xl bg-[var(--primary-soft)] p-3">
                          <p className="text-caption font-semibold text-[var(--primary)]">To'g'ri javob</p>
                          <p className="mt-2 text-sm">{item.correct?.text ?? "Mavjud emas"}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="h-fit rounded-xl border border-[var(--border)]/50 bg-[var(--card)] p-5 shadow-[var(--shadow-soft)] lg:sticky lg:top-24">
          <h3 className="text-section font-semibold">Savollar</h3>
          <p className="text-caption mt-0.5">{session.modeLabel}</p>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {session.questions.map((question, index) => {
              const isActive = index === currentIndex;
              const isAnswered = Boolean(answers[question.id]);
              const isFlagged = Boolean(flagged[question.id]);
              const resultMeta = result?.answers.find((item) => item.question_id === question.id);
              return (
                <button
                  key={question.id}
                  className={`aspect-square rounded-lg text-sm font-semibold transition-all ${
                    resultMeta
                      ? resultMeta.is_correct
                        ? "bg-[var(--accent-green)] text-[var(--accent-brand-contrast)]"
                        : "bg-[var(--accent-red)] text-[var(--destructive-foreground)]"
                      : isActive
                        ? "ring-2 ring-[var(--primary)] ring-offset-2"
                        : isFlagged
                          ? "bg-[var(--accent-yellow-soft)] text-[var(--accent-yellow)]"
                          : isAnswered
                            ? "bg-[var(--accent-green)] text-[var(--accent-brand-contrast)]"
                            : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  }`}
                  onClick={() => goToQuestion(index)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-2 border-t border-[var(--border)]/50 pt-4 text-caption">
            <div className="flex justify-between">
              <span>Javob berilgan</span>
              <span className="font-semibold">{answeredCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Belgilangan</span>
              <span className="font-semibold">{Object.values(flagged).filter(Boolean).length}</span>
            </div>
            {result ? (
              <div className="flex justify-between">
                <span>Natija</span>
                <span className="font-semibold">{result.passed ? "O'tdi" : "O'tmadi"}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
