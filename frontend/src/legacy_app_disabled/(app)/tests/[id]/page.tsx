"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Crown, Send, Timer } from "lucide-react";
import { toast } from "sonner";

import api from "@/lib/axios";
import { trackEvent } from "@/lib/analytics";
import { writeTestXpSnapshot } from "@/lib/gamification";
import { getOptionFunctionLabel } from "@/lib/testOptionLabels";
import { logViolation } from "@/lib/violations";
import { useI18n } from "@/components/i18n-provider";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTestStore } from "@/store/useTestStore";
import { BulkSubmitResponse, TestSessionStart } from "@/types/test";

type AttemptMode = "adaptive" | "free_random";

interface AnswerFeedback {
  questionId: string;
  selectedOptionId: string;
}

interface FreeCompletionState {
  score: number;
  total: number;
  attemptsUsedToday: number;
  attemptsLimit: number;
  attemptsRemaining: number;
}

interface UserXpSnapshotResponse {
  xp_total: number;
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("youtu.be")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (
      host.includes("youtube.com") ||
      host.includes("m.youtube.com") ||
      host.includes("youtube-nocookie.com")
    ) {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;

      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && ["shorts", "embed", "live"].includes(parts[0])) {
        return `https://www.youtube.com/embed/${parts[1]}`;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function getErrorDetail(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const maybeAxios = error as { response?: { data?: { detail?: unknown } } };
  const detail = maybeAxios.response?.data?.detail;
  if (typeof detail === "string" && detail.length > 0) {
    return detail;
  }
  if (detail && typeof detail === "object") {
    const nestedError = (detail as { error?: unknown }).error;
    return typeof nestedError === "string" ? nestedError : null;
  }
  return null;
}

function stripCorrectMarker(textValue: string): string {
  return textValue.trim().replace(/\/t\s*$/i, "").trim();
}

function isMobileDevice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(max-width: 768px)").matches || navigator.maxTouchPoints > 0;
}

export default function TestAttemptPage() {
  const { t } = useI18n();
  const { id: testId } = useParams();
  const normalizedTestId = Array.isArray(testId) ? testId[0] : testId;
  const router = useRouter();

  const [initLoading, setInitLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [responseTimes, setResponseTimes] = useState<Record<string, number>>({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [violationCooldown, setViolationCooldown] = useState<number>(0);
  const [attemptMode, setAttemptMode] = useState<AttemptMode>("adaptive");
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback | null>(null);
  const [pendingSelectionId, setPendingSelectionId] = useState<string | null>(null);
  const [freeCompletion, setFreeCompletion] = useState<FreeCompletionState | null>(null);
  const [freeUsage, setFreeUsage] = useState({
    attemptsUsedToday: 0,
    attemptsLimit: 2,
    attemptsRemaining: 2,
  });

  const antiFocusPollRef = useRef<number | null>(null);
  const autoAdvanceRef = useRef<number | null>(null);
  const hasAutoSubmittedRef = useRef(false);
  const lastInputAtRef = useRef(0);

  const {
    attemptId,
    questions,
    currentQuestionIndex,
    answers,
    remainingTime,
    setAttempt,
    setAnswer,
    nextQuestion,
    goToQuestion,
    tick,
    setResult,
    reset,
  } = useTestStore();

  const currentQuestion = questions[currentQuestionIndex];
  const youtubeEmbed = currentQuestion?.video_url ? getYouTubeEmbedUrl(currentQuestion.video_url) : null;
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  useEffect(() => {
    setQuestionStartTime(Date.now());
    setAnswerFeedback(null);
    setPendingSelectionId(null);
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (violationCooldown === 0) return;
    const timer = setTimeout(() => setViolationCooldown(0), 1500);
    return () => clearTimeout(timer);
  }, [violationCooldown]);

  useEffect(() => {
    if (!attemptId) return;

    const report = (eventType: string, extra?: Record<string, unknown>) => {
      if (violationCooldown > 0) return;
      setViolationCooldown(1);
      logViolation({
        event_type: eventType,
        test_id: typeof normalizedTestId === "string" ? normalizedTestId : undefined,
        attempt_id: attemptId,
        details: {
          path: window.location.pathname,
          ...extra,
        },
      });
      toast.warning("Qoidabuzarlik urinishi qayd etildi.");
    };

    const clearClipboard = async () => {
      try {
        await navigator.clipboard.writeText("");
      } catch {
        // Ignore clipboard API failures.
      }
    };

    const handleCopy = (event: ClipboardEvent) => {
      event.preventDefault();
      report("copy_blocked");
      void clearClipboard();
    };
    const handleCut = (event: ClipboardEvent) => {
      event.preventDefault();
      report("cut_blocked");
      void clearClipboard();
    };
    const handlePaste = (event: ClipboardEvent) => {
      event.preventDefault();
      report("paste_blocked");
    };
    const handleSelectStart = (event: Event) => {
      event.preventDefault();
      report("selection_blocked");
    };
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        selection.removeAllRanges();
        report("selection_cleared");
      }
    };
    const handleDragStart = (event: DragEvent) => {
      event.preventDefault();
      report("drag_blocked");
    };
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      report("context_menu_blocked");
    };
    const handleVisibility = () => {
      if (document.hidden) {
        report("visibility_hidden");
      }
    };
    const handleWindowBlur = () => {
      report("window_blur");
    };
    const handleKeydown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isDevToolsShortcut =
        event.key === "F12" ||
        (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) ||
        (event.ctrlKey && ["u", "s"].includes(key));
      const isCopyShortcut =
        (event.ctrlKey || event.metaKey) && ["c", "x", "a", "v", "u", "s", "p"].includes(key);
      const isScreenshot = event.key === "PrintScreen";
      const isOsScreenshotShortcut =
        (event.metaKey && event.shiftKey && ["s", "3", "4", "5"].includes(key)) ||
        ((event.altKey || event.ctrlKey) && event.key === "PrintScreen");

      if (isDevToolsShortcut) {
        event.preventDefault();
        event.stopPropagation();
        report("devtools_blocked", { key: event.key });
        return;
      }

      if (isCopyShortcut) {
        event.preventDefault();
        event.stopPropagation();
        report("clipboard_shortcut_blocked", { key: event.key });
        if (key === "c" || key === "x") {
          void clearClipboard();
        }
        return;
      }

      if (isScreenshot || isOsScreenshotShortcut) {
        event.preventDefault();
        event.stopPropagation();
        report("printscreen_blocked", { key: event.key, meta: event.metaKey, shift: event.shiftKey });
        void clearClipboard();
      }
    };
    const handleKeyup = (event: KeyboardEvent) => {
      if (event.key === "PrintScreen") {
        report("printscreen_blocked_keyup");
        void clearClipboard();
      }
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("keydown", handleKeydown, true);
    window.addEventListener("keyup", handleKeyup, true);

    let lastFocusState = document.hasFocus();
    antiFocusPollRef.current = window.setInterval(() => {
      const nowFocused = document.hasFocus();
      if (!nowFocused && lastFocusState) {
        report("focus_lost_poll");
      }
      lastFocusState = nowFocused;
    }, 120);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("keydown", handleKeydown, true);
      window.removeEventListener("keyup", handleKeyup, true);
      if (antiFocusPollRef.current !== null) {
        window.clearInterval(antiFocusPollRef.current);
        antiFocusPollRef.current = null;
      }
    };
  }, [attemptId, normalizedTestId, violationCooldown]);

  const submitAttempt = useCallback(
    async (
      submissionAnswers: Record<string, string>,
      submissionResponseTimes: Record<string, number>,
      options?: { enforceComplete?: boolean }
    ) => {
      if (!attemptId || isSubmitting) return;

      if (options?.enforceComplete !== false) {
        const missingIndexes = questions
          .map((question, index) => ({ question, index }))
          .filter(({ question }) => !submissionAnswers[question.id])
          .map(({ index }) => index);

        if (missingIndexes.length > 0) {
          const firstUnansweredIndex = missingIndexes[0] ?? 0;
          goToQuestion(firstUnansweredIndex);
          toast.error(t("test.all_required").replace("{count}", String(missingIndexes.length)));
          return;
        }
      }

      setIsSubmitting(true);
      const toastId = toast.loading(t("test.submitting"));
      const orderedResponseTimes = questions.map((q) => submissionResponseTimes[q.id] || 0);

      try {
        const res = await api.post<BulkSubmitResponse>("/attempts/submit", {
          attempt_id: attemptId,
          answers: submissionAnswers,
          response_times: orderedResponseTimes,
        });

        if (attemptMode === "free_random") {
          const result = res.data;
          const completionState = {
            score: result.correct_count ?? result.score,
            total: result.total,
            attemptsUsedToday: freeUsage.attemptsUsedToday,
            attemptsLimit: freeUsage.attemptsLimit,
            attemptsRemaining: freeUsage.attemptsRemaining,
          };
          setFreeCompletion(completionState);
          reset();
          void trackEvent("free_test_completed", {
            score: completionState.score,
            total: completionState.total,
            attempts_used_today: completionState.attemptsUsedToday,
          });
          toast.success("Free test yakunlandi.", { id: toastId });
          return;
        }

        setResult(res.data);
        toast.success("Test submitted successfully!", { id: toastId });
        router.push("/tests/adaptive/result");
      } catch (error: unknown) {
        const errorMsg = getErrorDetail(error) || "Failed to submit test. Please try again.";
        toast.error(errorMsg, { id: toastId });
        setIsSubmitting(false);
      }
    },
    [
      attemptId,
      attemptMode,
      freeUsage,
      goToQuestion,
      isSubmitting,
      questions,
      reset,
      router,
      setResult,
      t,
    ]
  );

  const handleSubmit = useCallback(
    async (options?: { bypassIncompleteCheck?: boolean }) => {
      await submitAttempt(answers, responseTimes, {
        enforceComplete: options?.bypassIncompleteCheck ? false : true,
      });
    },
    [answers, responseTimes, submitAttempt]
  );

  const handleAnswerCapture = useCallback(
    async (questionId: string, optionId: string) => {
      if (!attemptId || !currentQuestion || isAnswering || answers[questionId]) {
        return;
      }

      const now = Date.now();
      if (now - lastInputAtRef.current < 150) {
        return;
      }
      lastInputAtRef.current = now;

      setPendingSelectionId(optionId);
      setIsAnswering(true);

      try {
        const duration = now - questionStartTime;
        const nextResponseTimes = {
          ...responseTimes,
          [questionId]: (responseTimes[questionId] || 0) + duration,
        };
        const nextAnswers = {
          ...answers,
          [questionId]: optionId,
        };
        setResponseTimes(nextResponseTimes);

        await api.post<{
          accepted: boolean;
          selected_option_id: string;
        }>("/attempts/answer", {
          attempt_id: attemptId,
          question_id: questionId,
          selected_option_id: optionId,
        });

        setAnswer(questionId, optionId);
        setAnswerFeedback({
          questionId,
          selectedOptionId: optionId,
        });
        setPendingSelectionId(null);

        if (autoAdvanceRef.current !== null) {
          window.clearTimeout(autoAdvanceRef.current);
        }

        autoAdvanceRef.current = window.setTimeout(() => {
          setIsAnswering(false);
          setAnswerFeedback(null);

          if (currentQuestionIndex >= questions.length - 1) {
            void submitAttempt(nextAnswers, nextResponseTimes, { enforceComplete: false });
            return;
          }
          nextQuestion();
        }, 800);
      } catch (error) {
        setPendingSelectionId(null);
        setIsAnswering(false);
        toast.error(getErrorDetail(error) || "Javobni yuborib bo'lmadi.");
      }
    },
    [answers, attemptId, currentQuestion, currentQuestionIndex, isAnswering, nextQuestion, questionStartTime, questions.length, responseTimes, setAnswer, submitAttempt]
  );

  useEffect(() => {
    async function startAttempt() {
      const searchParams = new URLSearchParams(window.location.search);
      const isPressure = searchParams.get("pressure") === "true";
      const requestedCount = Number(searchParams.get("count") ?? "20");
      const safeCount = [20, 30, 40, 50].includes(requestedCount) ? requestedCount : 20;

      try {
        let attemptRes;
        if (normalizedTestId === "adaptive") {
          attemptRes = await api.post<TestSessionStart>("/tests/adaptive/start", {
            question_count: safeCount,
            pressure_mode: isPressure,
          });
          setAttemptMode("adaptive");
        } else if (normalizedTestId === "free") {
          attemptRes = await api.get<TestSessionStart>("/tests/free-random");
          setAttemptMode("free_random");
          void trackEvent("free_test_started", {
            question_count: 20,
          });
        } else {
          router.replace("/tests");
          return;
        }

        const {
          id: attempt_id,
          questions: sessionQuestions,
          duration_minutes: durationMinutes,
          attempt_mode,
          attempts_used_today,
          attempts_limit,
          attempts_remaining,
        } = attemptRes.data;

        setAttempt(attempt_id, sessionQuestions, durationMinutes || 25);
        void api.get<UserXpSnapshotResponse>("/users/me/xp")
          .then((response) => {
            writeTestXpSnapshot(response.data.xp_total ?? 0);
          })
          .catch(() => {
            // XP snapshot is optional and should not block test start.
          });

        if (attempt_mode === "free_random") {
          setAttemptMode("free_random");
        }

        if (typeof attempts_used_today === "number" && typeof attempts_limit === "number") {
          setFreeUsage({
            attemptsUsedToday: attempts_used_today,
            attemptsLimit: attempts_limit,
            attemptsRemaining:
              typeof attempts_remaining === "number"
                ? attempts_remaining
                : Math.max(0, attempts_limit - attempts_used_today),
          });
        }
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number; data?: { detail?: unknown } } })?.response?.status;
        const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
        const detailError =
          detail && typeof detail === "object" && "error" in detail ? (detail as { error?: unknown }).error : null;

        if (status === 401) {
          toast.error("Session expired. Please login again.");
          router.push("/login?next=/tests");
        } else if (status === 403 && detailError === "DAILY_LIMIT_REACHED") {
          void trackEvent("daily_limit_reached", { location: "free_random_start" });
          toast.error("Bugungi urinishlar soni tugadi.");
          router.push("/tests?completed=1");
        } else if (status === 403) {
          toast.error(getErrorDetail(error) || "Adaptive mode requires premium access.");
          router.push("/upgrade");
        } else {
          toast.error(getErrorDetail(error) || "Failed to start test session.");
          router.push("/tests");
        }
      } finally {
        setInitLoading(false);
      }
    }

    void startAttempt();
  }, [normalizedTestId, router, setAttempt]);

  useEffect(() => {
    if (!attemptId) return;

    const interval = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(interval);
  }, [attemptId, tick]);

  useEffect(() => {
    if (!attemptId || remainingTime !== 0 || hasAutoSubmittedRef.current) return;
    hasAutoSubmittedRef.current = true;
    toast.warning(t("test.time_up"));
    void handleSubmit({ bypassIncompleteCheck: true });
  }, [remainingTime, attemptId, handleSubmit, t]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentQuestion || isMobileDevice() || isAnswering || answers[currentQuestion.id]) {
        return;
      }

      const keyMap: Record<string, number> = {
        F1: 0,
        F2: 1,
        F3: 2,
        F4: 3,
      };
      const optionIndex = keyMap[event.key];
      if (optionIndex === undefined) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const option = currentQuestion.answer_options[optionIndex];
      if (option) {
        void handleAnswerCapture(currentQuestion.id, option.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [answers, currentQuestion, handleAnswerCapture, isAnswering]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (attemptId) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [attemptId]);

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current !== null) {
        window.clearTimeout(autoAdvanceRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const timerVariant = useMemo(() => {
    if (remainingTime <= 60) return "danger";
    if (remainingTime <= 5 * 60) return "warning";
    return "neutral";
  }, [remainingTime]);

  if (initLoading) return <FullScreenLoader />;

  if (freeCompletion) {
    const limitReached = freeCompletion.attemptsRemaining <= 0;

    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 py-12">
        <div className="w-full space-y-6 rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <Send className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Free test yakunlandi</h1>
            <p className="text-muted-foreground">
              {"To'g'ri javoblar: "} {freeCompletion.score}/{freeCompletion.total}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background px-4 py-4">
            <div className="text-sm text-muted-foreground">Kunlik limit</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {freeCompletion.attemptsUsedToday}/{freeCompletion.attemptsLimit} urinish ishlatilgan
            </div>
            {limitReached ? (
              <p className="mt-2 text-sm text-amber-300">Bugungi urinishlar soni tugadi</p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Yana {freeCompletion.attemptsRemaining} ta free test ishlatishingiz mumkin.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {!limitReached ? (
              <Button
                className="flex-1"
                onClick={() => {
                  router.push("/tests?completed=1");
                }}
              >
                Yana test boshlash
              </Button>
            ) : (
              <Button
                className="flex-1"
                onClick={() => {
                  void trackEvent("premium_upgrade_click", { source: "free_completion_limit_reached" });
                  router.push("/upgrade");
                }}
              >
                <Crown className="mr-2 h-4 w-4" />
                Premium bilan davom etish
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                router.push("/dashboard");
              }}
            >
              Dashboard ga qaytish
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const selectedOptionId =
    answerFeedback?.selectedOptionId ?? pendingSelectionId ?? answers[currentQuestion.id] ?? null;
  const isFreeMode = attemptMode === "free_random";

  const canGoPrev = currentQuestionIndex > 0;
  const canGoNext = currentQuestionIndex < questions.length - 1;

  const navigatePrev = () => {
    if (canGoPrev && !isAnswering && !isSubmitting) {
      setAnswerFeedback(null);
      setPendingSelectionId(null);
      goToQuestion(currentQuestionIndex - 1);
    }
  };

  const navigateNext = () => {
    if (canGoNext && !isAnswering && !isSubmitting) {
      setAnswerFeedback(null);
      setPendingSelectionId(null);
      goToQuestion(currentQuestionIndex + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex h-screen flex-col overflow-hidden bg-slate-950 text-foreground select-none"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
      onCopy={(event) => event.preventDefault()}
      onCut={(event) => event.preventDefault()}
      onPaste={(event) => event.preventDefault()}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      {/* Top exam bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/95 px-3 shadow-sm sm:h-16 sm:px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/tests")}
            className="px-2 text-slate-400 hover:text-slate-100 sm:px-3"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">{t("test.quit")}</span>
          </Button>
          <div className="hidden h-4 w-px bg-slate-700 sm:block" />
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-slate-400">
              {isFreeMode ? "Free Practice" : "Simulation Exam"}
            </span>
            <span className="text-sm font-semibold text-slate-100">
              {t("test.question_of")
                .replace("{current}", String(currentQuestionIndex + 1))
                .replace("{total}", String(questions.length))}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {isFreeMode ? (
            <Badge variant="secondary" className="hidden border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200 sm:flex">
              {freeUsage.attemptsUsedToday}/{freeUsage.attemptsLimit} free tests used today
            </Badge>
          ) : null}
          <Badge
            variant="secondary"
            className={`flex items-center gap-1.5 border px-2 py-1 font-mono text-sm sm:gap-2 sm:px-3 sm:text-base ${
              timerVariant === "danger"
                ? "border-red-500/70 bg-red-500/15 text-red-100"
                : timerVariant === "warning"
                ? "border-amber-400/70 bg-amber-500/15 text-amber-50"
                : "border-slate-700 bg-slate-900 text-slate-100"
            }`}
          >
            <Timer className={`h-4 w-4 ${timerVariant !== "neutral" ? "animate-pulse" : ""}`} />
            {formatTime(remainingTime)}
          </Badge>
        </div>
      </header>

      {/* Progress bar */}
      <div className="w-full shrink-0">
        <Progress value={progress} className="h-1 rounded-none bg-slate-900 [&>div]:bg-sky-500" />
      </div>

      {/* Main layout: question + navigator */}
      <main className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:gap-6 lg:px-8 lg:py-6">
          {/* Question area */}
          <section className="flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/40 sm:p-6 lg:p-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-300">
                Question {currentQuestionIndex + 1} / {questions.length}
              </span>
              <Badge className="border-none bg-slate-800 text-xs text-slate-300">
                {selectedOptionId ? "Answer saved" : "Select an answer"}
              </Badge>
            </div>

            <div className="space-y-6">
              <h1 className="text-lg font-semibold leading-relaxed text-slate-50 sm:text-xl md:text-2xl">
                {currentQuestion.text}
              </h1>

              {currentQuestion.image_url ? (
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                  <Image
                    src={currentQuestion.image_url}
                    alt="Question illustration"
                    width={1200}
                    height={800}
                    className="mx-auto max-h-[360px] h-auto w-full object-contain"
                  />
                </div>
              ) : null}

              {currentQuestion.video_url ? (
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-black">
                  {youtubeEmbed ? (
                    <iframe
                      src={youtubeEmbed}
                      title="Question video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="aspect-video w-full"
                    />
                  ) : (
                    <video
                      src={currentQuestion.video_url}
                      controls
                      className="mx-auto max-h-[360px] h-auto w-full object-contain"
                    />
                  )}
                </div>
              ) : null}
            </div>

            {/* Answer options */}
            <div className="mt-6 grid gap-3">
              {currentQuestion.answer_options.map((option, idx) => {
                let optionClass =
                  "border-slate-700 bg-slate-900 hover:border-sky-500/50 hover:bg-slate-800/80";
                let badgeClass =
                  "bg-slate-800 text-slate-200 group-hover:bg-sky-500 group-hover:text-slate-950";

                if (pendingSelectionId === option.id || answers[currentQuestion.id] === option.id) {
                  optionClass =
                    "border-sky-500 bg-sky-500/15 ring-2 ring-sky-500/30 hover:bg-sky-500/20";
                  badgeClass = "bg-sky-500 text-slate-950";
                }

                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      void handleAnswerCapture(currentQuestion.id, option.id);
                    }}
                    disabled={Boolean(selectedOptionId) || isSubmitting || isAnswering}
                    className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-all duration-150 sm:gap-4 sm:px-4 sm:py-3.5 ${optionClass}`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${badgeClass}`}
                    >
                      {getOptionFunctionLabel(idx)}
                    </div>
                    <span className="text-sm font-medium text-slate-100 sm:text-base">
                      {stripCorrectMarker(option.text)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Question navigator (desktop) */}
          <aside className="hidden w-60 shrink-0 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/40 lg:block">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Question navigator
              </span>
              <span className="text-xs text-slate-400">
                {currentQuestionIndex + 1}/{questions.length}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((question, idx) => {
                const answered = Boolean(answers[question.id]);
                const isCurrent = idx === currentQuestionIndex;
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => {
                      if (!isAnswering && !isSubmitting) {
                        setAnswerFeedback(null);
                        setPendingSelectionId(null);
                        goToQuestion(idx);
                      }
                    }}
                    className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                      isCurrent
                        ? "bg-sky-500 text-slate-950"
                        : answered
                        ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </main>

      {/* Bottom controls */}
      <footer className="flex h-16 shrink-0 items-center justify-between border-t border-slate-800 bg-slate-900/95 px-3 text-sm text-slate-300 shadow-[0_-1px_3px_rgba(15,23,42,0.6)] sm:h-18 sm:px-6">
        <div className="hidden items-center gap-2 sm:flex">
          <span>
            {answerFeedback
              ? "Answer saved. Moving to the next question..."
              : "Choose the best answer. You can navigate between questions freely."}
          </span>
        </div>

        <div className="flex flex-1 items-center justify-between gap-3 sm:justify-end sm:gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!canGoPrev || isSubmitting || isAnswering}
              onClick={navigatePrev}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canGoNext || isSubmitting || isAnswering}
              onClick={navigateNext}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={() => {
              const unanswered = questions.filter((q) => !answers[q.id]).length;
              if (unanswered > 0) {
                const confirmSubmit = window.confirm(
                  "You still have unanswered questions. Are you sure you want to submit?",
                );
                if (!confirmSubmit) return;
              }
              void handleSubmit();
            }}
            className="h-10 rounded-xl bg-sky-500 px-4 font-semibold text-slate-950 shadow-lg shadow-sky-500/25 hover:bg-sky-400 sm:h-11 sm:px-6"
            disabled={isSubmitting || isAnswering}
          >
            <span className="hidden sm:inline">{t("test.submit")}</span>
            <Send className="h-4 w-4 sm:ml-2" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
