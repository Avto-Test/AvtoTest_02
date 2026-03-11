"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock3, Flag, ShieldCheck, Target } from "lucide-react";

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
import { SurfaceNav } from "@/components/intelligence/SurfaceNav";
import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { studentNav } from "@/config/navigation";
import { api, getErrorMessage } from "@/lib/api";
import { getUserProfileBundle } from "@/lib/intelligence";
import { useAuth } from "@/store/useAuth";

type SimulationQuestionOption = {
  id: string;
  text: string;
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
      currentIndex: number;
      timeLeft: number;
    }
  | {
      phase: "finished";
      result: ExamSimulationFinishResponse;
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

function RadialTimer({
  value,
  total,
  label,
  danger = false,
}: {
  value: number;
  total: number;
  label: string;
  danger?: boolean;
}) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? value / total : 0;
  const dashOffset = circumference - (circumference * progress);

  return (
    <div className={`relative flex h-36 w-36 items-center justify-center ${danger ? "stress-timer-danger" : ""}`}>
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="10"
        />
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          fill="transparent"
          stroke={danger ? "#fb7185" : "#22d3ee"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        />
      </svg>
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/54">{label}</p>
        <p className={`mt-2 text-3xl font-semibold text-white ${danger ? "stress-timer-text" : ""}`}>{formatClock(value)}</p>
      </div>
    </div>
  );
}

export default function ExamSimulationSurface() {
  const { t } = useI18n();
  const { token, hydrated, user, fetchUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<SimulationState>({ phase: "idle" });
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getUserProfileBundle>> | null>(null);
  const finishTriggeredRef = useRef(false);
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
        const bundle = await getUserProfileBundle();
        if (!active) {
          return;
        }
        setProfile(bundle);
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
    try {
      const response = await api.post<ExamSimulationStartResponse>("/exam-simulation/start");
      const attempt = response.data;
      setState({
        phase: "running",
        attempt,
        answers: {},
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
      const response = await api.post<ExamSimulationFinishResponse>("/exam-simulation/finish", {
        attempt_id: state.attempt.attempt_id,
        answers: state.answers,
      });
      setState({
        phase: "finished",
        result: {
          ...response.data,
          time_expired: fromTimeout || response.data.time_expired,
        },
      });
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

  const progress = useMemo(() => {
    if (state.phase !== "running") {
      return 0;
    }
    return ((state.currentIndex + 1) / state.attempt.question_count) * 100;
  }, [state]);

  if (!hydrated || loading) {
    return <IntelligenceLoadingSkeleton />;
  }

  if (state.phase === "idle") {
    return (
      <div className="intelligence-page">
        <div className="container-app space-y-6 py-8 sm:py-10">
          <SurfaceNav items={studentNav} />
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
        </div>
      </div>
    );
  }

  if (state.phase === "finished") {
    return (
      <div className="intelligence-page">
        <div className="container-app space-y-6 py-8 sm:py-10">
          <SurfaceNav items={studentNav} />
          <IntelligenceHero
            eyebrow={t("simulation.result_eyebrow")}
            title={t("simulation.result_title")}
            description={t("simulation.result_description")}
            badge={state.result.time_expired ? t("simulation.time_expired") : t("simulation.completed_in_time")}
            badgeLabel={t("simulation.result_badge_label", "Yakun holati")}
            actions={(
              <>
                <IntelligenceActionButton href="/practice" label={t("simulation.return_practice")} />
                <IntelligenceActionButton href="/analytics" label={t("simulation.open_analytics")} secondary />
              </>
            )}
          >
            <div className="intelligence-float-card rounded-[1.75rem] border border-white/14 bg-white/6 p-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">{t("simulation.exam_score")}</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                <AnimatedNumber value={state.result.score} /> / <AnimatedNumber value={state.result.total} />
              </p>
              <p className="mt-2 text-sm leading-6 text-white/66">
                {t("simulation.simulation_probability")}: {(state.result.pass_probability * 100).toFixed(1)}%
              </p>
            </div>
          </IntelligenceHero>

          <div className="grid gap-4 md:grid-cols-3">
            <IntelligenceMetricCard
              eyebrow={t("simulation.outcome")}
              title={t("simulation.score")}
              numericValue={state.result.score}
              description={t("simulation.score_description")}
              icon={CheckCircle2}
            />
            <IntelligenceMetricCard
              eyebrow={t("simulation.probability")}
              title={t("simulation.pass_signal")}
              numericValue={state.result.pass_probability * 100}
              decimals={1}
              suffix="%"
              description={t("simulation.pass_signal_description")}
              icon={ShieldCheck}
              delay={0.04}
            />
            <IntelligenceMetricCard
              eyebrow={t("simulation.review")}
              title={t("simulation.weak_topics")}
              numericValue={state.result.weak_topics.length}
              description={t("simulation.review_description")}
              icon={Target}
              delay={0.08}
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
                <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
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
                <div className="rounded-[1.5rem] border border-amber-400/18 bg-amber-400/8 p-4">
                  <p className="intelligence-eyebrow">{t("simulation.cooldown_after_finish", "Keyingi urinish")}</p>
                  <p className="mt-2 text-base font-medium text-white">{t("simulation.cooldown_after_finish_message", "Yangi imtihon simulyatsiyasi 14 kunlik kutish muddatidan keyin ochiladi.")}</p>
                </div>
              </div>
            </IntelligencePanel>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = state.attempt.questions[state.currentIndex];
  const answeredCount = Object.keys(state.answers).length;
  const isStressMode = state.timeLeft <= 300;

  return (
    <div className="intelligence-page min-h-screen">
      <div className="container-app space-y-6 py-8 sm:py-10">
        <SurfaceNav items={studentNav} />
        <div className="grid gap-6 xl:grid-cols-[0.32fr_0.68fr]">
          <IntelligencePanel
            eyebrow={t("simulation.exam_controls")}
            title={t("simulation.simulation_status")}
            description={t("simulation.simulation_status_description")}
          >
            <div className="flex justify-center">
              <RadialTimer
                value={state.timeLeft}
                total={state.attempt.duration_minutes * 60}
                label={t("simulation.time_left")}
                danger={isStressMode}
              />
            </div>
            <div className="mt-6 space-y-3">
              <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                <p className="intelligence-eyebrow">{t("simulation.progress")}</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {t("simulation.question_label")} {state.currentIndex + 1} / {state.attempt.question_count}
                </p>
                <IntelligenceAnimatedProgress value={progress} className="mt-4 h-2.5" />
              </div>
              <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                <p className="intelligence-eyebrow">{t("simulation.answered")}</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  <AnimatedNumber value={answeredCount} /> / <AnimatedNumber value={state.attempt.question_count} />
                </p>
              </div>
            </div>
            <Button
              className="mt-6 w-full rounded-full bg-white text-slate-950 hover:bg-white/90"
              disabled={submitting}
              onClick={() => void handleFinish(false)}
            >
              {submitting ? t("simulation.submitting") : t("simulation.finish_button")}
            </Button>
            {error ? (
              <p className="mt-4 text-sm text-rose-200">{error}</p>
            ) : null}
          </IntelligencePanel>

          <IntelligencePanel
            eyebrow={t("simulation.exam_environment")}
            title={t("simulation.exam_environment_title")}
            description={t("simulation.exam_environment_description")}
            delay={0.04}
            className={isStressMode ? "stress-shell stress-shell-danger" : "stress-shell"}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {isStressMode ? (
                  <Badge className="border-rose-500/30 bg-rose-500/15 text-rose-100">
                    {t("simulation.stress_mode", "Stress rejimi")}
                  </Badge>
                ) : (
                  <Badge className="border-white/10 bg-white/8 text-white/80">
                    {t("simulation.calm_mode", "Nazorat rejimi")}
                  </Badge>
                )}
                <Badge className="border-white/10 bg-white/8 text-white/80">
                  {answeredCount}/{state.attempt.question_count} {t("simulation.answered").toLowerCase()}
                </Badge>
              </div>
              <p className="text-sm text-white/58">
                {currentQuestion.topic || currentQuestion.category || t("simulation.general")}
              </p>
            </div>

            {isStressMode ? (
              <div className="mb-4 rounded-[1.25rem] border border-rose-400/24 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {t("simulation.last_five_minutes_warning", "So'nggi 5 daqiqa. Ehtiyotkorlik bilan javob bering.")}
              </div>
            ) : null}

            <div className="mb-4 flex flex-wrap gap-2">
              {state.attempt.questions.map((question, index) => {
                const answered = Boolean(state.answers[question.id]);
                const active = index === state.currentIndex;
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => jumpToQuestion(index)}
                    className={`flex h-9 w-9 items-center justify-center rounded-2xl border text-xs font-semibold transition ${
                      active
                        ? "border-cyan-300/60 bg-cyan-300/18 text-cyan-50"
                        : answered
                          ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-50"
                          : "border-white/10 bg-white/8 text-white/60"
                    }`}
                    aria-label={`${t("simulation.question_label")} ${index + 1}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-5"
              >
                <div className="intelligence-float-card rounded-[1.75rem] border border-white/10 bg-white/6 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="intelligence-eyebrow">{t("simulation.question_label")} {state.currentIndex + 1}</p>
                      <h2 className="mt-3 text-2xl font-semibold text-white">{currentQuestion.text}</h2>
                    </div>
                    <Badge className="border-white/10 bg-white/8 text-white/80">
                      {currentQuestion.difficulty || t("simulation.general")}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-3">
                  {currentQuestion.answer_options.map((option, index) => {
                    const selected = state.answers[currentQuestion.id] === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelectAnswer(currentQuestion.id, option.id)}
                        className={`intelligence-float-card flex items-start gap-4 rounded-[1.35rem] border px-4 py-4 text-left transition ${
                          selected
                            ? "border-cyan-300/50 bg-cyan-300/12"
                            : "border-white/10 bg-white/6 hover:border-white/20 hover:bg-white/10"
                        }`}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-sm font-semibold text-white">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="text-sm leading-6 text-white/86">{option.text}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/10"
                onClick={() => jumpToQuestion(state.currentIndex - 1)}
                disabled={state.currentIndex === 0}
              >
                {t("simulation.previous")}
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/10"
                onClick={() => jumpToQuestion(state.currentIndex + 1)}
                disabled={state.currentIndex >= state.attempt.questions.length - 1}
              >
                {t("simulation.next")}
              </Button>
            </div>
          </IntelligencePanel>
        </div>
      </div>
    </div>
  );
}
