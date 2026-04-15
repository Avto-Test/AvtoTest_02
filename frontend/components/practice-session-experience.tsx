"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Circle,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  Coins,
  Eye,
  Gauge,
  LoaderCircle,
  Sparkles,
  Timer,
  XCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { submitLockedAnswer } from "@/api/answers";
import { trackAnalyticsEvent } from "@/api/analytics";
import { rewardPracticeAnswer } from "@/api/gamification";
import { submitAttempt } from "@/api/tests";
import { NotificationBell } from "@/components/notification-bell";
import { useSessionAntiCheat } from "@/hooks/use-session-anti-cheat";
import { useOptionalProgressSnapshot } from "@/components/providers/progress-provider";
import { useShellUi } from "@/components/shell-ui-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";
import type { LiveRewardResponse } from "@/types/practice";
import type { AiCoachFeedback, AttemptResult, DetailedAnswer, PublicQuestion } from "@/types/test";
import type { User } from "@/types/user";

type PracticeSessionPayload = {
  attemptId: string;
  title: string;
  subtitle: string;
  durationMinutes: number;
  questions: PublicQuestion[];
  modeLabel: string;
};

type QuestionRuntimeState = {
  selectedOptionId: string;
  correctOptionId: string | null;
  isCorrect: boolean | null;
  correctAnswer: string | null;
  explanation: string | null;
  aiCoach: AiCoachFeedback | null;
  recommendations: string[];
  locked: boolean;
  phase: "saving" | "resolved";
  reward: LiveRewardResponse | null;
  message: string | null;
};

type ResolvedQuestionAnswer = {
  selectedOptionId: string;
  correctOptionId: string | null;
  isCorrect: boolean | null;
  correctAnswer: string | null;
  explanation: string | null;
  aiCoach: AiCoachFeedback | null;
  recommendations: string[];
};

const PRACTICE_SESSION_THEME_DARK = {
  "--page-gradient": "linear-gradient(180deg, #050708 0%, #071012 54%, #050708 100%)",
  "--page-overlay":
    "radial-gradient(circle at 18% 26%, rgba(34, 197, 94, 0.12), transparent 38%), radial-gradient(circle at 82% 14%, rgba(94, 200, 255, 0.12), transparent 24%), radial-gradient(circle at 54% 118%, rgba(255, 255, 255, 0.03), transparent 40%), linear-gradient(180deg, rgba(5, 7, 8, 0.92) 0%, rgba(5, 8, 9, 0.98) 100%)",
  "--bg-primary": "#050708",
  "--bg-secondary": "#0a0d10",
  "--bg-tertiary": "#10161a",
  "--background": "#050708",
  "--card": "#0b0f11",
  "--card-bg": "rgba(12, 16, 18, 0.84)",
  "--card-bg-solid": "#0b0f11",
  "--card-bg-elevated": "rgba(12, 16, 18, 0.92)",
  "--card-bg-muted": "rgba(255, 255, 255, 0.028)",
  "--glass-bg": "rgba(9, 12, 14, 0.58)",
  "--glass-bg-strong": "rgba(10, 14, 16, 0.76)",
  "--glass-border": "rgba(255, 255, 255, 0.09)",
  "--glass-highlight": "rgba(255, 255, 255, 0.1)",
  "--foreground": "#f8faf8",
  "--text-primary": "#f8faf8",
  "--text-secondary": "#b9c2be",
  "--text-tertiary": "#7f8a86",
  "--muted": "rgba(255, 255, 255, 0.028)",
  "--muted-foreground": "#9ca3af",
  "--border": "rgba(255, 255, 255, 0.08)",
  "--border-color": "rgba(255, 255, 255, 0.08)",
  "--border-soft": "rgba(255, 255, 255, 0.035)",
  "--border-strong": "rgba(255, 255, 255, 0.16)",
  "--hover-bg": "rgba(255, 255, 255, 0.05)",
  "--accent-brand": "#34d17a",
  "--accent-brand-hover": "#23b766",
  "--accent-brand-contrast": "#f7fff8",
  "--accent-green": "#34d17a",
  "--accent-green-soft": "rgba(52, 209, 122, 0.12)",
  "--accent-green-strong": "rgba(52, 209, 122, 0.26)",
  "--accent-red": "#ff6a72",
  "--accent-red-soft": "rgba(255, 106, 114, 0.12)",
  "--accent-red-strong": "rgba(255, 106, 114, 0.24)",
  "--accent-yellow": "#f6b64f",
  "--accent-yellow-soft": "rgba(246, 182, 79, 0.12)",
  "--accent-yellow-strong": "rgba(246, 182, 79, 0.24)",
  "--accent-blue": "#5ec8ff",
  "--accent-blue-soft": "rgba(94, 200, 255, 0.12)",
  "--primary": "#34d17a",
  "--primary-soft": "rgba(52, 209, 122, 0.14)",
  "--primary-gradient": "linear-gradient(135deg, #1f8f46 0%, #24c465 46%, #6cf3a0 100%)",
  "--progress-gradient": "linear-gradient(90deg, rgba(52, 209, 122, 0.92) 0%, rgba(110, 231, 183, 1) 100%)",
  "--success-gradient": "linear-gradient(135deg, rgba(18, 56, 37, 0.94), rgba(12, 33, 22, 0.98) 62%, rgba(21, 73, 46, 0.92))",
  "--danger-gradient": "linear-gradient(135deg, rgba(68, 23, 31, 0.94), rgba(35, 13, 18, 0.98) 62%, rgba(90, 32, 42, 0.92))",
  "--warning-gradient": "linear-gradient(135deg, rgba(79, 49, 16, 0.94), rgba(42, 25, 9, 0.98) 62%, rgba(108, 64, 17, 0.92))",
  "--overlay-scrim": "rgba(0, 0, 0, 0.72)",
  "--backdrop-scrim": "rgba(0, 0, 0, 0.56)",
  "--shadow-soft": "0 14px 34px -24px rgba(0, 0, 0, 0.72), 0 8px 18px rgba(0, 0, 0, 0.24)",
  "--shadow-elevated": "0 26px 68px -40px rgba(0, 0, 0, 0.84), 0 16px 34px rgba(0, 0, 0, 0.34)",
  "--shadow-glow": "0 0 0 1px rgba(52, 209, 122, 0.18), 0 0 0 6px rgba(52, 209, 122, 0.06), 0 0 40px rgba(52, 209, 122, 0.2)",
  "--ring": "rgba(52, 209, 122, 0.36)",
  "--input": "rgba(255, 255, 255, 0.06)",
  "--session-rail-bg": "linear-gradient(180deg,rgba(14,20,22,0.86),rgba(8,12,13,0.78))",
  "--session-surface-strong": "linear-gradient(180deg,rgba(13,18,20,0.92),rgba(8,11,12,0.86))",
  "--session-option-bg": "linear-gradient(180deg,rgba(16,22,24,0.94),rgba(10,13,14,0.98))",
  "--session-pill-bg": "rgba(10,14,15,0.7)",
  "--session-pill-bg-strong": "rgba(14,19,20,0.76)",
  "--session-chip-strong": "rgba(0,0,0,0.3)",
  "--session-media-facts-bg": "rgba(8,12,13,0.28)",
  "--session-outline-bg": "rgba(255,255,255,0.05)",
  "--session-outline-hover-bg": "rgba(255,255,255,0.08)",
  "--session-outline-border": "rgba(255,255,255,0.08)",
  "--session-outline-disabled-bg": "rgba(255,255,255,0.03)",
  "--session-outline-disabled-border": "rgba(255,255,255,0.06)",
  "--session-outline-disabled-text": "rgba(156,163,175,0.7)",
  "--session-outline-shadow": "0 12px 26px -22px rgba(0,0,0,0.34)",
  "--session-primary-border": "rgba(52,209,122,0.24)",
  "--session-primary-shadow": "0 18px 42px -24px rgba(52,209,122,0.52)",
  "--session-primary-disabled-bg": "rgba(52,209,122,0.14)",
  "--session-primary-disabled-border": "rgba(52,209,122,0.12)",
  "--session-primary-disabled-text": "rgba(248,250,248,0.46)",
} as CSSProperties;

const PRACTICE_SESSION_THEME_LIGHT = {
  "--page-gradient": "#f3f6ef",
  "--page-overlay":
    "radial-gradient(circle at 18% 24%, rgba(34, 197, 94, 0.12), transparent 34%), radial-gradient(circle at 82% 12%, rgba(245, 158, 11, 0.08), transparent 22%), radial-gradient(circle at 50% 120%, rgba(255, 255, 255, 0.5), transparent 42%), linear-gradient(180deg, rgba(247, 249, 244, 0.94) 0%, rgba(238, 243, 234, 1) 100%)",
  "--bg-primary": "#f3f6ef",
  "--bg-secondary": "#edf2e8",
  "--bg-tertiary": "#ffffff",
  "--background": "#f3f6ef",
  "--card": "#ffffff",
  "--card-bg": "rgba(255, 255, 255, 0.88)",
  "--card-bg-solid": "#ffffff",
  "--card-bg-elevated": "rgba(255, 255, 255, 0.94)",
  "--card-bg-muted": "rgba(8, 17, 11, 0.04)",
  "--glass-bg": "rgba(255, 255, 255, 0.72)",
  "--glass-bg-strong": "rgba(255, 255, 255, 0.88)",
  "--glass-border": "rgba(8, 17, 11, 0.08)",
  "--glass-highlight": "rgba(255, 255, 255, 0.84)",
  "--foreground": "#08110b",
  "--text-primary": "#08110b",
  "--text-secondary": "#4f5b54",
  "--text-tertiary": "#6c7771",
  "--muted": "rgba(8, 17, 11, 0.04)",
  "--muted-foreground": "#5e6a63",
  "--border": "rgba(8, 17, 11, 0.08)",
  "--border-color": "rgba(8, 17, 11, 0.08)",
  "--border-soft": "rgba(8, 17, 11, 0.04)",
  "--border-strong": "rgba(8, 17, 11, 0.16)",
  "--hover-bg": "rgba(8, 17, 11, 0.04)",
  "--accent-brand": "#1f8f46",
  "--accent-brand-hover": "#18723a",
  "--accent-brand-contrast": "#f7fff8",
  "--accent-green": "#1f8f46",
  "--accent-green-soft": "rgba(31, 143, 70, 0.12)",
  "--accent-green-strong": "rgba(31, 143, 70, 0.24)",
  "--accent-red": "#d84d5e",
  "--accent-red-soft": "rgba(216, 77, 94, 0.12)",
  "--accent-red-strong": "rgba(216, 77, 94, 0.22)",
  "--accent-yellow": "#c9891d",
  "--accent-yellow-soft": "rgba(201, 137, 29, 0.12)",
  "--accent-yellow-strong": "rgba(201, 137, 29, 0.24)",
  "--accent-blue": "#1f8f46",
  "--accent-blue-soft": "rgba(31, 143, 70, 0.12)",
  "--primary": "#1f8f46",
  "--primary-soft": "rgba(31, 143, 70, 0.12)",
  "--primary-gradient": "linear-gradient(135deg, #197a3b 0%, #23a654 46%, #57d487 100%)",
  "--progress-gradient": "linear-gradient(90deg, rgba(31, 143, 70, 0.92) 0%, rgba(77, 192, 116, 1) 100%)",
  "--success-gradient": "linear-gradient(135deg, rgba(220, 247, 230, 0.98), rgba(244, 250, 246, 0.98) 62%, rgba(198, 239, 214, 0.94))",
  "--danger-gradient": "linear-gradient(135deg, rgba(255, 236, 239, 0.98), rgba(255, 247, 248, 0.98) 62%, rgba(255, 223, 228, 0.94))",
  "--warning-gradient": "linear-gradient(135deg, rgba(255, 245, 225, 0.98), rgba(255, 250, 242, 0.98) 62%, rgba(255, 235, 191, 0.94))",
  "--overlay-scrim": "rgba(255, 255, 255, 0.72)",
  "--backdrop-scrim": "rgba(8, 17, 11, 0.18)",
  "--shadow-soft": "0 18px 48px -30px rgba(8, 17, 11, 0.18), 0 10px 24px rgba(8, 17, 11, 0.08)",
  "--shadow-elevated": "0 34px 90px -42px rgba(8, 17, 11, 0.24), 0 18px 42px rgba(8, 17, 11, 0.1)",
  "--shadow-glow": "0 0 0 1px rgba(31, 143, 70, 0.16), 0 0 0 6px rgba(31, 143, 70, 0.06), 0 0 36px rgba(31, 143, 70, 0.14)",
  "--ring": "rgba(31, 143, 70, 0.28)",
  "--input": "rgba(8, 17, 11, 0.08)",
  "--session-rail-bg": "linear-gradient(180deg,rgba(255,255,255,0.92),rgba(245,248,242,0.92))",
  "--session-surface-strong": "linear-gradient(180deg,rgba(255,255,255,0.94),rgba(241,246,238,0.96))",
  "--session-option-bg": "linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,242,0.98))",
  "--session-pill-bg": "rgba(255,255,255,0.78)",
  "--session-pill-bg-strong": "rgba(247,249,244,0.92)",
  "--session-chip-strong": "rgba(255,255,255,0.7)",
  "--session-media-facts-bg": "rgba(255,255,255,0.46)",
  "--session-outline-bg": "rgba(255,255,255,0.74)",
  "--session-outline-hover-bg": "rgba(255,255,255,0.92)",
  "--session-outline-border": "rgba(8,17,11,0.08)",
  "--session-outline-disabled-bg": "rgba(255,255,255,0.52)",
  "--session-outline-disabled-border": "rgba(8,17,11,0.06)",
  "--session-outline-disabled-text": "rgba(94,106,99,0.62)",
  "--session-outline-shadow": "0 14px 28px -24px rgba(8,17,11,0.14)",
  "--session-primary-border": "rgba(15,107,51,0.26)",
  "--session-primary-shadow": "0 18px 34px -22px rgba(15,107,51,0.26)",
  "--session-primary-disabled-bg": "rgba(31,143,70,0.18)",
  "--session-primary-disabled-border": "rgba(31,143,70,0.12)",
  "--session-primary-disabled-text": "rgba(8,17,11,0.34)",
} as CSSProperties;

const FALLBACK_SCENARIO_IMAGE = "/assets/landing/hero-driver.jpg";
const RAIN_SCENARIO_IMAGE = "/assets/landing/rainy-driving.jpg";
const PRACTICE_SCENARIO_IMAGE = "/assets/landing/practice-test.jpg";

function getScenarioImage(question: PublicQuestion) {
  if (question.image_url?.trim()) {
    return question.image_url;
  }

  const text = `${question.topic ?? ""} ${question.category ?? ""} ${question.text}`.toLowerCase();

  if (/(yomg'ir|rain|nam|ho'l|sirpanchiq|fog|tuman|night|tun)/.test(text)) {
    return RAIN_SCENARIO_IMAGE;
  }

  if (/(belgi|signal|chorraha|intersection|priority|yo'l belgisi|burilish)/.test(text)) {
    return PRACTICE_SCENARIO_IMAGE;
  }

  return FALLBACK_SCENARIO_IMAGE;
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function buildScenarioTitle(question: PublicQuestion, index: number) {
  const label = question.topic?.trim() || question.category?.trim() || "Haydash vaziyati";
  return `${label} bo'yicha demo-vaziyat ${index + 1}:`;
}

function getQuestionPresentation(question: PublicQuestion, index: number) {
  const rawText = question.text.trim();

  if (/demo-vaziyat/i.test(rawText) && rawText.includes(":")) {
    const [head, ...rest] = rawText.split(":");
    const prompt = rest.join(":").trim();

    return {
      title: head.trim(),
      prompt: prompt || "Xavfsiz va to'g'ri javobni tanlang.",
    };
  }

  return {
    title: buildScenarioTitle(question, index),
    prompt: rawText,
  };
}

function optionFunctionLabel(index: number) {
  return `F${index + 1}`;
}

type ScenarioFact = {
  label: string;
  tone: "neutral" | "success" | "warning";
  icon: "rain" | "visibility" | "speed";
};

function getScenarioFacts(question: PublicQuestion): ScenarioFact[] {
  const text = `${question.topic ?? ""} ${question.category ?? ""} ${question.text}`.toLowerCase();
  const speedMatch = text.match(/\b(20|30|40|50|60|70|80|90|100)\b/);

  return [
    /(yomg'ir|rain|nam|ho'l|sirpanchiq)/.test(text)
      ? { label: "Yomg'irli yo'l", tone: "neutral", icon: "rain" }
      : /(qor|snow|muz)/.test(text)
        ? { label: "Sirpanchiq yo'l", tone: "warning", icon: "rain" }
        : { label: "Normal yo'l", tone: "neutral", icon: "rain" },
    /(tuman|fog|cheklangan|ko'rinish|qorong'u|night|tun)/.test(text)
      ? { label: "Cheklangan ko'rinish", tone: "neutral", icon: "visibility" }
      : { label: "Yaxshi ko'rinish", tone: "success", icon: "visibility" },
    {
      label: `Tezlik: ${speedMatch?.[1] ?? "60"} km/h`,
      tone: "warning",
      icon: "speed",
    },
  ];
}

function completionMessage(result: AttemptResult) {
  if (result.correct_count === result.total) {
    return "Ajoyib natija. Sessiya to'liq nazorat bilan bajarildi.";
  }
  if (result.correct_count >= Math.ceil(result.total * 0.8)) {
    return "Kuchli natija. Yana bir necha mashq bilan bu ko'nikma avtomatiklashadi.";
  }
  if (result.correct_count >= Math.ceil(result.total * 0.6)) {
    return "O'sish bor. Asosiy qoidalar va ko'rinish signallarini yanada mustahkamlang.";
  }
  return "Foydali mashq bo'ldi. Zaif joylarni qayta ko'rsangiz, keyingi urinish ancha yengil bo'ladi.";
}

function resultMap(result: AttemptResult | null) {
  return new Map((result?.answers ?? []).map((item) => [item.question_id, item]));
}

function getResolvedAnswer(
  questionId: string,
  runtimeState: QuestionRuntimeState | undefined,
  finalAnswers: Map<string, DetailedAnswer>,
) : ResolvedQuestionAnswer | null {
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

function PracticeFeedbackPanels({
  answer,
  section,
}: {
  answer: ResolvedQuestionAnswer | null;
  section: "explanation" | "analysis";
}) {
  const isExplanation = section === "explanation";
  const title = isExplanation ? "Izoh" : "Tahlil";
  const body = isExplanation ? answer?.explanation ?? "" : answer?.aiCoach?.mistake_analysis ?? "";
  const emptyText = isExplanation
    ? "Javobni tanlaganingizdan keyin izoh shu yerda ko'rinadi."
    : "Javobni tanlaganingizdan keyin AI tahlil shu yerda ko'rinadi.";

  return (
    <div
      className={cn(
        "rounded-[0.95rem] border px-3 py-2.5 shadow-[0_14px_32px_-28px_rgba(0,0,0,0.32)]",
        isExplanation
          ? "border-[rgba(94,200,255,0.18)] bg-[linear-gradient(180deg,rgba(94,200,255,0.08),rgba(255,255,255,0.02))]"
          : "border-[rgba(52,209,122,0.18)] bg-[linear-gradient(180deg,rgba(52,209,122,0.1),rgba(255,255,255,0.02))]",
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[0.78rem] font-semibold text-[var(--foreground)]">
        {isExplanation ? (
          <Eye className="h-3.5 w-3.5 text-[var(--accent-blue)]" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-[var(--accent-green)]" />
        )}
        {title}
      </div>
      <div className="subtle-scroll-area max-h-[4.8rem] overflow-y-auto pr-1 text-[0.82rem] leading-5 text-[var(--foreground)]">
        {body ? <p>{body}</p> : <p className="text-[var(--muted-foreground)]">{emptyText}</p>}
      </div>
      {isExplanation && answer?.correctAnswer ? (
        <div className="mt-1.5 rounded-[0.78rem] border border-[var(--border-soft)] bg-black/10 px-2.5 py-1.5">
          <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">To&apos;g&apos;ri javob</p>
          <p className="mt-0.5 text-[0.78rem] font-medium leading-5 text-[var(--foreground)]">{answer.correctAnswer}</p>
        </div>
      ) : null}
    </div>
  );
}

function formatCompactMetric(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function HeaderMetricPill({
  label,
  value,
  gain,
  tone,
}: {
  label: string;
  value: number;
  gain?: number;
  tone: "primary" | "warning";
}) {
  const Icon = tone === "primary" ? Sparkles : Coins;

  return (
    <div
      className={cn(
        "relative inline-flex items-center gap-1.25 overflow-hidden rounded-full border px-2 py-1 shadow-[var(--shadow-soft)] backdrop-blur-2xl",
        "border-[var(--border-color)] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))]",
        tone === "primary" && "text-[var(--accent-green)]",
        tone === "warning" && "text-[var(--accent-yellow)]",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0",
          tone === "primary" && "bg-[radial-gradient(circle_at_top,rgba(52,209,122,0.18),transparent_66%)]",
          tone === "warning" && "bg-[radial-gradient(circle_at_top,rgba(246,182,79,0.18),transparent_66%)]",
        )}
      />
      <Icon className="h-[0.68rem] w-[0.68rem]" />
      <span className="relative text-[0.78rem] font-semibold text-[var(--foreground)]">{formatCompactMetric(value)}</span>
      <span className="relative text-[8px] font-medium uppercase tracking-[0.15em] opacity-80">{label}</span>
      {gain && gain > 0 ? (
        <span className="relative rounded-full border border-[var(--border-color)] bg-[var(--session-chip-strong)] px-1.5 py-0.5 text-[8px] font-semibold text-[var(--foreground)]">
          +{gain}
        </span>
      ) : null}
    </div>
  );
}

function HeaderProgressPill({
  current,
  total,
  correct,
  wrong,
}: {
  current: number;
  total: number;
  correct: number;
  wrong: number;
}) {
  const progress = Math.min((current / Math.max(total, 1)) * 100, 100);

  return (
    <div className="relative hidden min-w-[12rem] items-center gap-2 overflow-hidden rounded-full border border-[var(--border-color)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018))] px-2.5 py-1 shadow-[var(--shadow-soft)] backdrop-blur-2xl lg:flex xl:min-w-[13.5rem]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,209,122,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
      <div className="relative min-w-[3.2rem]">
        <p className="text-[8px] font-medium uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Progress</p>
        <p className="mt-0.5 text-[0.7rem] font-semibold text-[var(--foreground)]">
          {current} / {total}
        </p>
      </div>

      <div className="relative min-w-0 flex-1">
        <div className="h-[5px] overflow-hidden rounded-full bg-white/[0.08]">
          <motion.div
            className="h-[5px] rounded-full bg-[var(--progress-gradient)] shadow-[0_0_24px_rgba(52,209,122,0.42)]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
          <motion.div
            className="pointer-events-none absolute top-0 h-[5px] w-14 rounded-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent)] opacity-80"
            animate={{ x: ["-30%", "520%"] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: "linear" }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[7px] font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
          <span>Flow</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      <div className="relative flex items-center gap-1.25 text-[8px] font-semibold">
        <span className="inline-flex items-center gap-1 text-[var(--accent-green)]">
          <Circle className="h-2 w-2 fill-current" />
          {correct}
        </span>
        <span className="inline-flex items-center gap-1 text-[var(--accent-red)]">
          <Circle className="h-2 w-2 fill-current" />
          {wrong}
        </span>
      </div>
    </div>
  );
}

function AccountChip({ user }: { user: User | null }) {
  const initials = (user?.full_name?.trim()?.[0] ?? user?.email?.[0] ?? "A").toUpperCase();
  const subtitle = user?.full_name?.trim() || user?.email || "Practice";

  return (
    <Link
      href="/profile"
      className="group relative flex items-center gap-2 overflow-hidden rounded-full border border-[var(--border-color)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-2 py-1 shadow-[var(--shadow-soft)] backdrop-blur-2xl transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.06]"
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,209,122,0.14),transparent_40%)] opacity-80" />
      <div className="relative flex h-[1.5rem] w-[1.5rem] items-center justify-center rounded-full border border-[rgba(52,209,122,0.22)] bg-[linear-gradient(180deg,rgba(52,209,122,0.22),rgba(52,209,122,0.08))] text-[0.76rem] font-bold text-[var(--foreground)] shadow-[0_0_20px_rgba(52,209,122,0.16)]">
        {initials}
      </div>
      <div className="relative hidden sm:block">
        <p className="text-[0.78rem] font-semibold leading-none text-[var(--foreground)]">AUTOTEST</p>
        <p className="mt-0.5 max-w-[8rem] truncate text-[8px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          {subtitle}
        </p>
      </div>
    </Link>
  );
}

function CompactPracticeHeader({
  user,
}: {
  user: User | null;
}) {
  return (
    <div className="flex items-center">
      <AccountChip user={user} />
    </div>
  );
}

function HeaderGlassRail({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[0.9rem] border border-[var(--border-color)] bg-[var(--session-rail-bg)] shadow-[0_10px_26px_-22px_rgba(0,0,0,0.42)] backdrop-blur-[14px]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,209,122,0.1),transparent_28%),radial-gradient(circle_at_top_right,rgba(94,200,255,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.045),transparent_22%,rgba(255,255,255,0.015)_100%)]" />
      <div className="pointer-events-none absolute inset-[1px] rounded-[calc(0.9rem-1px)] border border-white/[0.035]" />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)]" />
      <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function CompactRewardStrip({
  xpGain,
  coinGain,
}: {
  xpGain: number;
  coinGain: number;
}) {
  if (xpGain <= 0 && coinGain <= 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {xpGain > 0 ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(52,209,122,0.2)] bg-[linear-gradient(180deg,rgba(52,209,122,0.16),rgba(52,209,122,0.08))] px-2.25 py-0.9 text-[10px] font-semibold text-[var(--accent-green)] shadow-[0_0_24px_rgba(52,209,122,0.1)]">
          <Sparkles className="h-3.25 w-3.25" />
          +{xpGain} XP
        </span>
      ) : null}
      {coinGain > 0 ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(246,182,79,0.2)] bg-[linear-gradient(180deg,rgba(246,182,79,0.16),rgba(246,182,79,0.08))] px-2.25 py-0.9 text-[10px] font-semibold text-[var(--accent-yellow)] shadow-[0_0_24px_rgba(246,182,79,0.1)]">
          <Coins className="h-3.25 w-3.25" />
          +{coinGain} Coin
        </span>
      ) : null}
    </div>
  );
}

function ScenarioFactPill({ fact }: { fact: ScenarioFact }) {
  const Icon = fact.icon === "rain" ? CloudRain : fact.icon === "visibility" ? Eye : Gauge;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.25 rounded-full border px-2.25 py-0.9 text-[0.68rem] font-medium shadow-[var(--shadow-soft)] backdrop-blur-xl",
        fact.tone === "success" && "border-[rgba(52,209,122,0.22)] bg-[linear-gradient(180deg,rgba(52,209,122,0.16),rgba(52,209,122,0.08))] text-[var(--accent-green)]",
        fact.tone === "warning" && "border-[rgba(246,182,79,0.22)] bg-[linear-gradient(180deg,rgba(246,182,79,0.16),rgba(246,182,79,0.08))] text-[var(--accent-yellow)]",
        fact.tone === "neutral" &&
          "border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] text-[var(--foreground)]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {fact.label}
    </span>
  );
}

function MediaPanel({
  question,
}: {
  question: PublicQuestion;
}) {
  const scenarioFacts = getScenarioFacts(question);
  const scenarioImage = getScenarioImage(question);

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="relative"
    >
      <div className="absolute -left-6 top-6 h-28 w-28 rounded-full bg-[rgba(52,209,122,0.07)] blur-3xl" />
      <div className="absolute -bottom-8 right-0 h-32 w-32 rounded-full bg-[rgba(94,200,255,0.05)] blur-3xl" />
      <div className="relative overflow-hidden rounded-[1.45rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] shadow-[var(--shadow-elevated)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-[1px] rounded-[calc(1.45rem-1px)] border border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-10px_18px_rgba(0,0,0,0.16)]" />
        <motion.img
          src={scenarioImage}
          alt={question.text}
          className="h-[19rem] w-full object-cover brightness-100 contrast-[1.03] saturate-[1.02] md:h-[22rem] xl:h-[27rem]"
          animate={{ scale: [1.035, 1] }}
          transition={{ duration: 0.38, ease: "easeOut" }}
        />
        <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center px-3">
          <div className="flex flex-wrap items-center justify-center gap-1.25 rounded-full border border-[var(--border-color)] bg-[var(--session-media-facts-bg)] px-2.25 py-1.5 shadow-[var(--shadow-soft)] backdrop-blur-xl">
            {scenarioFacts.map((fact) => (
              <ScenarioFactPill key={`${fact.icon}-${fact.label}`} fact={fact} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ResultSummary({
  result,
  onExit,
}: {
  result: AttemptResult;
  onExit: () => void;
}) {
  const accuracy = Math.round((result.correct_count / Math.max(1, result.answered_count || result.total)) * 100);
  const completedAll = result.completed_all ?? true;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--session-surface-strong)] p-6 shadow-[var(--shadow-elevated)] backdrop-blur-2xl">
      <div className="absolute -top-24 right-0 h-52 w-52 rounded-full bg-[rgba(52,209,122,0.12)] blur-3xl" />
      <div className="absolute inset-[1px] rounded-[calc(2rem-1px)] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_22%,rgba(255,255,255,0.015)_100%)]" />
      <div className="relative">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border border-[rgba(52,209,122,0.18)] bg-[rgba(52,209,122,0.12)] text-[var(--accent-green)]">
              {completedAll ? "Sessiya yakunlandi" : "Sessiya saqlandi"}
            </Badge>
            <Badge className="border border-white/[0.08] bg-white/[0.04] text-[var(--foreground)]">
              {completionMessage(result)}
            </Badge>
            {!completedAll ? (
              <Badge className="border border-white/[0.08] bg-white/[0.04] text-[var(--muted-foreground)]">
                Faqat ko&apos;rilgan savollar hisoblandi
              </Badge>
            ) : null}
          </div>
          <h3 className="text-[2.2rem] font-semibold tracking-tight text-[var(--foreground)]">
            {result.correct_count} / {result.answered_count || result.total} to&apos;g&apos;ri
          </h3>
          <p className="max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">
            {completedAll
              ? result.pass_prediction_label ?? "Natijalar backend holatiga ko'ra yakunlandi va saqlandi."
              : "Sessiya yakunlandi. Ochilmagan savollar xato hisoblanmadi va natija faqat ko'rilgan savollar asosida saqlandi."}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[36rem]">
          <div className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.04] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Aniqlik</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{accuracy}%</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.04] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Ko&apos;rilgan</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{result.reviewed_count ?? result.total}</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.04] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Xatolar</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{result.mistakes_count}</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.04] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Mukofot</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
              +{result.reward_summary?.xp_awarded ?? 0} XP / +{result.reward_summary?.coins_awarded ?? 0} tanga
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={onExit}
          variant="outline"
          className="rounded-[1rem] border-white/[0.08] bg-white/[0.04] text-[var(--foreground)] hover:bg-white/[0.08]"
        >
          Amaliyotga qaytish
        </Button>
      </div>
      </div>
    </div>
  );
}

export function PracticeSessionExperience({
  session,
  onExit,
  onFinished,
}: {
  session: PracticeSessionPayload;
  onExit: () => void;
  onFinished?: (result: AttemptResult) => void;
}) {
  const shellUi = useShellUi();
  const { resolvedTheme } = useTheme();
  const progressSnapshot = useOptionalProgressSnapshot();
  const { user } = useUser();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionStates, setQuestionStates] = useState<Record<string, QuestionRuntimeState>>({});
  const [visitedQuestions, setVisitedQuestions] = useState<Record<string, true>>(() =>
    session.questions[0] ? { [session.questions[0].id]: true } : {},
  );
  const [remainingSeconds, setRemainingSeconds] = useState(session.durationMinutes * 60);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const questionStartedAtRef = useRef(Date.now());
  const responseTimesRef = useRef<Record<string, number>>({});
  const finishRequestRef = useRef<(timedOut?: boolean) => Promise<void>>(async () => undefined);
  const questionStepRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const currentQuestion = session.questions[currentIndex];
  const currentQuestionState = questionStates[currentQuestion.id];
  const lockedCount = Object.values(questionStates).filter((item) => item.locked).length;
  const pendingSave = Object.values(questionStates).some((item) => item.phase === "saving");
  const finalAnswerMap = useMemo(() => resultMap(result), [result]);
  const currentResolvedAnswer = getResolvedAnswer(currentQuestion.id, currentQuestionState, finalAnswerMap);

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
    if (currentQuestionState?.locked) {
      return;
    }
    questionStartedAtRef.current = Date.now();
  }, [currentIndex, currentQuestion.id, currentQuestionState?.locked]);

  useEffect(() => {
    setVisitedQuestions((previous) => (previous[currentQuestion.id] ? previous : { ...previous, [currentQuestion.id]: true }));
  }, [currentQuestion.id]);

  useEffect(() => {
    questionStepRefs.current[currentQuestion.id]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [currentQuestion.id]);

  function captureCurrentQuestionTime() {
    const elapsed = Math.max(0, Date.now() - questionStartedAtRef.current);
    responseTimesRef.current[currentQuestion.id] = (responseTimesRef.current[currentQuestion.id] ?? 0) + elapsed;
    questionStartedAtRef.current = Date.now();
  }

  async function handleFinish(timedOut = false) {
    if (result || finalizing || pendingSave) {
      return;
    }

    captureCurrentQuestionTime();
    setActionError(null);
    setFinalizing(true);
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
      setFinishModalOpen(false);
      onFinished?.(nextResult);
      void progressSnapshot?.reload();

      if (timedOut) {
        setActionError("Vaqt tugadi. Sessiya avtomatik tarzda yakunlandi.");
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Sessiyani yakunlashda xatolik yuz berdi.");
    } finally {
      setFinalizing(false);
    }
  }

  function requestFinish(timedOut = false) {
    if (result || finalizing || pendingSave) {
      return;
    }

    if (!timedOut && lockedCount < session.questions.length) {
      setFinishModalOpen(true);
      return;
    }

    void handleFinish(timedOut);
  }

  finishRequestRef.current = async (timedOut = false) => {
    await handleFinish(timedOut);
  };

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
    if (result || finalizing) {
      return;
    }

    const question = currentQuestion;
    const existingState = questionStates[question.id];
    if (existingState?.locked || existingState?.phase === "saving") {
      return;
    }

    if (!question.answer_options.find((option) => option.id === optionId)) {
      return;
    }

    const responseTime =
      responseTimesRef.current[question.id] ?? Math.max(0, Date.now() - questionStartedAtRef.current);
    responseTimesRef.current[question.id] = responseTime;

    setActionError(null);
    setQuestionStates((previous) => ({
      ...previous,
      [question.id]: {
        selectedOptionId: optionId,
        correctOptionId: null,
        isCorrect: null,
        correctAnswer: null,
        explanation: null,
        aiCoach: null,
        recommendations: [],
        locked: false,
        phase: "saving",
        reward: null,
        message: "Javob saqlanmoqda...",
      },
    }));

    try {
      const answer = await submitLockedAnswer({
        attempt_id: session.attemptId,
        question_id: question.id,
        selected_option_id: optionId,
        response_time_ms: responseTime,
      });

      const [, rewardResult] = await Promise.allSettled([
        trackAnalyticsEvent("practice_answer_submitted", {
          attempt_id: session.attemptId,
          question_id: question.id,
          selected_option_id: optionId,
          correct_option_id: answer.correct_option_id,
          is_correct: answer.is_correct,
          topic: question.topic ?? question.category ?? null,
          index: currentIndex + 1,
          total_questions: session.questions.length,
          response_time_ms: responseTime,
        }),
        rewardPracticeAnswer({
          attempt_id: session.attemptId,
          question_id: question.id,
        }),
      ]);

      const reward = rewardResult.status === "fulfilled" ? rewardResult.value : null;

      if (reward && (reward.xp_awarded > 0 || reward.coins_awarded > 0)) {
        void progressSnapshot?.reload();
      }

      setQuestionStates((previous) => ({
        ...previous,
        [question.id]: {
          selectedOptionId: answer.selected_option_id,
          correctOptionId: answer.correct_option_id,
          isCorrect: answer.is_correct,
          correctAnswer: answer.correct_answer,
          explanation: answer.explanation,
          aiCoach: answer.ai_coach,
          recommendations: answer.recommendations ?? [],
          locked: answer.locked,
          phase: "resolved",
          reward,
          message: answer.is_correct ? "To'g'ri javob." : "Xato javob.",
        },
      }));
    } catch (error) {
      setQuestionStates((previous) => {
        const nextState = { ...previous };
        delete nextState[question.id];
        return nextState;
      });
      setActionError(error instanceof Error ? error.message : "Javobni saqlab bo'lmadi.");
    }
  }, [
    currentIndex,
    currentQuestion,
    finalizing,
    progressSnapshot,
    questionStates,
    result,
    session.attemptId,
    session.questions.length,
  ]);

  function navigateTo(index: number) {
    if (!result && index !== currentIndex) {
      captureCurrentQuestionTime();
    }
    setCurrentIndex(Math.max(0, Math.min(session.questions.length - 1, index)));
  }

  function handleContinue() {
    if (currentIndex < session.questions.length - 1) {
      navigateTo(currentIndex + 1);
      return;
    }

    if (result) {
      onExit();
      return;
    }

    requestFinish(false);
  }

  const handleFunctionKeyChoice = useCallback(
    (index: number) => {
      const option = currentQuestion?.answer_options[index];
      if (!option || result || finalizing || pendingSave) {
        return;
      }
      void handleSelect(option.id);
    },
    [currentQuestion, finalizing, handleSelect, pendingSave, result],
  );

  const antiCheat = useSessionAntiCheat({
    enabled: !result,
    attemptId: session.attemptId,
    sessionLabel: "practice_session",
    onFunctionKeyChoice: handleFunctionKeyChoice,
  });

  const visitedCount = result?.reviewed_count ?? Object.keys(visitedQuestions).length;
  const answeredCount = result?.answered_count ?? lockedCount;
  const unansweredReviewedCount = result?.unanswered_count ?? Math.max(0, visitedCount - answeredCount);
  const unseenCount = Math.max(0, session.questions.length - visitedCount);
  const correctCount =
    result?.correct_count ?? Object.values(questionStates).filter((item) => item.isCorrect === true).length;
  const wrongCount =
    result?.mistakes_count ?? Object.values(questionStates).filter((item) => item.isCorrect === false).length;
  const presentation = getQuestionPresentation(currentQuestion, currentIndex);
  const primaryActionLabel = result
    ? "Amaliyotga qaytish"
    : currentIndex >= session.questions.length - 1
      ? "Sessiyani yakunlash"
      : "Keyingi savol";
  const questionHeadline = presentation.prompt || currentQuestion.text.trim();
  const rawDifficultyPercent = Number(currentQuestion.difficulty_percent ?? 0);
  const difficultyPercent = Number.isFinite(rawDifficultyPercent)
    ? Math.max(0, Math.min(100, Math.round(rawDifficultyPercent)))
    : 0;
  const difficultyTooltip = `Qiyinlik darajasi: ${difficultyPercent}%`;
  const timerIsCritical = remainingSeconds <= 60;
  const timerIsWarning = remainingSeconds > 60 && remainingSeconds <= 300;
  const xpTotal = progressSnapshot?.gamification?.xp.total_xp ?? 0;
  const coinTotal = progressSnapshot?.gamification?.coins.balance ?? 0;
  const rewardXpGain = currentQuestionState?.locked
    ? (currentQuestionState.reward?.xp_awarded ?? 0)
    : 0;
  const rewardCoinGain = currentQuestionState?.locked
    ? (currentQuestionState.reward?.coins_awarded ?? 0)
    : 0;
  const isLightTheme = resolvedTheme === "light";
  const practiceTheme = resolvedTheme === "light" ? PRACTICE_SESSION_THEME_LIGHT : PRACTICE_SESSION_THEME_DARK;
  const sessionOutlineButtonClass =
    "rounded-full border border-[var(--session-outline-border)] bg-[var(--session-outline-bg)] text-[var(--foreground)] shadow-[var(--session-outline-shadow)] hover:bg-[var(--session-outline-hover-bg)] disabled:opacity-100 disabled:border-[var(--session-outline-disabled-border)] disabled:bg-[var(--session-outline-disabled-bg)] disabled:text-[var(--session-outline-disabled-text)] disabled:shadow-none";
  const sessionPrimaryButtonClass = isLightTheme
    ? "rounded-full border border-[#22c55e] bg-[#22c55e] text-white shadow-[0_2px_8px_rgba(34,197,94,0.15)] hover:-translate-y-px hover:bg-[#16a34a] active:translate-y-0 active:shadow-[0_1px_4px_rgba(34,197,94,0.12)] disabled:opacity-100 disabled:border-[#86efac] disabled:bg-[#bbf7d0] disabled:text-white/80 disabled:shadow-none"
    : "rounded-full border border-[var(--session-primary-border)] bg-[var(--primary-gradient)] text-[var(--accent-brand-contrast)] shadow-[var(--session-primary-shadow)] hover:brightness-[1.03] disabled:opacity-100 disabled:border-[var(--session-primary-disabled-border)] disabled:bg-[var(--session-primary-disabled-bg)] disabled:text-[var(--session-primary-disabled-text)] disabled:shadow-none";
  const sessionFinishButtonClass = isLightTheme
    ? "rounded-full border border-[#e5e7eb] bg-[#ffffff] text-[#0f172a] shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:bg-[#f9fafb] disabled:opacity-100 disabled:border-[#e5e7eb] disabled:bg-[#f8fafc] disabled:text-[#94a3b8] disabled:shadow-none"
    : "rounded-full border border-[rgba(52,209,122,0.18)] bg-[var(--primary-gradient)] text-[var(--accent-brand-contrast)] shadow-[0_12px_26px_-20px_rgba(52,209,122,0.32)] hover:brightness-110 disabled:opacity-100 disabled:border-[var(--session-primary-disabled-border)] disabled:bg-[var(--session-primary-disabled-bg)] disabled:text-[var(--session-primary-disabled-text)] disabled:shadow-none";
  const primaryActionButtonClass = primaryActionLabel === "Sessiyani yakunlash" ? sessionFinishButtonClass : sessionPrimaryButtonClass;

  return (
    <div
      className="practice-session-shell relative h-[100dvh] overflow-y-auto overflow-x-hidden overscroll-contain bg-[var(--page-gradient)] text-[var(--foreground)]"
      style={practiceTheme}
    >
      <div className="pointer-events-none absolute inset-0 bg-[var(--page-overlay)]" />
      <div className="pointer-events-none absolute left-[14%] top-20 h-48 w-48 rounded-full bg-[rgba(52,209,122,0.05)] blur-3xl" />
      <div className="pointer-events-none absolute right-[10%] top-[4rem] h-40 w-40 rounded-full bg-[rgba(94,200,255,0.05)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-5%] left-1/2 h-56 w-[28rem] -translate-x-1/2 rounded-full bg-[rgba(255,255,255,0.025)] blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in_srgb,var(--border-soft)_78%,transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in_srgb,var(--border-soft)_78%,transparent) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "linear-gradient(180deg, transparent 0%, black 12%, black 84%, transparent 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04),transparent_12%,transparent_88%,rgba(255,255,255,0.03))]" />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <div className="sticky top-0 z-30 bg-[color:color-mix(in_srgb,var(--glass-bg-strong)_74%,transparent)] backdrop-blur-[14px]">
          <div className="w-full space-y-[0.18rem] px-3 py-0.75 lg:px-4.5">
            <HeaderGlassRail>
              <div className="flex min-h-[2.18rem] items-center gap-1.25 px-1.5 py-0.5">
                <div className="flex items-center gap-2">
                  <CompactPracticeHeader user={user} />
                  <div className="hidden items-center gap-1.5 md:flex">
                    <HeaderMetricPill label="XP" value={xpTotal} tone="primary" />
                    <HeaderMetricPill label="Coin" value={coinTotal} tone="warning" />
                  </div>
                </div>

                <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
                  <HeaderProgressPill
                    current={visitedCount}
                    total={session.questions.length}
                    correct={correctCount}
                    wrong={wrongCount}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <NotificationBell />
                </div>
              </div>
            </HeaderGlassRail>

            <HeaderGlassRail>
              <div className="flex min-h-[2rem] items-center gap-1 px-1.25 py-[0.22rem]">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden h-[1.72rem] w-[1.72rem] rounded-full border border-[var(--border-color)] bg-white/[0.025] text-[var(--muted-foreground)] hover:bg-white/[0.05] hover:text-[var(--foreground)] sm:inline-flex"
                  disabled={currentIndex === 0}
                  onClick={() => navigateTo(currentIndex - 1)}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>

                <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-max items-center gap-[0.34rem] px-0.5 py-[0.08rem]">
                  {session.questions.map((question, index) => {
                    const runtimeState = questionStates[question.id];
                    const resolvedAnswer = getResolvedAnswer(question.id, runtimeState, finalAnswerMap);
                    const isCurrent = index === currentIndex;
                    const isSaving = runtimeState?.phase === "saving";
                    const isCorrect = resolvedAnswer?.isCorrect === true;
                    const isWrong = resolvedAnswer?.isCorrect === false;
                    const hasResultDot = isCorrect || isWrong || isSaving;

                    return (
                      <motion.button
                        key={question.id}
                        ref={(node) => {
                          questionStepRefs.current[question.id] = node;
                        }}
                        type="button"
                        onClick={() => navigateTo(index)}
                        className={cn(
                          "relative flex h-[1.74rem] w-[1.74rem] items-center justify-center rounded-full border text-[0.69rem] font-medium transition-all duration-300",
                          "border-[var(--border-color)] bg-[var(--session-pill-bg)] text-[var(--muted-foreground)] backdrop-blur-xl",
                          (isCorrect || isWrong) && "text-[var(--foreground)]",
                          isSaving && "text-[var(--accent-green)]",
                          isCurrent &&
                            "border-[rgba(52,209,122,0.26)] bg-[linear-gradient(180deg,rgba(52,209,122,0.12),rgba(52,209,122,0.03))] text-[var(--foreground)] shadow-[0_0_0_1px_rgba(52,209,122,0.18),0_0_0_3px_rgba(52,209,122,0.045),0_0_18px_rgba(52,209,122,0.1)]",
                        )}
                        whileHover={{ y: -0.5, scale: 1.02 }}
                        whileTap={{ scale: 0.985 }}
                        animate={isCurrent ? { scale: 1.018 } : { scale: 1 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        {index + 1}
                        {hasResultDot ? (
                          <span
                            className={cn(
                              "absolute bottom-[0.12rem] left-1/2 h-[0.22rem] w-[0.22rem] -translate-x-1/2 rounded-full",
                              isCorrect && "bg-[var(--accent-green)] shadow-[0_0_8px_rgba(52,209,122,0.65)]",
                              isWrong && "bg-[var(--accent-red)] shadow-[0_0_8px_rgba(255,106,114,0.65)]",
                              isSaving && "bg-[var(--accent-yellow)] shadow-[0_0_8px_rgba(246,182,79,0.65)]",
                            )}
                          />
                        ) : null}
                      </motion.button>
                    );
                  })}
                </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden h-[1.72rem] w-[1.72rem] rounded-full border border-[var(--border-color)] bg-white/[0.025] text-[var(--muted-foreground)] hover:bg-white/[0.05] hover:text-[var(--foreground)] sm:inline-flex"
                  disabled={currentIndex >= session.questions.length - 1}
                  onClick={() => navigateTo(currentIndex + 1)}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>

                <div className="flex items-center gap-1.25">
                  <motion.div
                    className="flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-2 py-[0.3rem] shadow-[var(--shadow-soft)] backdrop-blur-xl"
                    animate={
                      timerIsCritical
                        ? { scale: [1, 1.03, 1], boxShadow: ["0 0 0 rgba(255,106,114,0)", "0 0 28px rgba(255,106,114,0.22)", "0 0 0 rgba(255,106,114,0)"] }
                        : { scale: 1 }
                    }
                    transition={timerIsCritical ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                  >
                    <Timer className="h-3 w-3 text-[var(--accent-green)]" />
                    <span
                      className={cn(
                        "text-[0.8rem] font-semibold tabular-nums",
                        timerIsCritical
                          ? "text-[var(--accent-red)]"
                          : timerIsWarning
                            ? "text-[var(--accent-yellow)]"
                            : "text-[var(--foreground)]",
                      )}
                    >
                      {formatCountdown(remainingSeconds)}
                    </span>
                  </motion.div>

                  <Button
                    className={cn(
                      "hidden h-[1.84rem] px-3.25 text-[0.72rem] font-semibold md:inline-flex",
                      sessionFinishButtonClass,
                    )}
                    disabled={finalizing || pendingSave || Boolean(result)}
                    onClick={() => requestFinish(false)}
                  >
                    {finalizing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
                    {result ? "Yakunlandi" : finalizing ? "Yuborilmoqda..." : "Sessiyani yakunlash"}
                  </Button>
                </div>
              </div>
            </HeaderGlassRail>
          </div>
        </div>

        <div className="flex-1 px-3 pb-3 pt-2.5 lg:px-5">
          <div className="mx-auto max-w-[1320px] space-y-2.5">
            {antiCheat.warning ? (
              <div className="rounded-[1.35rem] border border-[rgba(246,182,79,0.24)] bg-[linear-gradient(180deg,rgba(246,182,79,0.14),rgba(68,42,14,0.92))] px-4 py-3 text-sm text-[var(--foreground)] shadow-[0_18px_48px_-28px_rgba(246,182,79,0.3)]">
                {antiCheat.warning.message}
              </div>
            ) : null}

            {actionError ? (
              <div className="rounded-[1.35rem] border border-[rgba(255,106,114,0.2)] bg-[linear-gradient(180deg,rgba(255,106,114,0.12),rgba(46,16,22,0.9))] px-4 py-3 text-sm text-[var(--foreground)] shadow-[0_18px_48px_-28px_rgba(255,106,114,0.3)]">
                {actionError}
              </div>
            ) : null}

            {result ? <ResultSummary result={result} onExit={onExit} /> : null}

            <div
              className={cn(
                "grid gap-3 xl:grid-cols-[minmax(0,1.02fr)_minmax(430px,0.98fr)] 2xl:grid-cols-[minmax(0,0.98fr)_minmax(500px,1.02fr)] xl:items-start",
              )}
            >
              <div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="h-full"
                  >
                    <div className="relative flex min-h-[23rem] flex-col overflow-hidden rounded-[1.45rem] border border-[var(--border-color)] bg-[var(--session-surface-strong)] p-3 shadow-[var(--shadow-elevated)] backdrop-blur-2xl md:p-3.5 xl:min-h-[25.5rem]">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,209,122,0.1),transparent_30%),radial-gradient(circle_at_top_right,rgba(94,200,255,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_18%,rgba(255,255,255,0.015)_100%)]" />
                      <div className="relative flex h-full flex-col">
                        <h2 className="max-w-[38rem] text-[clamp(1.2rem,1.7vw,1.78rem)] font-semibold leading-[1.14] tracking-[-0.035em] text-[var(--foreground)]">
                          {questionHeadline}
                        </h2>
                        <button
                          type="button"
                          title={difficultyTooltip}
                          aria-label={difficultyTooltip}
                          className="group relative mt-2 inline-flex w-full max-w-[8.75rem] cursor-help flex-col rounded-full focus:outline-none"
                        >
                          <span className="block h-[3px] w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--foreground)_12%,transparent)]">
                            <span
                              className="block h-full rounded-full bg-[linear-gradient(90deg,#22c55e_0%,#facc15_62%,#ef4444_100%)] opacity-80"
                              style={{ width: `${difficultyPercent}%` }}
                            />
                          </span>
                          <span className="pointer-events-none absolute -top-7 left-0 hidden rounded-full border border-white/[0.08] bg-[rgba(10,14,19,0.94)] px-2 py-1 text-[0.65rem] font-medium text-[var(--muted-foreground)] shadow-[0_10px_24px_-18px_rgba(0,0,0,0.7)] group-hover:block group-focus:block">
                            {difficultyTooltip}
                          </span>
                        </button>
                        <div className="mt-2.5 flex-1 space-y-2">
                          {currentQuestion.answer_options.map((option, index) => {
                            const runtimeState = questionStates[currentQuestion.id];
                            const resolvedAnswer = getResolvedAnswer(currentQuestion.id, runtimeState, finalAnswerMap);
                            const isSelected =
                              runtimeState?.selectedOptionId === option.id || resolvedAnswer?.selectedOptionId === option.id;
                            const correctOptionId = resolvedAnswer?.correctOptionId ?? runtimeState?.correctOptionId ?? null;
                            const isCorrectOption = correctOptionId === option.id;
                            const isWrongSelection =
                              Boolean(resolvedAnswer || runtimeState?.locked || result) &&
                              isSelected &&
                              correctOptionId !== null &&
                              !isCorrectOption;
                            const isLockedInactive =
                              Boolean(resolvedAnswer || runtimeState?.locked || result) && !isCorrectOption && !isWrongSelection;
                            const isSaving = runtimeState?.phase === "saving" && runtimeState.selectedOptionId === option.id;
                            const isDisabled = Boolean(runtimeState?.locked || runtimeState?.phase === "saving" || result);

                            return (
                              <motion.button
                                key={option.id}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => void handleSelect(option.id)}
                                className={cn(
                                  "group relative flex min-h-[3.95rem] w-full items-center gap-2.5 overflow-hidden rounded-[1.05rem] border px-3 py-2.25 text-left shadow-[0_20px_46px_-34px_rgba(0,0,0,0.82)] backdrop-blur-xl transition-[transform,border-color,box-shadow,background] duration-300",
                                  "border-[var(--border-color)] bg-[var(--session-option-bg)]",
                                  !runtimeState?.locked &&
                                    !result &&
                                    "hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-[0_24px_54px_-34px_rgba(0,0,0,0.9),0_0_0_1px_rgba(52,209,122,0.08)]",
                                  isSelected &&
                                    !runtimeState?.locked &&
                                    !resolvedAnswer &&
                                    "border-[rgba(52,209,122,0.24)] bg-[var(--accent-green-soft)] text-[var(--foreground)] shadow-[0_0_0_1px_rgba(52,209,122,0.14),0_0_28px_rgba(52,209,122,0.12)]",
                                  isCorrectOption &&
                                    Boolean(resolvedAnswer || runtimeState?.locked || result) &&
                                    "border-[rgba(52,209,122,0.34)] bg-[var(--success-gradient)] text-[var(--foreground)] shadow-[0_0_0_1px_rgba(52,209,122,0.2),0_22px_60px_-32px_rgba(0,0,0,0.92),0_0_36px_rgba(52,209,122,0.14)]",
                                  isWrongSelection &&
                                    "border-[rgba(255,106,114,0.3)] bg-[var(--danger-gradient)] text-[var(--foreground)] shadow-[0_22px_60px_-32px_rgba(0,0,0,0.92),0_0_28px_rgba(255,106,114,0.12)]",
                                  isLockedInactive && "border-white/[0.06] bg-[rgba(255,255,255,0.02)] text-[var(--muted-foreground)]",
                                )}
                                whileHover={isDisabled ? undefined : { y: -1.5, scale: 1.002 }}
                                whileTap={isDisabled ? undefined : { scale: 0.994 }}
                                transition={{ duration: 0.22, ease: "easeOut" }}
                                >
                                  <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04),transparent_26%,transparent_74%,rgba(255,255,255,0.02))]" />
                                  <div
                                    className={cn(
                                    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[0.82rem] font-semibold transition-all duration-300",
                                    isCorrectOption &&
                                      Boolean(resolvedAnswer || runtimeState?.locked || result) &&
                                      "border-[rgba(52,209,122,0.22)] bg-[rgba(52,209,122,0.14)] text-[var(--accent-green)] shadow-[0_0_24px_rgba(52,209,122,0.16)]",
                                    isWrongSelection &&
                                      "border-[rgba(255,106,114,0.2)] bg-[rgba(255,106,114,0.12)] text-[var(--accent-red)] shadow-[0_0_24px_rgba(255,106,114,0.12)]",
                                    !isCorrectOption &&
                                      !isWrongSelection &&
                                      !isLockedInactive &&
                                      "border-white/[0.08] bg-white/[0.04] text-[var(--muted-foreground)] group-hover:border-white/[0.16] group-hover:text-[var(--foreground)]",
                                    isLockedInactive && "border-white/[0.06] bg-white/[0.03] text-[var(--muted-foreground)]/72",
                                  )}
                                >
                                  {optionFunctionLabel(index)}
                                </div>

                                <span
                                  className={cn(
                                    "relative flex-1 text-[0.92rem] font-medium leading-[1.3rem]",
                                    isCorrectOption &&
                                      Boolean(resolvedAnswer || runtimeState?.locked || result) &&
                                      "text-[var(--foreground)]",
                                    isWrongSelection && "text-[var(--foreground)]",
                                    !isCorrectOption &&
                                      !isWrongSelection &&
                                      !isLockedInactive &&
                                      "text-[var(--foreground)]",
                                    isLockedInactive && "text-[var(--muted-foreground)]",
                                  )}
                                >
                                  {option.text}
                                </span>

                                {isSaving ? (
                                  <LoaderCircle className="relative h-5 w-5 animate-spin text-[var(--accent-green)]" />
                                ) : isCorrectOption && Boolean(resolvedAnswer || runtimeState?.locked || result) ? (
                                  <div className="relative flex h-[1.9rem] w-[1.9rem] items-center justify-center rounded-full border border-[rgba(52,209,122,0.2)] bg-[rgba(52,209,122,0.14)] shadow-[0_0_24px_rgba(52,209,122,0.14)]">
                                    <Check className="h-4 w-4 text-[var(--accent-green)]" />
                                  </div>
                                ) : isWrongSelection ? (
                                  <div className="relative flex h-[1.9rem] w-[1.9rem] items-center justify-center rounded-full border border-[rgba(255,106,114,0.2)] bg-[rgba(255,106,114,0.12)] shadow-[0_0_24px_rgba(255,106,114,0.12)]">
                                    <XCircle className="h-4 w-4 text-[var(--accent-red)]" />
                                  </div>
                                ) : null}
                              </motion.button>
                            );
                          })}
                        </div>

                        <div className="mt-2.5 flex flex-col gap-2 border-t border-white/[0.06] pt-2.5 lg:flex-row lg:items-center">
                          <CompactRewardStrip xpGain={rewardXpGain} coinGain={rewardCoinGain} />
                          <div className="ml-auto flex flex-col gap-2 sm:flex-row">
                            <Button
                              variant="outline"
                              onClick={() => navigateTo(currentIndex - 1)}
                              disabled={currentIndex === 0 || pendingSave || finalizing || Boolean(result)}
                              className={cn("h-[2.5rem] px-3.5 text-[0.88rem]", sessionOutlineButtonClass)}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Avvalgi savol
                            </Button>
                            <Button
                              onClick={() => {
                                if (result) {
                                  onExit();
                                  return;
                                }
                                handleContinue();
                              }}
                              disabled={pendingSave || finalizing}
                              className={cn(
                                "h-[2.5rem] min-w-[10.75rem] px-3.5 text-[0.9rem] font-semibold",
                                primaryActionButtonClass,
                              )}
                            >
                              {finalizing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                              {primaryActionLabel}
                              {!finalizing ? <ArrowRight className="h-4 w-4" /> : null}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div>
                <MediaPanel question={currentQuestion} />
              </div>

              <div>
                <PracticeFeedbackPanels answer={currentResolvedAnswer} section="explanation" />
              </div>

              <div>
                <PracticeFeedbackPanels answer={currentResolvedAnswer} section="analysis" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={finishModalOpen}
        onClose={() => setFinishModalOpen(false)}
        title="Sessiyani yakunlash"
        className="max-w-xl overflow-hidden rounded-[1.85rem] border border-[var(--border-color)] bg-[var(--session-surface-strong)] text-[var(--foreground)] shadow-[var(--shadow-elevated)] backdrop-blur-2xl"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm leading-7 text-[var(--muted-foreground)]">
              Hozir yakunlasangiz, natija faqat ko&apos;rilgan savollar asosida saqlanadi. Ochilmagan savollar xato
              hisoblanmaydi.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.15rem] border border-white/[0.08] bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Ko&apos;rilgan</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{visitedCount}</p>
            </div>
            <div className="rounded-[1.15rem] border border-white/[0.08] bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Saqlangan</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--accent-green)]">{answeredCount}</p>
            </div>
            <div className="rounded-[1.15rem] border border-white/[0.08] bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Ochilmagan</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{unseenCount}</p>
            </div>
          </div>

          <div className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm leading-7 text-[var(--muted-foreground)]">
            <span className="font-semibold text-[var(--foreground)]">Ko&apos;rilgan, lekin javobsiz:</span> {unansweredReviewedCount}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setFinishModalOpen(false)}
              className={cn("rounded-[1rem]", sessionOutlineButtonClass)}
            >
              Testga qaytish
            </Button>
            <Button
              onClick={() => void handleFinish(false)}
              className={cn("rounded-[1rem]", sessionPrimaryButtonClass)}
            >
              Shu holatda yakunlash
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
