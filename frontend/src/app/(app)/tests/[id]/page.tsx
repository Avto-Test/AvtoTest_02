"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useTestStore } from "@/store/useTestStore";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Timer, ChevronLeft, ChevronRight, Send } from "lucide-react";
import FullScreenLoader from "@/components/FullScreenLoader";
import { logViolation } from "@/lib/violations";
import { useI18n } from "@/components/i18n-provider";

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
    return typeof detail === "string" && detail.length > 0 ? detail : null;
}

function stripCorrectMarker(textValue: string): string {
    return textValue.trim().replace(/\/t\s*$/i, "").trim();
}

export default function TestAttemptPage() {
    const { t } = useI18n();
    const { id: testId } = useParams();
    const normalizedTestId = Array.isArray(testId) ? testId[0] : testId;
    const router = useRouter();
    const [initLoading, setInitLoading] = useState(true);

    const {
        attemptId,
        questions,
        currentQuestionIndex,
        answers,
        remainingTime,
        setAttempt,
        setAnswer,
        nextQuestion,
        prevQuestion,
        goToQuestion,
        tick,
        setResult,
    } = useTestStore();

    const currentQuestion = questions[currentQuestionIndex];
    const youtubeEmbed = currentQuestion?.video_url
        ? getYouTubeEmbedUrl(currentQuestion.video_url)
        : null;
    const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [responseTimes, setResponseTimes] = useState<Record<string, number>>({});
    const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
    const [violationCooldown, setViolationCooldown] = useState<number>(0);
    const antiFocusPollRef = useRef<number | null>(null);
    const hasAutoSubmittedRef = useRef(false);

    const unansweredIndexes = useMemo(
        () =>
            questions
                .map((q, index) => ({ q, index }))
                .filter(({ q }) => !answers[q.id])
                .map(({ index }) => index),
        [questions, answers]
    );

    // Track question transitions for latency modeling
    useEffect(() => {
        setQuestionStartTime(Date.now());
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
            toast.warning("Qoidabuzarlik urinish qayd etildi.");
        };

        const clearClipboard = async () => {
            try {
                await navigator.clipboard.writeText("");
            } catch {
                // Ignore clipboard API failures
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

    const handleAnswerCapture = useCallback((questionId: string, optionId: string) => {
        const endTime = Date.now();
        const duration = endTime - questionStartTime;

        // Accumulate duration for this question if re-answering
        setResponseTimes(prev => ({
            ...prev,
            [questionId]: (prev[questionId] || 0) + duration
        }));

        setAnswer(questionId, optionId);
    }, [questionStartTime, setAnswer]);

    // Initialize Attempt
    useEffect(() => {
        async function startAttempt() {
            const searchParams = new URLSearchParams(window.location.search);
            const isPressure = searchParams.get("pressure") === "true";
            const requestedCount = Number(searchParams.get("count") ?? "20");
            const safeCount = [20, 30, 40, 50].includes(requestedCount) ? requestedCount : 20;

            if (normalizedTestId !== "adaptive") {
                const next = `/tests?mode=adaptive&count=${safeCount}${isPressure ? "&pressure=true" : ""}`;
                router.replace(next);
                return;
            }

            try {
                const attemptRes = await api.post("/tests/adaptive/start", {
                    question_count: safeCount,
                    pressure_mode: isPressure,
                });
                const {
                    id: attempt_id,
                    questions: adaptiveQuestions,
                    duration_minutes: durationMinutes,
                } = attemptRes.data;
                setAttempt(attempt_id, adaptiveQuestions, durationMinutes || 25);
            } catch (error: unknown) {
                console.error("Failed to start attempt:", error);
                const status = (error as { response?: { status?: number } })?.response?.status;
                if (status === 401) {
                    toast.error("Session expired. Please login again.");
                    router.push("/login?next=/tests?mode=adaptive");
                } else if (status === 403) {
                    toast.error(getErrorDetail(error) || "Adaptive mode requires premium access.");
                    router.push("/upgrade");
                } else {
                    toast.error(getErrorDetail(error) || "Failed to start test session.");
                }
                router.push("/tests?mode=adaptive");
            } finally {
                setInitLoading(false);
            }
        }
        startAttempt();
    }, [normalizedTestId, setAttempt, router]);

    // Timer logic
    useEffect(() => {
        if (!attemptId) return;

        const interval = setInterval(() => {
            tick();
        }, 1000);

        return () => clearInterval(interval);
    }, [attemptId, tick]);

    const handleSubmit = useCallback(async (options?: { bypassIncompleteCheck?: boolean }) => {
        if (!attemptId || isSubmitting) return;

        if (!options?.bypassIncompleteCheck && unansweredIndexes.length > 0) {
            const firstUnansweredIndex = unansweredIndexes[0] ?? 0;
            goToQuestion(firstUnansweredIndex);
            toast.error(t("test.all_required").replace("{count}", String(unansweredIndexes.length)));
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading(t("test.submitting"));

        // Prepare response_times array in the order of questions
        const orderedResponseTimes = questions.map((q) => responseTimes[q.id] || 0);

        try {
            const res = await api.post("/attempts/submit", {
                attempt_id: attemptId,
                answers: answers,
                response_times: orderedResponseTimes,
            });

            setResult(res.data);
            toast.success("Test submitted successfully!", { id: toastId });
            router.push("/tests/adaptive/result");
        } catch (error: unknown) {
            console.error("Submission failed:", error);
            const errorMsg = getErrorDetail(error) || "Failed to submit test. Please try again.";
            toast.error(errorMsg, { id: toastId });
            setIsSubmitting(false);
        }
    }, [attemptId, isSubmitting, unansweredIndexes, goToQuestion, questions, responseTimes, answers, setResult, router, t]);

    // Handle auto-finish on time expiration
    useEffect(() => {
        if (!attemptId || remainingTime !== 0 || hasAutoSubmittedRef.current) return;
        hasAutoSubmittedRef.current = true;
        toast.warning(t("test.time_up"));
        handleSubmit({ bypassIncompleteCheck: true });
    }, [remainingTime, attemptId, handleSubmit, t]);

    // Keyboard Support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!currentQuestion) return;
            const key = e.key;
            if (key >= "1" && key <= "4") {
                const optionIndex = parseInt(key) - 1;
                const option = currentQuestion.answer_options[optionIndex];
                if (option) {
                    handleAnswerCapture(currentQuestion.id, option.id);
                }
            } else if (key === "ArrowLeft") {
                prevQuestion();
            } else if (key === "ArrowRight") {
                nextQuestion();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentQuestion, handleAnswerCapture, nextQuestion, prevQuestion]);

    // Prevention of accidental navigation
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (attemptId) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [attemptId]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    if (initLoading) return <FullScreenLoader />;
    if (!currentQuestion) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex h-screen flex-col overflow-hidden bg-background text-foreground select-none"
            style={{ userSelect: "none", WebkitUserSelect: "none" }}
            onCopy={(event) => event.preventDefault()}
            onCut={(event) => event.preventDefault()}
            onPaste={(event) => event.preventDefault()}
            onContextMenu={(event) => event.preventDefault()}
            onDragStart={(event) => event.preventDefault()}
        >
            {/* Header */}
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/tests?mode=adaptive")}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        {t("test.quit")}
                    </Button>
                    <div className="h-4 w-[1px] bg-border" />
                    <h2 className="max-w-[200px] truncate font-semibold text-foreground md:max-w-none">
                        {t("test.title")}
                    </h2>
                </div>

                <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="flex items-center gap-2 border-border bg-muted px-3 py-1 font-mono text-base text-foreground">
                        <Timer className={`w-4 h-4 ${remainingTime < 300 ? "animate-pulse text-red-500" : "text-muted-foreground"}`} />
                        {formatTime(remainingTime)}
                    </Badge>
                    <Button
                        onClick={() => {
                            void handleSubmit();
                        }}
                        className="bg-[#00B37E] hover:bg-[#009468] text-white rounded-lg h-9"
                        disabled={isSubmitting}
                    >
                        {t("test.finish")}
                    </Button>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="w-full shrink-0">
                <Progress value={progress} className="h-1 rounded-none bg-muted [&>div]:bg-[#00B37E]" />
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6 md:p-12">
                <div className="max-w-3xl mx-auto space-y-8">
                    {/* Question Meta */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#00B37E] uppercase tracking-wider">
                            {t("test.question_of")
                                .replace("{current}", String(currentQuestionIndex + 1))
                                .replace("{total}", String(questions.length))}
                        </span>
                        {answers[currentQuestion.id] && (
                            <Badge className="bg-[#00B37E]/10 text-[#00B37E] border-none">{t("test.answered")}</Badge>
                        )}
                    </div>

                    {/* Question Text */}
                    <div className="space-y-6">
                        <h1 className="text-2xl font-bold leading-tight text-foreground md:text-3xl">
                            {currentQuestion.text}
                        </h1>

                        {currentQuestion.image_url && (
                            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                                <img
                                    src={currentQuestion.image_url}
                                    alt="Question Illustration"
                                    className="w-full h-auto max-h-[400px] object-contain mx-auto"
                                />
                            </div>
                        )}
                        {currentQuestion.video_url && (
                            <div className="overflow-hidden rounded-2xl border border-border bg-black/85">
                                {youtubeEmbed ? (
                                    <iframe
                                        src={youtubeEmbed}
                                        title="Question video"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="w-full aspect-video"
                                    />
                                ) : (
                                    <video
                                        src={currentQuestion.video_url}
                                        controls
                                        className="w-full h-auto max-h-[400px] object-contain mx-auto"
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Options */}
                    <div className="grid gap-4">
                        {currentQuestion.answer_options.map((option, idx: number) => (
                            <button
                                key={option.id}
                                onClick={() => handleAnswerCapture(currentQuestion.id, option.id)}
                                className={`
                  w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all duration-200 group
                  ${answers[currentQuestion.id] === option.id
                                        ? 'border-[#00B37E] bg-[#00B37E]/5 ring-4 ring-[#00B37E]/5'
                                        : 'border-border bg-card hover:border-[#00B37E]/40 hover:bg-muted/50'
                                    }
                `}
                            >
                                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-colors
                  ${answers[currentQuestion.id] === option.id
                                        ? 'bg-[#00B37E] text-white'
                                        : 'bg-muted text-muted-foreground group-hover:bg-[#00B37E]/10 group-hover:text-[#00B37E]'
                                    }
                `}>
                                    {String.fromCharCode(65 + idx)}
                                </div>
                                <span className={`font-medium ${answers[currentQuestion.id] === option.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {stripCorrectMarker(option.text)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer Navigation */}
            <footer className="flex h-20 shrink-0 items-center justify-between border-t border-border bg-card px-6 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
                <Button
                    variant="outline"
                    disabled={currentQuestionIndex === 0}
                    onClick={prevQuestion}
                    className="h-11 rounded-xl border-border px-6 font-semibold text-foreground"
                >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    {t("test.previous")}
                </Button>

                <div className="hidden md:flex gap-1">
                    {questions.map((_, idx: number) => (
                        <button
                            key={idx}
                            onClick={() => useTestStore.getState().goToQuestion(idx)}
                            className={`
                w-2.5 h-2.5 rounded-full transition-all
                ${idx === currentQuestionIndex ? 'bg-[#00B37E] scale-125' :
                                    answers[questions[idx].id] ? 'bg-[#00B37E]/40' : 'bg-muted'}
              `}
                        />
                    ))}
                </div>

                {currentQuestionIndex === questions.length - 1 ? (
                    <Button
                        onClick={() => {
                            void handleSubmit();
                        }}
                        className="bg-[#00B37E] hover:bg-[#009468] text-white rounded-xl h-11 px-8 font-semibold shadow-lg shadow-[#00B37E]/20"
                        disabled={isSubmitting}
                    >
                        {t("test.submit")}
                        <Send className="w-4 h-4 ml-2" />
                    </Button>
                ) : (
                    <Button
                        onClick={nextQuestion}
                        className="h-11 rounded-xl bg-primary px-8 font-semibold text-primary-foreground hover:bg-primary/90"
                        disabled={isSubmitting}
                    >
                        {t("test.next")}
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                )}
            </footer>
        </div>
    );
}
