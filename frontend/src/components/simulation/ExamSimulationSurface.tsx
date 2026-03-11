"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock3, Flag, ShieldCheck, Target } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  AnimatedNumber,
  EmptyIntelligenceState,
  IntelligenceActionButton,
  IntelligenceAnimatedProgress,
  IntelligenceHero,
  IntelligenceLoadingSkeleton,
  IntelligenceMetricCard,
  IntelligencePanel,
} from "@/components/intelligence/IntelligencePrimitives";
import { useI18n } from "@/components/i18n-provider";
import type { UserAnalyticsSummary } from "@/schemas/analytics.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, getErrorMessage } from "@/lib/api";
import { getUserProfileBundle } from "@/lib/intelligence";
import {
  buildSeededSimulationHistory,
  formatSimulationDate,
  getDaysUntilNextSimulation,
  mergeSimulationHistory,
  readSimulationHistory,
  type SimulationHistoryEntry,
  writeSimulationHistory,
} from "@/lib/simulationHistory";
import { useAuth } from "@/store/useAuth";
import { cn } from "@/lib/utils";

type SimulationQuestionOption = {
  id: string;
  text: string;
  is_correct?: boolean;
};

type SimulationQuestion = {
  id: string;
  text: string;
  image_url?: string | null;
  video_url?: string | null;
  media_type?: string | null;
  topic?: string | null;
  category?: string | null;
  difficulty?: string | null;
  explanation?: string | null;
  answer_options: SimulationQuestionOption[];
};

type ExamSimulationStartResponse = {
  attempt_id: string;
  question_count: number;
  duration_minutes: number;
  started_at: string;
  expires_at: string;
  strict_timer: boolean;
  questions: SimulationQuestion[];
};

type ExamSimulationFinishResponse = {
  score: number;
  total: number;
  pass_probability: number;
  weak_topics: string[];
  recommended_review: string[];
  finished_at: string;
  time_expired: boolean;
};

type SimulationState =
  | {
      phase: "idle";
    }
  | {
      phase: "running";
      attempt: ExamSimulationStartResponse;
      answers: Record<string, string>;
      flaggedQuestionIds: string[];
      currentIndex: number;
      timeLeft: number;
    }
  | {
      phase: "finished";
      result: ExamSimulationFinishResponse;
      attempt: ExamSimulationStartResponse;
      answers: Record<string, string>;
      flaggedQuestionIds: string[];
    };

function getSecondsRemaining(expiresAt: string): number {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.floor(diffMs / 1000));
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getOptionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export default function ExamSimulationSurface() {
  const { t } = useI18n();
  const router = useRouter();
  const { token, hydrated, user, fetchUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<SimulationState>({ phase: "idle" });
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [pendingExitHref, setPendingExitHref] = useState<string | null>(null);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getUserProfileBundle>> | null>(null);
  const [simulationHistory, setSimulationHistory] = useState<SimulationHistoryEntry[]>([]);
  const finishTriggeredRef = useRef(false);
  const reviewSectionRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!user && token) {
      void fetchUser();
    }
  }, [fetchUser, hydrated, token, user]);

  useEffect(() => {
    if (!hydrated || !token) {
      return;
    }

    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [bundle, summaryResponse] = await Promise.all([
          getUserProfileBundle(),
          api.get<UserAnalyticsSummary>("/analytics/summary"),
        ]);
        if (!active) {
          return;
        }
        setProfile(bundle);
        const seededHistory = buildSeededSimulationHistory(summaryResponse.data.last_attempts);
        setSimulationHistory(mergeSimulationHistory(readSimulationHistory(), seededHistory));
      } catch (loadError) {
        if (!active) {
          return;
        }
        console.error("Exam simulation profile load failed", loadError);
        setError(t("simulation.profile_load_error"));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [hydrated, t, token]);

  async function handleStart() {
    setStarting(true);
    setError(null);
    setShowExitWarning(false);
    setPendingExitHref(null);
    try {
      const response = await api.post<ExamSimulationStartResponse>("/exam-simulation/start");
      const attempt = response.data;
      setState({
        phase: "running",
        attempt,
        answers: {},
        flaggedQuestionIds: [],
        currentIndex: 0,
        timeLeft: getSecondsRemaining(attempt.expires_at),
      });
    } catch (startError) {
      setError(getErrorMessage(startError));
    } finally {
      setStarting(false);
    }
  }

  const handleFinish = useCallback(async (fromTimeout = false) => {
    setSubmitting(true);
    setError(null);
    try {
      if (state.phase !== "running") {
        return;
      }
      const runningState = state;
      const response = await api.post<ExamSimulationFinishResponse>("/exam-simulation/finish", {
        attempt_id: runningState.attempt.attempt_id,
        answers: runningState.answers,
      });
      setState({
        phase: "finished",
        result: {
          ...response.data,
          time_expired: fromTimeout || response.data.time_expired,
        },
        attempt: runningState.attempt,
        answers: runningState.answers,
        flaggedQuestionIds: runningState.flaggedQuestionIds,
      });
      setSimulationHistory((current) => writeSimulationHistory([
        {
          completed_at: response.data.finished_at,
          score: response.data.score,
          total: response.data.total,
          pass_probability: Number((response.data.pass_probability * 100).toFixed(1)),
          weak_topics: response.data.weak_topics,
        },
        ...current,
      ]));
    } catch (finishError) {
      setError(getErrorMessage(finishError));
      finishTriggeredRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [state]);

  useEffect(() => {
    if (state.phase !== "running") {
      finishTriggeredRef.current = false;
      return;
    }

    if (state.timeLeft <= 0 && !finishTriggeredRef.current) {
      finishTriggeredRef.current = true;
      void handleFinish(true);
      return;
    }

    const timer = window.setInterval(() => {
      setState((current) => {
        if (current.phase !== "running") {
          return current;
        }
        return {
          ...current,
          timeLeft: getSecondsRemaining(current.attempt.expires_at),
        };
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [handleFinish, state]);

  useEffect(() => {
    if (state.phase !== "running") {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handlePopState = () => {
      window.history.pushState({ examSimulation: true }, "", window.location.href);
      setPendingExitHref("/dashboard");
      setShowExitWarning(true);
    };

    window.history.pushState({ examSimulation: true }, "", window.location.href);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [state.phase]);

  function requestExit(href = "/dashboard") {
    setPendingExitHref(href);
    setShowExitWarning(true);
  }

  function handleConfirmExit() {
    setShowExitWarning(false);
    router.push(pendingExitHref ?? "/dashboard");
  }

  function scrollToReviewSection() {
    reviewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSelectAnswer(questionId: string, optionId: string) {
    setState((current) => {
      if (current.phase !== "running") {
        return current;
      }
      return {
        ...current,
        answers: {
          ...current.answers,
          [questionId]: optionId,
        },
      };
    });
  }

  function jumpToQuestion(nextIndex: number) {
    setState((current) => {
      if (current.phase !== "running") {
        return current;
      }
      return {
        ...current,
        currentIndex: Math.max(0, Math.min(current.attempt.questions.length - 1, nextIndex)),
      };
    });
  }

  function toggleFlagQuestion(questionId: string) {
    setState((current) => {
      if (current.phase !== "running") {
        return current;
      }

      const alreadyFlagged = current.flaggedQuestionIds.includes(questionId);
      return {
        ...current,
        flaggedQuestionIds: alreadyFlagged
          ? current.flaggedQuestionIds.filter((item) => item !== questionId)
          : [...current.flaggedQuestionIds, questionId],
      };
    });
  }

  const progress = useMemo(() => {
    if (state.phase !== "running") {
      return 0;
    }
    return ((state.currentIndex + 1) / state.attempt.question_count) * 100;
  }, [state]);

  if (!hydrated || loading) {
    return <IntelligenceLoadingSkeleton />;
  }

  const latestSimulationEntry = simulationHistory[0] ?? null;
  const nextSimulationInDays = latestSimulationEntry
    ? getDaysUntilNextSimulation(latestSimulationEntry.completed_at)
    : 0;

  if (state.phase === "idle") {
    return (
      <div className="intelligence-page">
        <div className="container-app space-y-6 py-8 sm:py-10">
          <IntelligenceHero
            eyebrow={t("simulation.hero_eyebrow")}
            title={t("simulation.hero_title")}
            description={t("simulation.hero_description")}
            badge={profile?.coach.message}
            badgeLabel={t("simulation.badge_label", "Bugungi tavsiya")}
            actions={(
              <>
                <IntelligenceActionButton href="/practice" label={t("simulation.open_practice")} secondary />
                <IntelligenceActionButton href="/dashboard" label={t("simulation.back_dashboard")} secondary />
              </>
            )}
          >
            <div className="intelligence-float-card rounded-[1.75rem] border border-white/14 bg-white/6 p-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">{t("simulation.readiness_baseline")}</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                {profile ? <AnimatedNumber value={profile.readiness.readiness_score} decimals={1} suffix="%" /> : "--"}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/66">
                {t("simulation.current_ml_probability")}: {profile ? `${profile.prediction.exam_pass_probability.toFixed(1)}%` : "--"}
              </p>
            </div>
          </IntelligenceHero>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <IntelligenceMetricCard
              eyebrow={t("simulation.exam_rules")}
              title={t("simulation.question_count")}
              numericValue={20}
              description={t("simulation.question_count_description")}
              icon={Target}
            />
            <IntelligenceMetricCard
              eyebrow={t("simulation.strict_timer")}
              title={t("simulation.duration")}
              numericValue={20}
              suffix={` ${t("simulation.minutes_short")}`}
              description={t("simulation.duration_description")}
              icon={Clock3}
              delay={0.04}
            />
            <IntelligenceMetricCard
              eyebrow={t("simulation.cooldown")}
              title={t("simulation.retry_window")}
              numericValue={14}
              suffix={` ${t("simulation.days_short")}`}
              description={t("simulation.retry_window_description")}
              icon={AlertTriangle}
              delay={0.08}
            />
            <IntelligenceMetricCard
              eyebrow={t("simulation.readiness")}
              title={t("simulation.weak_topics")}
              numericValue={profile?.readiness.weak_topics.length ?? 0}
              description={t("simulation.weak_topics_description")}
              icon={ShieldCheck}
              delay={0.12}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
            <IntelligencePanel
              eyebrow={t("simulation.briefing_eyebrow")}
              title={t("simulation.before_start")}
              description={t("simulation.before_start_description")}
            >
              <div className="grid gap-3 md:grid-cols-3">
                <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <p className="intelligence-eyebrow">{t("simulation.pressure")}</p>
                  <p className="mt-2 text-lg font-medium text-white">{t("simulation.pressure_value")}</p>
                </div>
                <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <p className="intelligence-eyebrow">{t("simulation.outcome")}</p>
                  <p className="mt-2 text-lg font-medium text-white">{t("simulation.outcome_value")}</p>
                </div>
                <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <p className="intelligence-eyebrow">{t("simulation.goal")}</p>
                  <p className="mt-2 text-lg font-medium text-white">{t("simulation.goal_value")}</p>
                </div>
              </div>
              <Button
                className="mt-6 rounded-full bg-white text-slate-950 hover:bg-white/90"
                onClick={() => void handleStart()}
                disabled={starting}
              >
                {starting ? t("simulation.starting") : t("simulation.start_button")}
              </Button>
              {error ? (
                <p className="mt-4 text-sm text-rose-200">{error}</p>
              ) : null}
            </IntelligencePanel>

            <IntelligencePanel
              eyebrow={t("simulation.cooldown_panel", "Kutish va fokus")}
              title={t("simulation.review_first")}
              description={t("simulation.review_first_description")}
              delay={0.06}
            >
              <div className="mb-4 rounded-[1.5rem] border border-amber-400/18 bg-amber-400/8 p-4">
                <p className="intelligence-eyebrow">{t("simulation.cooldown", "Kutish davri")}</p>
                <p className="mt-2 text-lg font-medium text-white">{t("simulation.cooldown_notice", "Har bir imtihon simulyatsiyasidan keyin 14 kun kutish qoidasi qo'llanadi.")}</p>
                <p className="mt-2 text-sm text-white/62">{t("simulation.cooldown_notice_description", "Agar hozir blok bo'lsangiz, tizim aynan shu qoida bo'yicha keyingi imkoniyat vaqtini hisoblaydi.")}</p>
              </div>
              <div className="mb-4 rounded-[1.5rem] border border-cyan-400/18 bg-cyan-400/8 p-4">
                <p className="intelligence-eyebrow">{t("simulation.next_available", "Keyingi simulyatsiya")}</p>
                <p className="mt-2 text-lg font-medium text-white">
                  {nextSimulationInDays > 0
                    ? t("simulation.next_available_in_days", `Yana ${nextSimulationInDays} kundan keyin ochiladi`)
                    : t("simulation.next_available_now", "Hozir boshlash mumkin")}
                </p>
                <p className="mt-2 text-sm text-white/62">
                  {latestSimulationEntry
                    ? `${t("simulation.last_simulation_date", "Oxirgi simulyatsiya")}: ${formatSimulationDate(latestSimulationEntry.completed_at)}`
                    : t("simulation.no_simulation_history", "Hali simulyatsiya tarixi mavjud emas. Birinchi urinishni boshlashingiz mumkin.")}
                </p>
              </div>
              {profile && profile.readiness.weak_topics.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.readiness.weak_topics.map((topic) => (
                    <span key={topic} className="intelligence-pill">
                      <Flag className="h-3.5 w-3.5" />
                      {topic}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyIntelligenceState
                  title={t("simulation.weak_topics_stable")}
                  description={t("simulation.weak_topics_stable_description")}
                />
              )}
            </IntelligencePanel>
          </div>

          <IntelligencePanel
            eyebrow={t("simulation.history", "Simulyatsiya tarixi")}
            title={t("simulation.history_title", "So'nggi simulyatsiya urinishlari")}
            description={t("simulation.history_description", "Natija, ehtimol va zaif mavzular bo'yicha oldingi urinishlar bir joyda ko'rinadi.")}
          >
            {simulationHistory.length > 0 ? (
              <div className="grid gap-3">
                {simulationHistory.map((entry) => (
                  <div key={`${entry.completed_at}-${entry.score}`} className="rounded-[1.35rem] border border-white/10 bg-white/6 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="intelligence-eyebrow">{formatSimulationDate(entry.completed_at)}</p>
                        <p className="mt-2 text-lg font-medium text-white">
                          {entry.score} / {entry.total}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="border-white/10 bg-white/8 text-white/80">
                          {entry.pass_probability.toFixed(1)}%
                        </Badge>
                        <Badge className="border-white/10 bg-white/8 text-white/80">
                          {entry.weak_topics.length > 0
                            ? `${entry.weak_topics.length} ${t("simulation.weak_topics", "Zaif mavzular").toLowerCase()}`
                            : t("simulation.no_weak_topics_short", "Zaif mavzu yo'q")}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.weak_topics.length > 0 ? entry.weak_topics.map((topic) => (
                        <span key={`${entry.completed_at}-${topic}`} className="intelligence-pill">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {topic}
                        </span>
                      )) : (
                        <span className="text-sm text-white/60">
                          {t("simulation.history_weak_topics_unavailable", "Bu urinish uchun zaif mavzular saqlanmagan.")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyIntelligenceState
                title={t("simulation.history_empty_title", "Simulyatsiya tarixi hali bo'sh")}
                description={t("simulation.history_empty_description", "Birinchi imtihon simulyatsiyasini yakunlaganingizdan keyin tarix shu yerda saqlanadi.")}
              />
            )}
          </IntelligencePanel>
        </div>
      </div>
    );
  }

  if (state.phase === "finished") {
    const reviewItems = state.attempt.questions.map((question, index) => {
      const selectedOptionId = state.answers[question.id];
      const selectedOption = question.answer_options.find((option) => option.id === selectedOptionId) ?? null;
      const correctOption = question.answer_options.find((option) => option.is_correct) ?? null;

      return {
        id: question.id,
        index,
        question,
        selectedOption,
        correctOption,
        selectedOptionId,
        flagged: state.flaggedQuestionIds.includes(question.id),
      };
    });
    const answeredQuestions = reviewItems.filter((item) => Boolean(item.selectedOptionId)).length;
    const unansweredQuestions = reviewItems.length - answeredQuestions;
    const flaggedQuestions = reviewItems.filter((item) => item.flagged).length;

    return (
      <div className="intelligence-page">
        <div className="container-app space-y-6 py-8 sm:py-10">
          <IntelligenceHero
            eyebrow={t("simulation.result_eyebrow")}
            title={t("simulation.result_title")}
            description={t("simulation.result_description")}
            badge={state.result.time_expired ? t("simulation.time_expired") : t("simulation.completed_in_time")}
            badgeLabel={t("simulation.result_badge_label", "Yakun holati")}
            actions={(
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/10"
                  onClick={scrollToReviewSection}
                >
                  {t("simulation.review_mode_title", "Savollarni qayta ko'rib chiqing")}
                </Button>
                <IntelligenceActionButton href="/practice" label={t("simulation.return_practice")} />
                <IntelligenceActionButton href="/analytics" label={t("simulation.open_analytics")} secondary />
              </>
            )}
          >
            <div className="exam-panel-strong intelligence-float-card p-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">{t("simulation.exam_score")}</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                <AnimatedNumber value={state.result.score} /> / <AnimatedNumber value={state.result.total} />
              </p>
              <p className="mt-2 text-sm leading-6 text-white/66">
                {t("simulation.simulation_probability")}: {(state.result.pass_probability * 100).toFixed(1)}%
              </p>
              <div className="mt-4">
                <IntelligenceAnimatedProgress
                  value={(state.result.score / Math.max(1, state.result.total)) * 100}
                  className="h-2.5"
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="exam-result-stat p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">{t("simulation.correct_answers", "To'g'ri javoblar")}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{state.result.score}</p>
                </div>
                <div className="exam-result-stat p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">{t("simulation.wrong_answers", "Noto'g'ri javoblar")}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{Math.max(0, state.result.total - state.result.score)}</p>
                </div>
                <div className="exam-result-stat p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">{t("simulation.weak_topics", "Zaif mavzular")}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{state.result.weak_topics.length}</p>
                </div>
              </div>
            </div>
          </IntelligenceHero>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <IntelligenceMetricCard
              eyebrow={t("simulation.outcome")}
              title={t("simulation.correct_answers", "To'g'ri javoblar")}
              numericValue={state.result.score}
              description={t("simulation.score_description")}
              icon={CheckCircle2}
            />
            <IntelligenceMetricCard
              eyebrow={t("simulation.outcome")}
              title={t("simulation.wrong_answers", "Noto'g'ri javoblar")}
              numericValue={Math.max(0, state.result.total - state.result.score)}
              description={t("simulation.wrong_answers_description", "Qayta ko'rib chiqilishi kerak bo'lgan javoblar soni.")}
              icon={AlertTriangle}
              delay={0.04}
            />
            <IntelligenceMetricCard
              eyebrow={t("simulation.probability")}
              title={t("simulation.pass_signal")}
              numericValue={state.result.pass_probability * 100}
              decimals={1}
              suffix="%"
              description={t("simulation.pass_signal_description")}
              icon={ShieldCheck}
              delay={0.08}
            />
            <IntelligenceMetricCard
              eyebrow={t("simulation.review", "Ko'rib chiqish")}
              title={t("simulation.review_questions_count", "Sharhlanadigan savollar")}
              numericValue={answeredQuestions}
              description={t("simulation.review_questions_count_description", "Yakunlangandan keyin javob bergan savollaringizni birma-bir ko'rib chiqishingiz mumkin.")}
              icon={Target}
              delay={0.12}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <IntelligencePanel
              eyebrow={t("simulation.weak_topics")}
              title={t("simulation.primary_review_targets")}
            >
              {state.result.weak_topics.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {state.result.weak_topics.map((topic) => (
                    <span key={topic} className="intelligence-pill">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {topic}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyIntelligenceState
                  title={t("simulation.no_critical_weak_topics")}
                  description={t("simulation.no_critical_weak_topics_description")}
                />
              )}
            </IntelligencePanel>

            <IntelligencePanel
              eyebrow={t("simulation.recommended_review")}
              title={t("simulation.what_next")}
              delay={0.06}
            >
              <div className="grid gap-4">
                <div className="exam-panel-soft p-4">
                  <p className="intelligence-eyebrow">{t("simulation.topic_breakdown", "Mavzu kesimidagi xulosa")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {state.result.recommended_review.map((topic) => (
                      <span key={topic} className="intelligence-pill">
                        <Target className="h-3.5 w-3.5" />
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
                {state.result.weak_topics.length > 0 ? (
                  <div className="exam-panel-soft border-cyan-400/18 bg-cyan-400/8 p-4">
                    <p className="intelligence-eyebrow">{t("simulation.practice_weak_topics", "Zaif mavzularni mashq qilish")}</p>
                    <p className="mt-2 text-base font-medium text-white">
                      {t("simulation.practice_weak_topics_description", "Bu urinishda zaif mavzular topildi. Keyingi mashqni aynan shu yo'nalishdan boshlang.")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {state.result.weak_topics.map((topic) => (
                        <span key={`practice-${topic}`} className="intelligence-pill">
                          <Flag className="h-3.5 w-3.5" />
                          {topic}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button asChild className="rounded-full bg-white text-slate-950 hover:bg-white/90">
                        <Link href={`/tests?topic=${encodeURIComponent(state.result.weak_topics[0])}`}>
                          {t("simulation.practice_weak_topics_cta", "Zaif mavzularni mashq qilish")}
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/10"
                      >
                        <Link href="/review-queue">
                          {t("simulation.open_review_queue", "Qayta ko'rish navbatini ochish")}
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="exam-panel-soft border-amber-400/18 bg-amber-400/8 p-4">
                  <p className="intelligence-eyebrow">{t("simulation.cooldown_after_finish", "Keyingi urinish")}</p>
                  <p className="mt-2 text-base font-medium text-white">{t("simulation.cooldown_after_finish_message", "Yangi imtihon simulyatsiyasi 14 kunlik kutish muddatidan keyin ochiladi.")}</p>
                </div>
              </div>
            </IntelligencePanel>
          </div>

          <div ref={reviewSectionRef}>
            <IntelligencePanel
              eyebrow={t("simulation.review", "Savollar sharhi")}
              title={t("simulation.review_mode_title", "Savollarni qayta ko'rib chiqing")}
              description={t("simulation.review_mode_description", "Bu bo'limda siz tanlagan javob, savol mavzusi va mavjud bo'lsa izoh ko'rsatiladi. Belgilangan savollar alohida ajratib ko'rsatiladi.")}
            >
              <div className="mb-5 grid gap-3 md:grid-cols-3">
                <div className="exam-result-stat">
                  <p className="intelligence-eyebrow">{t("simulation.answered", "Javob berilgan")}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{answeredQuestions}</p>
                </div>
                <div className="exam-result-stat">
                  <p className="intelligence-eyebrow">{t("simulation.remaining", "Javobsiz")}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{unansweredQuestions}</p>
                </div>
                <div className="exam-result-stat border-amber-400/18 bg-amber-400/8">
                  <p className="intelligence-eyebrow">{t("simulation.flagged_questions", "Belgilangan savollar")}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{flaggedQuestions}</p>
                </div>
              </div>

              <div className="grid gap-4">
                {reviewItems.map((item) => (
                  <details
                    key={item.id}
                    className={cn(
                      "exam-panel-soft p-4 transition-colors open:bg-white/8",
                      item.flagged ? "border-amber-400/25" : "border-white/10",
                    )}
                  >
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="border-white/10 bg-white/8 text-white/80">
                            {t("simulation.question_label")} {item.index + 1}
                          </Badge>
                          <Badge className="border-white/10 bg-white/8 text-white/80">
                            {item.question.topic || item.question.category || t("simulation.general")}
                          </Badge>
                          {item.flagged ? (
                            <Badge className="border-amber-400/30 bg-amber-400/14 text-amber-100">
                              <Flag className="mr-1 h-3 w-3" />
                              {t("simulation.flagged_badge", "Belgilangan")}
                            </Badge>
                          ) : null}
                        </div>
                        <h3 className="text-lg font-medium text-white">{item.question.text}</h3>
                      </div>
                      <Badge className="border-white/10 bg-white/8 text-white/72">
                        {item.selectedOptionId
                          ? t("simulation.review_open", "Sharhni ochish")
                          : t("simulation.not_answered", "Javob berilmagan")}
                      </Badge>
                    </summary>

                    <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 md:grid-cols-2">
                      <div className="exam-result-stat bg-black/20">
                        <p className="intelligence-eyebrow">{t("simulation.student_answer", "Sizning javobingiz")}</p>
                        <p className="mt-2 text-base font-medium text-white">
                          {item.selectedOption
                            ? `${getOptionLetter(item.question.answer_options.findIndex((option) => option.id === item.selectedOption?.id))}. ${item.selectedOption.text}`
                            : t("simulation.not_answered_fallback", "Bu savolga javob berilmagan.")}
                        </p>
                      </div>
                      <div className="exam-result-stat border-emerald-400/18 bg-emerald-400/8">
                        <p className="intelligence-eyebrow">{t("simulation.correct_answer", "To'g'ri javob")}</p>
                        <p className="mt-2 text-base font-medium text-white">
                          {item.correctOption
                            ? `${getOptionLetter(item.question.answer_options.findIndex((option) => option.id === item.correctOption?.id))}. ${item.correctOption.text}`
                            : t("simulation.correct_answer_unavailable", "Bu rejimda to'g'ri javob backend tomonidan ochilmagan.")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-[0.75fr_1.25fr]">
                      <div className="exam-panel-soft p-4">
                        <p className="intelligence-eyebrow">{t("simulation.topic", "Mavzu")}</p>
                        <p className="mt-2 text-sm leading-6 text-white/80">
                          {item.question.topic || item.question.category || t("simulation.general")}
                        </p>
                      </div>
                      <div className="exam-panel-soft p-4">
                        <p className="intelligence-eyebrow">{t("simulation.explanation", "Izoh")}</p>
                        <p className="mt-2 text-sm leading-6 text-white/80">
                          {item.question.explanation || t("simulation.explanation_unavailable", "Bu savol uchun izoh hozircha mavjud emas.")}
                        </p>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </IntelligencePanel>
          </div>

          <IntelligencePanel
            eyebrow={t("simulation.history", "Simulyatsiya tarixi")}
            title={t("simulation.history_title", "So'nggi simulyatsiya urinishlari")}
            description={t("simulation.history_description", "Natijalar o'sishni kuzatish va keyingi mashq siklini tanlashga yordam beradi.")}
          >
            {simulationHistory.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {simulationHistory.map((entry) => (
                  <div key={`${entry.completed_at}-${entry.score}`} className="rounded-[1.35rem] border border-white/10 bg-white/6 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="intelligence-eyebrow">{formatSimulationDate(entry.completed_at)}</p>
                        <p className="mt-2 text-lg font-medium text-white">
                          {entry.score} / {entry.total}
                        </p>
                      </div>
                      <Badge className="border-white/10 bg-white/8 text-white/80">
                        {entry.pass_probability.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.weak_topics.length > 0 ? entry.weak_topics.map((topic) => (
                        <span key={`${entry.completed_at}-${topic}`} className="intelligence-pill">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {topic}
                        </span>
                      )) : (
                        <span className="text-sm text-white/60">
                          {t("simulation.history_weak_topics_unavailable", "Bu urinish uchun zaif mavzular saqlanmagan.")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyIntelligenceState
                title={t("simulation.history_empty_title", "Simulyatsiya tarixi hali bo'sh")}
                description={t("simulation.history_empty_description", "Birinchi imtihon simulyatsiyasini yakunlaganingizdan keyin tarix shu yerda saqlanadi.")}
              />
            )}
          </IntelligencePanel>
        </div>
      </div>
    );
  }

  const currentQuestion = state.attempt.questions[state.currentIndex];
  const answeredCount = Object.keys(state.answers).length;
  const remainingCount = Math.max(0, state.attempt.question_count - answeredCount);
  const isStressMode = state.timeLeft <= 300;
  const isCurrentQuestionFlagged = state.flaggedQuestionIds.includes(currentQuestion.id);
  const flaggedCount = state.flaggedQuestionIds.length;
  const stressWarningMessage = t("simulation.last_five_minutes_warning", "So'nggi 5 daqiqa. Ehtiyotkorlik bilan javob bering.");

  return (
    <div className="intelligence-page min-h-screen">
      <div className="container-app py-8 sm:py-10">
        <div className={cn("stress-shell p-4 shadow-[0_24px_80px_rgba(2,6,23,0.32)] backdrop-blur sm:p-6", isStressMode && "stress-shell-danger")}>
          <div className="exam-panel-strong p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="intelligence-eyebrow">{t("simulation.exam_environment", "Imtihon muhiti")}</p>
                <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                  {t("simulation.question_label")} {state.currentIndex + 1} / {state.attempt.question_count}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68">
                  {t("simulation.exam_environment_description", "Savolni diqqat bilan o'qing, javobni tanlang va keyingi savolga o'ting. Belgilangan savollarni yakunda qayta ko'rishingiz mumkin.")}
                </p>
              </div>
              <div className={`inline-flex items-center rounded-full border px-4 py-2 text-lg font-semibold ${isStressMode ? "border-rose-400/35 bg-rose-400/14 text-rose-100 stress-timer-danger stress-timer-text" : "border-white/10 bg-white/8 text-white"}`}>
                <Clock3 className="mr-2 h-5 w-5" />
                {formatClock(state.timeLeft)}
              </div>
            </div>

            <IntelligenceAnimatedProgress value={progress} className="mt-5 h-2.5" />

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="border-white/10 bg-white/8 text-white/80">
                {answeredCount} / {state.attempt.question_count} {t("simulation.answered", "Javob berilgan").toLowerCase()}
              </Badge>
              <Badge className="border-white/10 bg-white/8 text-white/80">
                {remainingCount} {t("simulation.remaining_short", "ta qoldi")}
              </Badge>
              <Badge className="border-white/10 bg-white/8 text-white/80">
                {flaggedCount} {t("simulation.flagged_questions_short", "belgilangan")}
              </Badge>
              <Badge className="border-white/10 bg-white/8 text-white/80">
                {currentQuestion.topic || currentQuestion.category || t("simulation.general")}
              </Badge>
              {isStressMode ? (
                <Badge className="border-rose-500/30 bg-rose-500/15 text-rose-100">
                  {stressWarningMessage}
                </Badge>
              ) : null}
            </div>

            {isStressMode ? (
              <div className="mt-4 rounded-[1.25rem] border border-rose-400/25 bg-rose-500/12 px-4 py-3 text-sm font-medium text-rose-100">
                {stressWarningMessage}
              </div>
            ) : null}
          </div>

          <div className="exam-panel-strong mt-5 p-4">
            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="intelligence-eyebrow">Savollar xaritasi</p>
                <p className="mt-2 text-sm leading-6 text-white/64">
                  {t("simulation.palette_description", "Javob berilgan, belgilangan va joriy savollar shu yerda ko'rinadi. Istalgan savolga bevosita o'tishingiz mumkin.")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className={`rounded-full border-white/12 bg-white/6 text-white hover:bg-white/10 ${isCurrentQuestionFlagged ? "border-amber-400/40 bg-amber-400/12 text-amber-100" : ""}`}
                onClick={() => toggleFlagQuestion(currentQuestion.id)}
              >
                <Flag className="mr-2 h-4 w-4" />
                {isCurrentQuestionFlagged ? "Belgini olib tashlash" : "Savolni belgilash"}
              </Button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <span className="exam-legend-chip">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                Javob berilgan
              </span>
              <span className="exam-legend-chip">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                Belgilangan
              </span>
              <span className="exam-legend-chip">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
                Joriy savol
              </span>
              <span className="exam-legend-chip">
                {answeredCount} / {state.attempt.question_count} {t("simulation.answered", "Javob berilgan").toLowerCase()}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {state.attempt.questions.map((question, index) => {
                const answered = Boolean(state.answers[question.id]);
                const flagged = state.flaggedQuestionIds.includes(question.id);
                const active = index === state.currentIndex;
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => jumpToQuestion(index)}
                    className={cn(
                      "exam-palette-button",
                      active && "exam-palette-button-current",
                      !active && answered && "exam-palette-button-answered",
                      !active && !answered && flagged && "exam-palette-button-flagged",
                    )}
                    aria-label={`${t("simulation.question_label")} ${index + 1}`}
                  >
                    {flagged ? <Flag className="absolute right-1.5 top-1.5 h-3 w-3 text-amber-200" /> : null}
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="mt-5"
            >
              <div className="exam-panel-strong p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="max-w-4xl">
                    <p className="intelligence-eyebrow">{t("simulation.question_label")} {state.currentIndex + 1}</p>
                    <h2 className="mt-4 text-2xl font-semibold leading-tight text-white sm:text-[2rem] sm:leading-[1.25]">
                      {currentQuestion.text}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-white/10 bg-white/8 text-white/80">
                      {currentQuestion.difficulty || t("simulation.general")}
                    </Badge>
                    {isCurrentQuestionFlagged ? (
                      <Badge className="border-amber-400/30 bg-amber-400/14 text-amber-100">
                        Belgilangan savol
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="border-white/10 bg-white/8 text-white/78">
                    {currentQuestion.topic || currentQuestion.category || t("simulation.general")}
                  </Badge>
                  {currentQuestion.difficulty ? (
                    <Badge className="border-white/10 bg-white/8 text-white/78">
                      {currentQuestion.difficulty}
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-7 grid gap-4">
                  {currentQuestion.answer_options.map((option, index) => {
                    const selected = state.answers[currentQuestion.id] === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelectAnswer(currentQuestion.id, option.id)}
                        aria-pressed={selected}
                        className={cn(
                          "exam-option-card",
                          selected && "exam-option-card-selected",
                        )}
                      >
                        <span className={cn("exam-option-letter", selected && "border-cyan-300/35 bg-cyan-300/12 text-cyan-50")}>
                          {String.fromCharCode(65 + index)}
                        </span>
                        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                          <div className="pt-1">
                            <p className="text-base leading-7 text-white/92 sm:text-[1.02rem]">
                              {option.text}
                            </p>
                            {selected ? (
                              <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100/82">
                                {t("simulation.selected_answer_state", "Tanlangan javob")}
                              </p>
                            ) : null}
                          </div>
                          {selected ? (
                            <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/12 text-cyan-100">
                              <CheckCircle2 className="h-4 w-4" />
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/10"
                onClick={() => requestExit("/dashboard")}
              >
                {t("simulation.leave_exam", "Imtihondan chiqish")}
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/10"
                onClick={() => jumpToQuestion(state.currentIndex - 1)}
                disabled={state.currentIndex === 0}
              >
                {t("simulation.previous")}
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/10"
                onClick={() => jumpToQuestion(state.currentIndex + 1)}
                disabled={state.currentIndex >= state.attempt.questions.length - 1}
              >
                {t("simulation.next")}
              </Button>
              <Button
                className="rounded-full bg-white text-slate-950 hover:bg-white/90"
                disabled={submitting}
                onClick={() => void handleFinish(false)}
              >
                {submitting ? t("simulation.submitting") : t("simulation.finish_button")}
              </Button>
            </div>
          </div>

          {error ? (
            <p className="mt-4 text-sm text-rose-200">{error}</p>
          ) : null}
        </div>
      </div>

      <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
        <DialogContent className="border border-slate-800/80 bg-slate-950 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("simulation.exit_warning_title", "Imtihondan chiqasizmi?")}</DialogTitle>
            <DialogDescription className="text-slate-300">
              {t("simulation.exit_warning_description", "Siz imtihondan chiqyapsiz. Progressingiz yo'qolishi mumkin.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/10"
              onClick={() => setShowExitWarning(false)}
            >
              {t("simulation.continue_exam", "Imtihonni davom ettirish")}
            </Button>
            <Button
              className="rounded-full bg-rose-500 text-white hover:bg-rose-400"
              onClick={handleConfirmExit}
            >
              {t("simulation.confirm_exit", "Chiqish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
