"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ImageIcon,
  ShieldAlert,
  Sparkles,
  Video,
  XCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { submitLockedAnswer } from "@/api/answers";
import { submitAttempt } from "@/api/tests";
import { useShellUi } from "@/components/shell-ui-context";
import { useSessionAntiCheat } from "@/hooks/use-session-anti-cheat";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";
import type { AiCoachFeedback, AttemptResult, DetailedAnswer, PublicQuestion } from "@/types/test";

type SessionPayload = {
  attemptId: string;
  title: string;
  subtitle: string;
  durationMinutes: number;
  questions: PublicQuestion[];
  modeLabel: string;
  startedAt?: string | null;
  pressureMode: boolean;
  mistakeLimit: number;
  mistakeCount: number;
  violationLimit: number;
  violationCount: number;
  savedAnswers?: DetailedAnswer[];
};

type QuestionState = {
  selectedOptionId: string;
  correctOptionId: string | null;
  isCorrect: boolean | null;
  correctAnswer: string | null;
  explanation: string | null;
  aiCoach: AiCoachFeedback | null;
  recommendations: string[];
  locked: boolean;
  status: "saving" | "resolved";
};

type ResolvedQuestionState = {
  selectedOptionId: string;
  correctOptionId: string | null;
  isCorrect: boolean | null;
  correctAnswer: string | null;
  explanation: string | null;
  aiCoach: AiCoachFeedback | null;
  recommendations: string[];
};

const FALLBACK_MEDIA = [
  "/assets/landing/practice-test.jpg",
  "/assets/landing/hero-driver.jpg",
  "/assets/landing/rainy-driving.jpg",
];

function normalizeMediaSrc(source?: string | null) {
  if (!source) {
    return null;
  }

  if (/^(https?:)?\/\//.test(source) || source.startsWith("/") || source.startsWith("data:")) {
    return source;
  }

  return `/${source.replace(/^\.?\//, "")}`;
}

function pickFallbackMedia(question: PublicQuestion) {
  const haystack = `${question.topic ?? ""} ${question.category ?? ""} ${question.text}`.toLowerCase();
  if (/(rain|yomg'ir|nam|ho'l|sirpanchiq|fog|tuman|tun|night)/.test(haystack)) {
    return FALLBACK_MEDIA[2];
  }
  if (/(belgi|chorraha|intersection|burilish|priority|yo'l belgisi|signal)/.test(haystack)) {
    return FALLBACK_MEDIA[0];
  }
  return FALLBACK_MEDIA[1];
}

function buildInitialQuestionStates(savedAnswers: DetailedAnswer[]) {
  return Object.fromEntries(
    savedAnswers.map((answer) => [
      answer.question_id,
      {
        selectedOptionId: answer.selected_option_id,
        correctOptionId: answer.correct_option_id,
        isCorrect: answer.is_correct,
        correctAnswer: answer.correct_answer ?? null,
        explanation: answer.explanation ?? null,
        aiCoach: answer.ai_coach ?? null,
        recommendations: answer.recommendations ?? [],
        locked: true,
        status: "resolved" as const,
      },
    ]),
  );
}

function resolveInitialIndex(questions: PublicQuestion[], savedAnswers: DetailedAnswer[]) {
  const answeredIds = new Set(savedAnswers.map((answer) => answer.question_id));
  const firstUnansweredIndex = questions.findIndex((question) => !answeredIds.has(question.id));
  if (firstUnansweredIndex >= 0) {
    return firstUnansweredIndex;
  }
  return 0;
}

function resolveInitialRemainingSeconds(durationMinutes: number, startedAt?: string | null) {
  const allottedSeconds = durationMinutes * 60;
  if (!startedAt) {
    return allottedSeconds;
  }

  const startedAtMs = new Date(startedAt).getTime();
  if (Number.isNaN(startedAtMs)) {
    return allottedSeconds;
  }

  const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
  return Math.max(allottedSeconds - elapsedSeconds, 0);
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function scorePercent(result: AttemptResult) {
  return Math.round((result.correct_count / Math.max(1, result.total)) * 100);
}

function optionFunctionLabel(index: number) {
  return `F${index + 1}`;
}

function humanizeViolationEvent(eventType?: string | null) {
  return {
    screenshot_attempt: "screenshot urinish",
    page_leave_attempt: "sahifani tark etish urinish",
    navigation_blocked: "boshqa sahifaga o'tish urinish",
    devtools_blocked: "developer tools ochish urinish",
    devtools_detected: "developer tools ochilgani",
    copy_blocked: "nusxa olish urinish",
    clipboard_shortcut_blocked: "clipboard shortcut urinish",
    selection_blocked: "matnni belgilash urinish",
    context_menu_blocked: "context menu urinish",
    drag_blocked: "drag urinish",
    cut_blocked: "kesib olish urinish",
    paste_blocked: "joylashtirish urinish",
  }[eventType ?? ""] ?? "qoidabuzarlik";
}

function humanizeSimulationFailureReason(reason?: string | null) {
  if (!reason) {
    return "Imtihon majburiy yakunlandi.";
  }

  if (reason.startsWith("violation_limit_reached")) {
    const [, rawEvent = ""] = reason.split(":", 2);
    return `Qoidabuzarlik limiti to'ldi (${humanizeViolationEvent(rawEvent)}). Imtihon yakunlandi va urinish yiqilgan deb belgilandi.`;
  }

  if (reason === "mistake_limit_reached") {
    return "Xato limiti to'ldi. Imtihon yakunlandi va urinish yiqilgan deb belgilandi.";
  }

  return "Imtihon qoidasi buzildi. Ulanish yakunlandi.";
}

function buildSyntheticSessionResult({
  questions,
  questionStates,
  reviewedCount,
  pressureMode,
  mistakeLimit,
  violationCount,
  violationLimit,
  disqualified,
  reason,
}: {
  questions: PublicQuestion[];
  questionStates: Record<string, QuestionState>;
  reviewedCount: number;
  pressureMode: boolean;
  mistakeLimit: number;
  violationCount: number;
  violationLimit: number;
  disqualified: boolean;
  reason?: string | null;
}): AttemptResult {
  const answers = questions.flatMap((question) => {
    const state = questionStates[question.id];
    if (!state?.locked || !state.correctOptionId) {
      return [];
    }

    return [
      {
        question_id: question.id,
        selected_option_id: state.selectedOptionId,
        correct_option_id: state.correctOptionId,
        is_correct: Boolean(state.isCorrect),
        correct_answer: state.correctAnswer,
        explanation: state.explanation,
        ai_coach: state.aiCoach,
        recommendations: state.recommendations,
      },
    ];
  });

  const correctCount = answers.filter((answer) => answer.is_correct).length;
  const mistakesCount = answers.filter((answer) => !answer.is_correct).length;
  const answeredCount = answers.length;
  const total = questions.length;

  return {
    score: correctCount,
    total,
    reviewed_count: reviewedCount,
    answered_count: answeredCount,
    unanswered_count: Math.max(0, total - answeredCount),
    correct_count: correctCount,
    mistakes_count: mistakesCount,
    completed_all: answeredCount === total,
    passed: false,
    finished_at: new Date().toISOString(),
    answers,
    answers_unlocked: true,
    unlock_reason: "simulation_review",
    skill_messages: [],
    fading_topics: [],
    topic_stability: {},
    pressure_mode: pressureMode,
    mistake_limit: mistakeLimit,
    violation_count: violationCount,
    violation_limit: violationLimit,
    disqualified,
    disqualification_reason: reason,
  };
}

function answerLookup(result: AttemptResult | null) {
  return new Map(result?.answers.map((answer) => [answer.question_id, answer]) ?? []);
}

function getResolvedQuestionState(
  questionId: string,
  runtimeState: QuestionState | undefined,
  finalAnswers: Map<string, DetailedAnswer>,
): ResolvedQuestionState | null {
  const reviewedAnswer = finalAnswers.get(questionId);

  if (runtimeState?.locked) {
    return {
      selectedOptionId: runtimeState.selectedOptionId,
      correctOptionId: runtimeState.correctOptionId,
      isCorrect: runtimeState.isCorrect,
      correctAnswer: runtimeState.correctAnswer ?? reviewedAnswer?.correct_answer ?? null,
      explanation: runtimeState.explanation ?? reviewedAnswer?.explanation ?? null,
      aiCoach: runtimeState.aiCoach ?? reviewedAnswer?.ai_coach ?? null,
      recommendations: runtimeState.recommendations.length ? runtimeState.recommendations : (reviewedAnswer?.recommendations ?? []),
    };
  }

  if (!reviewedAnswer) {
    return null;
  }

  return {
    selectedOptionId: reviewedAnswer.selected_option_id,
    correctOptionId: reviewedAnswer.correct_option_id,
    isCorrect: reviewedAnswer.is_correct,
    correctAnswer: reviewedAnswer.correct_answer ?? null,
    explanation: reviewedAnswer.explanation ?? null,
    aiCoach: reviewedAnswer.ai_coach ?? null,
    recommendations: reviewedAnswer.recommendations ?? [],
  };
}

function AssessmentFeedbackPanels({
  answer,
  isLightTheme,
}: {
  answer: ResolvedQuestionState | null;
  isLightTheme: boolean;
}) {
  if (!answer || (!answer.explanation && !answer.aiCoach)) {
    return null;
  }

  const recommendations = Array.from(
    new Set([...(answer.recommendations ?? []), answer.aiCoach?.recommendation].filter(Boolean) as string[]),
  );

  return (
    <div className="mt-5 space-y-3">
      <details
        open
        className={cn(
          "rounded-[1.2rem] border px-4 py-3",
          isLightTheme ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/6",
        )}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className={cn("text-sm font-semibold", isLightTheme ? "text-slate-900" : "text-white")}>Izoh</span>
          <span className={cn("text-[10px] uppercase tracking-[0.18em]", isLightTheme ? "text-slate-500" : "text-white/48")}>
            Ochish / yopish
          </span>
        </summary>
        <div className={cn("mt-3 space-y-2.5 text-sm leading-6", isLightTheme ? "text-slate-700" : "text-white/76")}>
          {answer.explanation ? <p>{answer.explanation}</p> : null}
          {answer.correctAnswer ? (
            <div
              className={cn(
                "rounded-[1rem] border px-3 py-2.5",
                isLightTheme ? "border-slate-200 bg-white text-slate-900" : "border-white/10 bg-black/20 text-white",
              )}
            >
              <p className={cn("text-[10px] uppercase tracking-[0.18em]", isLightTheme ? "text-slate-500" : "text-white/48")}>
                To&apos;g&apos;ri javob
              </p>
              <p className="mt-1 text-sm font-medium leading-6">{answer.correctAnswer}</p>
            </div>
          ) : null}
        </div>
      </details>

      {answer.aiCoach ? (
        <details
          open
          className={cn(
            "rounded-[1.2rem] border px-4 py-3",
            isLightTheme ? "border-emerald-200 bg-emerald-50/80" : "border-emerald-400/16 bg-emerald-500/10",
          )}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className={cn("inline-flex items-center gap-2 text-sm font-semibold", isLightTheme ? "text-emerald-800" : "text-emerald-200")}>
              <Sparkles className="h-4 w-4" />
              AI tavsiya
            </span>
            <span className={cn("text-[10px] uppercase tracking-[0.18em]", isLightTheme ? "text-emerald-700/70" : "text-emerald-100/60")}>
              Ochish / yopish
            </span>
          </summary>
          <div className="mt-3 grid gap-2.5">
            <div
              className={cn(
                "rounded-[1rem] border px-3 py-2.5",
                isLightTheme ? "border-emerald-200 bg-white/90" : "border-emerald-400/16 bg-black/20",
              )}
            >
              <p className={cn("text-[10px] uppercase tracking-[0.18em]", isLightTheme ? "text-emerald-700/70" : "text-emerald-100/60")}>Tip</p>
              <p className={cn("mt-1 text-sm leading-6", isLightTheme ? "text-slate-800" : "text-white")}>{answer.aiCoach.tip}</p>
            </div>
            <div
              className={cn(
                "rounded-[1rem] border px-3 py-2.5",
                isLightTheme ? "border-emerald-200 bg-white/90" : "border-emerald-400/16 bg-black/20",
              )}
            >
              <p className={cn("text-[10px] uppercase tracking-[0.18em]", isLightTheme ? "text-emerald-700/70" : "text-emerald-100/60")}>Tahlil</p>
              <p className={cn("mt-1 text-sm leading-6", isLightTheme ? "text-slate-800" : "text-white")}>
                {answer.aiCoach.mistake_analysis}
              </p>
            </div>
            {recommendations.length ? (
              <div
                className={cn(
                  "rounded-[1rem] border px-3 py-2.5",
                  isLightTheme ? "border-emerald-200 bg-white/90" : "border-emerald-400/16 bg-black/20",
                )}
              >
                <p className={cn("text-[10px] uppercase tracking-[0.18em]", isLightTheme ? "text-emerald-700/70" : "text-emerald-100/60")}>
                  Tavsiya
                </p>
                <div className={cn("mt-1 space-y-1.5 text-sm leading-6", isLightTheme ? "text-slate-800" : "text-white")}>
                  {recommendations.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
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
  const shellUi = useShellUi();
  const { resolvedTheme } = useTheme();
  const isLightTheme = resolvedTheme === "light";
  const initialIndex = resolveInitialIndex(session.questions, session.savedAnswers ?? []);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [questionStates, setQuestionStates] = useState<Record<string, QuestionState>>(() =>
    buildInitialQuestionStates(session.savedAnswers ?? []),
  );
  const [visitedQuestions, setVisitedQuestions] = useState<Record<string, true>>(() => {
    const visited = Object.fromEntries((session.savedAnswers ?? []).map((answer) => [answer.question_id, true])) as Record<string, true>;
    const initialQuestion = session.questions[initialIndex];
    return initialQuestion ? { ...visited, [initialQuestion.id]: true } : visited;
  });
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    resolveInitialRemainingSeconds(session.durationMinutes, session.startedAt),
  );
  const [submittingFinish, setSubmittingFinish] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [brokenMediaSources, setBrokenMediaSources] = useState<Record<string, true>>({});
  const [mistakeCount, setMistakeCount] = useState(session.mistakeCount);
  const [violationCount, setViolationCount] = useState(session.violationCount);

  const questionStartedAtRef = useRef(Date.now());
  const responseTimesRef = useRef<Record<string, number>>({});
  const finishRequestRef = useRef<(timedOut?: boolean) => Promise<void>>(async () => undefined);

  const currentQuestion = session.questions[currentIndex];
  const finalAnswerMap = useMemo(() => answerLookup(result), [result]);
  const currentQuestionState = questionStates[currentQuestion.id];
  const currentResolvedAnswer = getResolvedQuestionState(currentQuestion.id, currentQuestionState, finalAnswerMap);
  const lockedCount = result?.answered_count ?? Object.values(questionStates).filter((item) => item.locked).length;
  const derivedCorrectCount = Object.values(questionStates).filter((item) => item.isCorrect === true).length;
  const derivedWrongCount = Object.values(questionStates).filter((item) => item.isCorrect === false).length;
  const correctCount = result?.correct_count ?? derivedCorrectCount;
  const wrongCount = result?.mistakes_count ?? Math.max(mistakeCount, derivedWrongCount);
  const visitedCount = result?.reviewed_count ?? Object.keys(visitedQuestions).length;
  const pendingSave = Object.values(questionStates).some((item) => item.status === "saving");
  const progress = Math.round((lockedCount / Math.max(1, session.questions.length)) * 100);
  const timerLabel = result ? `${scorePercent(result)}%` : formatClock(remainingSeconds);
  const mistakeExceeded = wrongCount >= session.mistakeLimit;
  const mistakeAtLimit = wrongCount === session.mistakeLimit;
  const violationExceeded = violationCount >= session.violationLimit;
  const resultStatusLabel = result
    ? result.passed
      ? "Muvaffaqiyatli"
      : result.disqualified
        ? "Diskvalifikatsiya"
        : "Yiqildi"
    : null;
  const resultReason =
    result && !result.passed && result.disqualification_reason
      ? humanizeSimulationFailureReason(result.disqualification_reason)
      : null;

  const resolvedImage = useMemo(() => {
    if (!currentQuestion) {
      return null;
    }

    const preferredImage = normalizeMediaSrc(currentQuestion.image_url);
    if (preferredImage && !brokenMediaSources[preferredImage]) {
      return preferredImage;
    }

    const fallbackImage = pickFallbackMedia(currentQuestion);
    return brokenMediaSources[fallbackImage] ? null : fallbackImage;
  }, [brokenMediaSources, currentQuestion]);

  const resolvedVideo = useMemo(() => {
    if (!currentQuestion) {
      return null;
    }

    const normalizedVideo = normalizeMediaSrc(currentQuestion.video_url);
    return normalizedVideo && !brokenMediaSources[normalizedVideo] ? normalizedVideo : null;
  }, [brokenMediaSources, currentQuestion]);

  const captureCurrentQuestionTime = useCallback(() => {
    if (!currentQuestion || result) {
      return;
    }

    const state = questionStates[currentQuestion.id];
    if (state?.locked || state?.status === "saving") {
      return;
    }

    const elapsed = Math.max(0, Date.now() - questionStartedAtRef.current);
    responseTimesRef.current[currentQuestion.id] = (responseTimesRef.current[currentQuestion.id] ?? 0) + elapsed;
    questionStartedAtRef.current = Date.now();
  }, [currentQuestion, questionStates, result]);

  const handleFinish = useCallback(
    async (timedOut = false) => {
      if (!currentQuestion || result || submittingFinish || pendingSave) {
        return;
      }

      captureCurrentQuestionTime();
      setSubmittingFinish(true);
      setActionError(null);

      try {
        const answers = Object.fromEntries(
          Object.entries(questionStates)
            .filter(([, value]) => value.locked)
            .map(([questionId, value]) => [questionId, value.selectedOptionId]),
        );

        const nextResult = await submitAttempt({
          attempt_id: session.attemptId,
          answers,
          response_times: session.questions.map((question) => responseTimesRef.current[question.id] ?? 0),
          visited_question_ids: Object.keys(visitedQuestions),
        });

        setResult(nextResult);
        onFinished?.(nextResult);

        if (timedOut) {
          setActionError("Vaqt tugadi. Simulyatsiya avtomatik tarzda yakunlandi.");
        }
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Simulyatsiyani yakunlab bo'lmadi.");
      } finally {
        setSubmittingFinish(false);
      }
    },
    [
      captureCurrentQuestionTime,
      currentQuestion,
      onFinished,
      pendingSave,
      questionStates,
      result,
      session.attemptId,
      session.questions,
      submittingFinish,
      visitedQuestions,
    ],
  );

  finishRequestRef.current = async (timedOut = false) => {
    await handleFinish(timedOut);
  };

  const finishWithForcedFailure = useCallback(
    ({
      reason,
      disqualified,
      nextMistakeCount,
      nextViolationCount,
      nextViolationLimit,
    }: {
      reason?: string | null;
      disqualified: boolean;
      nextMistakeCount: number;
      nextViolationCount: number;
      nextViolationLimit: number;
    }) => {
      const finalResult = buildSyntheticSessionResult({
        questions: session.questions,
        questionStates,
        reviewedCount: Object.keys(visitedQuestions).length,
        pressureMode: session.pressureMode,
        mistakeLimit: session.mistakeLimit,
        violationCount: nextViolationCount,
        violationLimit: nextViolationLimit,
        disqualified,
        reason,
      });

      setMistakeCount(nextMistakeCount);
      setViolationCount(nextViolationCount);
      setResult(finalResult);
      setActionError(humanizeSimulationFailureReason(reason));
      onFinished?.(finalResult);
    },
    [onFinished, questionStates, session.mistakeLimit, session.pressureMode, session.questions, visitedQuestions],
  );

  useEffect(() => {
    shellUi?.setFocusMode(true);

    const htmlStyle = document.documentElement.style;
    const bodyStyle = document.body.style;
    const previousHtmlOverflow = htmlStyle.overflow;
    const previousBodyOverflow = bodyStyle.overflow;
    const previousHtmlOverscroll = htmlStyle.overscrollBehavior;
    const previousBodyOverscroll = bodyStyle.overscrollBehavior;

    htmlStyle.overflow = "hidden";
    bodyStyle.overflow = "hidden";
    htmlStyle.overscrollBehavior = "none";
    bodyStyle.overscrollBehavior = "none";

    return () => {
      shellUi?.setFocusMode(false);
      htmlStyle.overflow = previousHtmlOverflow;
      bodyStyle.overflow = previousBodyOverflow;
      htmlStyle.overscrollBehavior = previousHtmlOverscroll;
      bodyStyle.overscrollBehavior = previousBodyOverscroll;
    };
  }, [shellUi]);

  useEffect(() => {
    if (!currentQuestion) {
      return;
    }

    setVisitedQuestions((previous) => (previous[currentQuestion.id] ? previous : { ...previous, [currentQuestion.id]: true }));
  }, [currentQuestion]);

  useEffect(() => {
    if (!currentQuestion || result) {
      return;
    }

    const state = questionStates[currentQuestion.id];
    if (state?.locked || state?.status === "saving") {
      return;
    }

    questionStartedAtRef.current = Date.now();
  }, [currentQuestion, questionStates, result]);

  useEffect(() => {
    if (result) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          void finishRequestRef.current(true);
          return 0;
        }

        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [result]);

  const handleSelect = useCallback(async (optionId: string) => {
    if (!currentQuestion || result || submittingFinish) {
      return;
    }

    const existingState = questionStates[currentQuestion.id];
    if (existingState?.locked || existingState?.status === "saving" || finalAnswerMap.has(currentQuestion.id)) {
      return;
    }

    const responseTime =
      (responseTimesRef.current[currentQuestion.id] ?? 0) + Math.max(0, Date.now() - questionStartedAtRef.current);
    responseTimesRef.current[currentQuestion.id] = responseTime;

    setQuestionStates((previous) => ({
      ...previous,
      [currentQuestion.id]: {
        selectedOptionId: optionId,
        correctOptionId: null,
        isCorrect: null,
        correctAnswer: null,
        explanation: null,
        aiCoach: null,
        recommendations: [],
        locked: false,
        status: "saving",
      },
    }));
    setActionError(null);

    try {
      const answer = await submitLockedAnswer({
        attempt_id: session.attemptId,
        question_id: currentQuestion.id,
        selected_option_id: optionId,
        response_time_ms: responseTime,
      });

      setQuestionStates((previous) => ({
        ...previous,
        [currentQuestion.id]: {
          selectedOptionId: answer.selected_option_id,
          correctOptionId: answer.correct_option_id,
          isCorrect: answer.is_correct,
          correctAnswer: answer.correct_answer,
          explanation: answer.explanation,
          aiCoach: answer.ai_coach,
          recommendations: answer.recommendations ?? [],
          locked: answer.locked,
          status: "resolved",
        },
      }));

      setMistakeCount(answer.mistake_count);
      setViolationCount(answer.violation_count);

      if (answer.attempt_finished) {
        finishWithForcedFailure({
          reason: answer.disqualification_reason ?? (answer.passed === false ? "mistake_limit_reached" : null),
          disqualified: answer.disqualified,
          nextMistakeCount: answer.mistake_count,
          nextViolationCount: answer.violation_count,
          nextViolationLimit: answer.violation_limit || session.violationLimit,
        });
        return;
      }

      if (answer.mistake_count >= session.mistakeLimit) {
        setActionError("Xato limiti to'ldi. Keyingi javob kiritilmaydi va urinish yakunlanadi.");
      }
    } catch (error) {
      setQuestionStates((previous) => {
        const nextState = { ...previous };
        delete nextState[currentQuestion.id];
        return nextState;
      });
      setActionError(error instanceof Error ? error.message : "Javobni saqlab bo'lmadi.");
    }
  }, [
    currentQuestion,
    finalAnswerMap,
    finishWithForcedFailure,
    questionStates,
    result,
    session.attemptId,
    session.mistakeLimit,
    session.violationLimit,
    submittingFinish,
  ]);

  const handleFunctionKeyChoice = useCallback(
    (index: number) => {
      const option = currentQuestion?.answer_options[index];
      if (!option || result || submittingFinish || pendingSave) {
        return;
      }
      void handleSelect(option.id);
    },
    [currentQuestion, handleSelect, pendingSave, result, submittingFinish],
  );

  const antiCheat = useSessionAntiCheat({
    enabled: !result,
    attemptId: session.attemptId,
    sessionLabel: "simulation_exam",
    initialViolationCount: session.violationCount,
    violationLimit: session.violationLimit,
    onFunctionKeyChoice: handleFunctionKeyChoice,
    onViolationUpdate: ({
      attemptFinished,
      disqualified,
      disqualificationReason,
      violationCount: nextViolationCount,
      violationLimit: nextViolationLimit,
    }) => {
      if (typeof nextViolationCount === "number") {
        setViolationCount(nextViolationCount);
      }

      if (attemptFinished && !result) {
        finishWithForcedFailure({
          reason: disqualificationReason ?? "violation_limit_reached",
          disqualified,
          nextMistakeCount: wrongCount,
          nextViolationCount: nextViolationCount ?? violationCount,
          nextViolationLimit: nextViolationLimit ?? session.violationLimit,
        });
      }
    },
  });

  function navigateTo(index: number) {
    if (!currentQuestion) {
      return;
    }

    const clampedIndex = Math.max(0, Math.min(session.questions.length - 1, index));
    if (clampedIndex === currentIndex) {
      return;
    }

    captureCurrentQuestionTime();
    setCurrentIndex(clampedIndex);
  }

  if (result) {
    return (
      <div
        className={cn(
          "min-h-screen overflow-hidden",
          isLightTheme
            ? "bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.08),transparent_26%),linear-gradient(180deg,#f6f8f4_0%,#eef3ea_100%)] text-slate-950"
            : "bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.12),transparent_24%),linear-gradient(180deg,#050708_0%,#081012_100%)] text-white",
        )}
      >
        <div className="mx-auto flex min-h-screen max-w-[1600px] items-center justify-center px-3 py-3 sm:px-4 lg:px-6">
          <Modal
            open
            onClose={onExit}
            title="Simulyatsiya natijasi"
            className={cn(
              "max-w-4xl rounded-[1.85rem] border",
              isLightTheme
                ? "border-slate-200 bg-white/96 text-slate-950"
                : "border-white/10 bg-[rgba(7,11,14,0.96)] text-white",
            )}
          >
            <div className="space-y-5">
              <div
                className={cn(
                  "rounded-[1.4rem] border px-5 py-4",
                  result.passed
                    ? isLightTheme
                      ? "border-emerald-300/70 bg-emerald-50"
                      : "border-emerald-400/24 bg-emerald-500/10"
                    : isLightTheme
                      ? "border-rose-300/70 bg-rose-50"
                      : "border-rose-400/20 bg-rose-500/10",
                )}
              >
                <p className={cn("text-xs uppercase tracking-[0.24em]", isLightTheme ? "text-slate-500" : "text-white/48")}>
                  Holat
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {result.passed ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  ) : (
                    <XCircle className="h-6 w-6 text-rose-400" />
                  )}
                  <p className={cn("text-2xl font-semibold", result.passed ? "text-emerald-500" : "text-rose-400")}>
                    {resultStatusLabel}
                  </p>
                </div>
                <p className={cn("mt-3 text-sm leading-6", isLightTheme ? "text-slate-600" : "text-white/68")}>
                  {result.passed
                    ? "Imtihon yakunlandi. Natija saqlandi va session yopildi."
                    : resultReason ?? actionError ?? "Imtihon yakunlandi va natija saqlandi."}
                </p>
              </div>

              {actionError && actionError !== resultReason ? (
                <div
                  className={cn(
                    "flex items-start gap-2 rounded-[1.2rem] border px-4 py-3 text-sm",
                    isLightTheme
                      ? "border-amber-300/70 bg-amber-50 text-amber-900"
                      : "border-amber-400/20 bg-amber-500/10 text-amber-100",
                  )}
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div
                  className={cn(
                    "rounded-[1.25rem] border p-4",
                    isLightTheme ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/6",
                  )}
                >
                  <p className={cn("text-xs uppercase tracking-[0.22em]", isLightTheme ? "text-slate-500" : "text-white/48")}>Natija</p>
                  <p className={cn("mt-2 text-3xl font-bold", isLightTheme ? "text-slate-950" : "text-white")}>{scorePercent(result)}%</p>
                </div>
                <div
                  className={cn(
                    "rounded-[1.25rem] border p-4",
                    isLightTheme ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/6",
                  )}
                >
                  <p className={cn("text-xs uppercase tracking-[0.22em]", isLightTheme ? "text-slate-500" : "text-white/48")}>To&apos;g&apos;ri</p>
                  <p className={cn("mt-2 text-3xl font-bold", isLightTheme ? "text-emerald-700" : "text-emerald-300")}>{result.correct_count}</p>
                </div>
                <div
                  className={cn(
                    "rounded-[1.25rem] border p-4",
                    isLightTheme ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/6",
                  )}
                >
                  <p className={cn("text-xs uppercase tracking-[0.22em]", isLightTheme ? "text-slate-500" : "text-white/48")}>Xatolar</p>
                  <p className={cn("mt-2 text-3xl font-bold", isLightTheme ? "text-slate-950" : "text-white")}>{result.mistakes_count}</p>
                </div>
                <div
                  className={cn(
                    "rounded-[1.25rem] border p-4",
                    isLightTheme ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/6",
                  )}
                >
                  <p className={cn("text-xs uppercase tracking-[0.22em]", isLightTheme ? "text-slate-500" : "text-white/48")}>Qoidabuzarlik</p>
                  <p className={cn("mt-2 text-3xl font-bold", violationExceeded ? "text-rose-400" : isLightTheme ? "text-slate-950" : "text-white")}>
                    {violationCount}/{session.violationLimit}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={onExit}
                  className={cn(
                    "h-11 rounded-full px-5 font-semibold",
                    isLightTheme ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-emerald-500 text-black hover:bg-emerald-400",
                  )}
                >
                  Simulyatsiyadan chiqish
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <div
      className={cn(
        "min-h-screen overflow-hidden",
        isLightTheme
          ? "bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.08),transparent_26%),linear-gradient(180deg,#f6f8f4_0%,#eef3ea_100%)] text-slate-950"
          : "bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.12),transparent_24%),linear-gradient(180deg,#050708_0%,#081012_100%)] text-white",
      )}
    >
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-3 py-3 sm:px-4 lg:px-6">
        <header
          className={cn(
            "sticky top-0 z-40 overflow-hidden rounded-[1.75rem] border px-4 py-3 backdrop-blur-2xl sm:px-5",
            isLightTheme
              ? "border-slate-200/85 bg-white/78 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.26)]"
              : "border-white/10 bg-black/36 shadow-[0_28px_72px_-48px_rgba(0,0,0,0.9)]",
          )}
          >
            <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-sm font-semibold", isLightTheme ? "text-slate-900" : "text-white")}>
                {session.title}
              </p>
              <p className={cn("truncate text-xs", isLightTheme ? "text-slate-500" : "text-white/58")}>
                {session.subtitle}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold",
                  remainingSeconds <= 60
                    ? "border-rose-400/30 bg-rose-500/12 text-rose-200"
                    : isLightTheme
                      ? "border-slate-200 bg-white/82 text-slate-700"
                      : "border-white/10 bg-white/6 text-white/82",
                )}
              >
                <Clock3 className="h-4 w-4" />
                <span>{timerLabel}</span>
              </div>

              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold",
                  mistakeExceeded
                    ? "border-rose-400/30 bg-rose-500/12 text-rose-200"
                    : mistakeAtLimit
                      ? "border-amber-400/30 bg-amber-500/12 text-amber-100"
                      : isLightTheme
                        ? "border-slate-200 bg-white/82 text-slate-700"
                        : "border-white/10 bg-white/6 text-white/82",
                )}
              >
                <ShieldAlert className="h-4 w-4" />
                <span>
                  Xato {wrongCount}/{session.mistakeLimit}
                </span>
              </div>

              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold",
                  violationExceeded
                    ? "border-rose-400/30 bg-rose-500/12 text-rose-200"
                    : violationCount > 0
                      ? "border-amber-400/30 bg-amber-500/12 text-amber-100"
                      : isLightTheme
                        ? "border-slate-200 bg-white/82 text-slate-700"
                        : "border-white/10 bg-white/6 text-white/82",
                )}
              >
                <AlertTriangle className="h-4 w-4" />
                <span>
                  Qoidabuzarlik {violationCount}/{session.violationLimit}
                </span>
              </div>

              <Button
                onClick={() => void handleFinish(false)}
                disabled={submittingFinish || pendingSave}
                className={cn(
                  "h-10 rounded-full px-5 text-sm font-semibold",
                  isLightTheme
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : "bg-emerald-500 text-black hover:bg-emerald-400",
                )}
              >
                {submittingFinish ? "Yakunlanmoqda..." : "Yakunlash"}
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className={cn("shrink-0 text-sm", isLightTheme ? "text-slate-500" : "text-white/62")}>
              Savol <span className={cn("font-semibold", isLightTheme ? "text-slate-900" : "text-white")}>{currentIndex + 1}</span>
              <span className="opacity-70"> / {session.questions.length}</span>
            </div>

            <div className="flex-1 overflow-x-auto">
              <div className="flex min-w-max items-center gap-2 pb-1">
                {session.questions.map((question, index) => {
                  const state = questionStates[question.id];
                  const answer = finalAnswerMap.get(question.id);
                  const isActive = index === currentIndex;
                  const isCorrect = answer?.is_correct ?? state?.isCorrect;
                  const isAnswered = Boolean(answer || state?.locked);

                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => navigateTo(index)}
                      className={cn(
                        "inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-all",
                        isLightTheme
                          ? "border-slate-200 bg-white/84 text-slate-500 hover:bg-slate-100"
                          : "border-white/10 bg-white/6 text-white/42 hover:bg-white/10",
                        isActive &&
                          (isLightTheme
                            ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 shadow-[0_0_0_3px_rgba(16,185,129,0.08)]"
                            : "border-emerald-400/35 bg-emerald-500/10 text-emerald-300 shadow-[0_0_0_3px_rgba(16,185,129,0.08)]"),
                        isAnswered && !isActive && isCorrect === true &&
                          (isLightTheme ? "text-emerald-700" : "text-emerald-300"),
                        isAnswered && !isActive && isCorrect === false &&
                          (isLightTheme ? "text-rose-700" : "text-rose-300"),
                      )}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={cn("mt-3 h-1.5 overflow-hidden rounded-full", isLightTheme ? "bg-slate-200" : "bg-white/8")}>
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                isLightTheme ? "bg-emerald-600" : "bg-emerald-400",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        <div className="flex-1 py-3">
          {antiCheat.warning ? (
            <div
              className={cn(
                "mb-3 flex items-start gap-2 rounded-[1.2rem] border px-4 py-3 text-sm shadow-[0_18px_48px_-28px_rgba(245,158,11,0.34)]",
                isLightTheme
                  ? "border-amber-300/80 bg-amber-50/92 text-amber-900"
                  : "border-amber-400/20 bg-amber-500/10 text-amber-100",
              )}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{antiCheat.warning.message}</span>
            </div>
          ) : null}

          {actionError ? (
            <div
              className={cn(
                "mb-3 flex items-start gap-2 rounded-[1.2rem] border px-4 py-3 text-sm",
                isLightTheme
                  ? "border-amber-300/70 bg-amber-50 text-amber-900"
                  : "border-amber-400/16 bg-amber-500/10 text-amber-100",
              )}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          ) : null}

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
            <div
              className={cn(
                "rounded-[1.75rem] border p-4 shadow-[0_28px_72px_-48px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-5",
                isLightTheme
                  ? "border-slate-200 bg-white/84"
                  : "border-white/10 bg-black/32",
              )}
            >
              <div>
                <p className={cn("text-xs uppercase tracking-[0.22em]", isLightTheme ? "text-slate-500" : "text-white/48")}>
                  Savol {currentIndex + 1} / {session.questions.length}
                </p>
                <p className={cn("mt-2 text-[1.6rem] font-semibold leading-[1.15]", isLightTheme ? "text-slate-950" : "text-white")}>
                  {currentQuestion.text}
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {currentQuestion.answer_options.map((option, index) => {
                  const state = currentQuestionState;
                  const finalAnswer = finalAnswerMap.get(currentQuestion.id);
                  const selectedOptionId = state?.selectedOptionId ?? finalAnswer?.selected_option_id ?? null;
                  const correctOptionId = state?.correctOptionId ?? finalAnswer?.correct_option_id ?? null;
                  const isSelected = selectedOptionId === option.id;
                  const isCorrectOption = correctOptionId === option.id;
                  const isWrongSelection = Boolean(selectedOptionId && isSelected && correctOptionId && !isCorrectOption);
                  const isLockedInactive = Boolean((state?.locked || finalAnswer) && !isCorrectOption && !isWrongSelection);
                  const isSaving = state?.status === "saving" && state.selectedOptionId === option.id;
                  const disabled = Boolean(result || state?.locked || state?.status === "saving" || finalAnswer);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => void handleSelect(option.id)}
                      className={cn(
                        "flex min-h-[4.25rem] w-full items-center gap-3 rounded-[1.2rem] border px-4 py-3 text-left transition-all",
                        isLightTheme
                          ? "border-slate-200 bg-slate-50 text-slate-800 hover:-translate-y-0.5 hover:bg-white"
                          : "border-white/8 bg-white/6 text-white hover:-translate-y-0.5 hover:bg-white/10",
                        isSelected && !state?.locked && !finalAnswer &&
                          (isLightTheme ? "border-emerald-500/30 bg-emerald-50" : "border-emerald-400/24 bg-emerald-500/10"),
                        isCorrectOption && Boolean(state?.locked || finalAnswer) &&
                          (isLightTheme ? "border-emerald-500/30 bg-emerald-50" : "border-emerald-400/30 bg-emerald-500/12"),
                        isWrongSelection &&
                          (isLightTheme ? "border-rose-500/28 bg-rose-50" : "border-rose-400/28 bg-rose-500/12"),
                        isLockedInactive && "opacity-60",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                          isLightTheme ? "border-slate-200 bg-white" : "border-white/10 bg-black/20",
                          isCorrectOption && Boolean(state?.locked || finalAnswer) &&
                            (isLightTheme ? "border-emerald-500/25 text-emerald-700" : "border-emerald-400/24 text-emerald-300"),
                          isWrongSelection &&
                            (isLightTheme ? "border-rose-500/25 text-rose-700" : "border-rose-400/24 text-rose-300"),
                        )}
                      >
                        {optionFunctionLabel(index)}
                      </span>
                      <span className="flex-1 text-[0.98rem] font-medium leading-[1.45]">{option.text}</span>
                      {isSaving ? (
                        <span className={cn("text-xs font-semibold", isLightTheme ? "text-emerald-700" : "text-emerald-300")}>Saqlanmoqda...</span>
                      ) : isCorrectOption && Boolean(state?.locked || finalAnswer) ? (
                        <CheckCircle2 className={cn("h-5 w-5", isLightTheme ? "text-emerald-700" : "text-emerald-300")} />
                      ) : isWrongSelection ? (
                        <XCircle className={cn("h-5 w-5", isLightTheme ? "text-rose-700" : "text-rose-300")} />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <AssessmentFeedbackPanels answer={currentResolvedAnswer} isLightTheme={isLightTheme} />

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => navigateTo(currentIndex - 1)}
                  disabled={currentIndex === 0 || pendingSave}
                  className={cn(
                    "h-11 rounded-full px-5",
                    isLightTheme ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100" : "border-white/10 bg-white/6 text-white hover:bg-white/10",
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Oldingi
                </Button>

                <div className="flex flex-wrap items-center gap-3">
                  <span className={cn("text-sm", isLightTheme ? "text-slate-500" : "text-white/58")}>
                    Ko&apos;rilgan: <span className={cn("font-semibold", isLightTheme ? "text-slate-900" : "text-white")}>{visitedCount}</span>
                  </span>
                  <span className={cn("text-sm", isLightTheme ? "text-slate-500" : "text-white/58")}>
                    Belgilangan: <span className={cn("font-semibold", isLightTheme ? "text-slate-900" : "text-white")}>{lockedCount}</span>
                  </span>
                </div>

                <Button
                  onClick={() => {
                    if (currentIndex < session.questions.length - 1) {
                      navigateTo(currentIndex + 1);
                      return;
                    }

                    void handleFinish(false);
                  }}
                  disabled={pendingSave || submittingFinish}
                  className={cn(
                    "h-11 rounded-full px-5 font-semibold",
                    isLightTheme ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-emerald-500 text-black hover:bg-emerald-400",
                  )}
                >
                  <span>{currentIndex < session.questions.length - 1 ? "Keyingi savol" : "Natijani ko'rish"}</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <div
                className={cn(
                  "overflow-hidden rounded-[1.75rem] border p-4 backdrop-blur-2xl sm:p-5",
                  isLightTheme ? "border-slate-200 bg-white/84" : "border-white/10 bg-black/32",
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className={cn("text-xs uppercase tracking-[0.22em]", isLightTheme ? "text-slate-500" : "text-white/48")}>Media</p>
                    <p className={cn("mt-1 text-sm", isLightTheme ? "text-slate-600" : "text-white/58")}>
                      Rasm yoki video mavjud bo&apos;lsa shu yerda ko&apos;rsatiladi.
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    "relative overflow-hidden rounded-[1.35rem] border",
                    isLightTheme ? "border-slate-200 bg-slate-100" : "border-white/10 bg-white/6",
                  )}
                >
                  <div className="aspect-[16/10] w-full">
                    {resolvedVideo ? (
                      <video
                        key={resolvedVideo}
                        src={resolvedVideo}
                        controls
                        className="h-full w-full object-cover"
                        onError={() => setBrokenMediaSources((previous) => ({ ...previous, [resolvedVideo]: true }))}
                      />
                    ) : resolvedImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={resolvedImage}
                        alt={currentQuestion.text}
                        className="h-full w-full object-cover"
                        onError={() => setBrokenMediaSources((previous) => ({ ...previous, [resolvedImage]: true }))}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                        {currentQuestion.video_url ? <Video className="h-8 w-8 opacity-50" /> : <ImageIcon className="h-8 w-8 opacity-50" />}
                        <div className="text-center">
                          <p className={cn("text-sm font-semibold", isLightTheme ? "text-slate-700" : "text-white/76")}>Media topilmadi</p>
                          <p className={cn("mt-1 text-xs", isLightTheme ? "text-slate-500" : "text-white/48")}>
                            Savolda rasm/video biriktirilmagan yoki manzil ishlamayapti.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "rounded-[1.75rem] border p-4 backdrop-blur-2xl",
                  isLightTheme ? "border-slate-200 bg-white/84" : "border-white/10 bg-black/32",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={cn("text-xs uppercase tracking-[0.22em]", isLightTheme ? "text-slate-500" : "text-white/48")}>Sessiya holati</p>
                    <p className={cn("mt-1 text-lg font-semibold", isLightTheme ? "text-slate-950" : "text-white")}>
                      {session.pressureMode ? "Pressure Mode" : "Standart rejim"}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "rounded-full border px-3 py-2 text-xs font-semibold",
                      mistakeExceeded
                        ? "border-rose-400/28 bg-rose-500/12 text-rose-200"
                        : mistakeAtLimit
                          ? "border-amber-400/28 bg-amber-500/12 text-amber-100"
                          : isLightTheme
                            ? "border-slate-200 bg-slate-50 text-slate-600"
                            : "border-white/10 bg-white/6 text-white/58",
                    )}
                  >
                    Xato limiti: {session.mistakeLimit}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <div className={cn("rounded-[1.2rem] border p-3", isLightTheme ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/6")}>
                    <p className={cn("text-xs uppercase tracking-[0.18em]", isLightTheme ? "text-slate-500" : "text-white/48")}>To&apos;g&apos;ri</p>
                    <p className={cn("mt-2 text-2xl font-semibold", isLightTheme ? "text-emerald-700" : "text-emerald-300")}>{correctCount}</p>
                  </div>
                  <div className={cn("rounded-[1.2rem] border p-3", isLightTheme ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/6")}>
                    <p className={cn("text-xs uppercase tracking-[0.18em]", isLightTheme ? "text-slate-500" : "text-white/48")}>Xato</p>
                    <p className={cn("mt-2 text-2xl font-semibold", isLightTheme ? "text-slate-950" : "text-white")}>{wrongCount}</p>
                  </div>
                  <div className={cn("rounded-[1.2rem] border p-3", isLightTheme ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/6")}>
                    <p className={cn("text-xs uppercase tracking-[0.18em]", isLightTheme ? "text-slate-500" : "text-white/48")}>Belgilangani</p>
                    <p className={cn("mt-2 text-2xl font-semibold", isLightTheme ? "text-slate-950" : "text-white")}>{lockedCount}</p>
                  </div>
                  <div className={cn("rounded-[1.2rem] border p-3", isLightTheme ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/6")}>
                    <p className={cn("text-xs uppercase tracking-[0.18em]", isLightTheme ? "text-slate-500" : "text-white/48")}>Qoidabuzarlik</p>
                    <p className={cn("mt-2 text-2xl font-semibold", violationExceeded ? "text-rose-400" : isLightTheme ? "text-slate-950" : "text-white")}>
                      {violationCount}/{session.violationLimit}
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    "mt-4 rounded-[1.2rem] border px-4 py-3 text-sm",
                    violationExceeded
                      ? isLightTheme
                        ? "border-rose-300/80 bg-rose-50 text-rose-900"
                        : "border-rose-400/16 bg-rose-500/10 text-rose-100"
                      : mistakeExceeded
                      ? isLightTheme
                        ? "border-rose-300/80 bg-rose-50 text-rose-900"
                        : "border-rose-400/16 bg-rose-500/10 text-rose-100"
                      : mistakeAtLimit
                        ? isLightTheme
                          ? "border-amber-300/80 bg-amber-50 text-amber-900"
                          : "border-amber-400/16 bg-amber-500/10 text-amber-100"
                        : isLightTheme
                          ? "border-slate-200 bg-slate-50 text-slate-600"
                          : "border-white/10 bg-white/6 text-white/62",
                  )}
                >
                  {violationExceeded
                    ? humanizeSimulationFailureReason("violation_limit_reached")
                    : mistakeExceeded
                    ? "Siz backenddagi xato limitidan oshib ketdingiz. Sessiya yakunlanganda urinish muvaffaqiyatsiz bo'ladi."
                    : mistakeAtLimit
                      ? "Siz limitga yetdingiz. Endi keyingi xato yakuniy natijaga salbiy ta'sir qiladi."
                      : `Backenddan kelgan limit bo'yicha xato ${session.mistakeLimit} ta, qoidabuzarlik esa ${session.violationLimit} ta bilan cheklanadi.`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
