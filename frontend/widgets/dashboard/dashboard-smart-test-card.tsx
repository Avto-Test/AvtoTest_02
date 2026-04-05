"use client";

import { ArrowRight, Check, Lock, Sparkles, Target } from "lucide-react";

import { cn } from "@/lib/utils";

type QuestionCountOption = {
  value: 20 | 30 | 40;
  label: string;
  locked: boolean;
};

type DashboardSmartTestCardProps = {
  title?: string;
  description: string;
  selectedQuestionCount: 20 | 30 | 40;
  questionCountOptions: QuestionCountOption[];
  topic?: string | null;
  selectedTopics?: string[];
  reminderText?: string | null;
  warningText?: string | null;
  buttonLabel?: string;
  helperText?: string;
  onSelectQuestionCount: (value: 20 | 30 | 40) => void;
  onStart: () => void;
  loading?: boolean;
  className?: string;
};

export function DashboardSmartTestCard({
  title,
  description,
  selectedQuestionCount,
  questionCountOptions,
  topic,
  selectedTopics = [],
  reminderText,
  warningText,
  buttonLabel = "Mashqni boshlash",
  helperText,
  onSelectQuestionCount,
  onStart,
  loading = false,
  className,
}: DashboardSmartTestCardProps) {
  const visibleSelectedTopics = selectedTopics.slice(0, 3);
  const focusTopic = visibleSelectedTopics[0] ?? topic ?? "Bugungi mashq";
  const focusTopics = Array.from(new Set(visibleSelectedTopics.length > 0 ? visibleSelectedTopics : [focusTopic]));
  const tags = [
    topic ? { label: `Tavsiya: ${topic}`, tone: "primary" as const } : null,
    reminderText ? { label: reminderText, tone: "success" as const } : null,
    warningText ? { label: warningText, tone: "warning" as const } : null,
  ].filter(
    (
      tag,
    ): tag is {
      label: string;
      tone: "primary" | "success" | "warning";
    } => Boolean(tag),
  );
  const metrics = [
    {
      label: "Manba",
      value: "Xato + qayta ishlash",
      tone: "success" as const,
    },
  ];

  function tagClassName(tone?: "primary" | "success" | "warning" | "neutral") {
    return {
      primary: "border-emerald-400/15 bg-emerald-500/10 text-emerald-300",
      success: "border-emerald-400/20 bg-emerald-500/12 text-emerald-300",
      warning: "border-amber-400/20 bg-amber-500/10 text-amber-200",
      neutral: "border-white/10 bg-white/[0.04] text-[var(--text-secondary)]",
    }[tone ?? "neutral"];
  }

  function metricToneClassName(tone?: "primary" | "success" | "neutral") {
    return {
      primary: "text-sky-300",
      success: "text-emerald-300",
      neutral: "text-[var(--text-primary)]",
    }[tone ?? "neutral"];
  }

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.35rem] border border-[var(--border)]/56 bg-[linear-gradient(145deg,color-mix(in_oklab,var(--card)_96%,transparent),color-mix(in_oklab,var(--card)_92%,var(--accent-green-soft)_8%))] p-3.5 shadow-[0_18px_34px_-30px_rgba(0,0,0,0.46)] backdrop-blur-xl md:p-4",
        "animate-fade-in",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-500/6 blur-3xl" />
        <div className="absolute right-[12%] top-[20%] h-20 w-20 rounded-full bg-sky-400/6 blur-3xl" />
      </div>

      <div className="relative space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.8rem] bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-[0_14px_24px_-18px_rgba(16,185,129,0.46)]">
            <Target className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 space-y-1.5">
            {title ? (
              <div className="inline-flex items-center gap-1.75 rounded-full border border-emerald-500/16 bg-emerald-500/10 px-2.5 py-1">
                <Sparkles className="h-3.25 w-3.25 text-emerald-300" />
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  {title}
                </span>
              </div>
            ) : null}

            <p className="text-[0.98rem] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--text-primary)_90%,var(--accent-blue)_10%)]">
              {focusTopic}
            </p>
            <p className="max-w-[34rem] text-[0.8rem] leading-5.5 text-[var(--text-secondary)]">{description}</p>
          </div>
        </div>

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.75">
            {tags.map((tag) => (
              <span
                key={`${tag.label}-${tag.tone ?? "neutral"}`}
                className={cn(
                  "inline-flex items-center rounded-full border px-2.25 py-1 text-[0.66rem] font-semibold",
                  tagClassName(tag.tone),
                )}
              >
                {tag.label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-3">
          {questionCountOptions.map((option) => {
            const active = selectedQuestionCount === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (!option.locked) {
                    onSelectQuestionCount(option.value);
                  }
                }}
                disabled={option.locked}
                className={cn(
                  "flex min-h-[2.3rem] items-center justify-between rounded-[0.85rem] border px-3 py-1.75 text-left text-[0.78rem] font-semibold transition-colors",
                  active
                    ? "border-emerald-400/28 bg-emerald-500/12 text-[var(--text-primary)]"
                    : "border-white/7 bg-white/[0.035] text-[var(--text-primary)] hover:bg-white/[0.05]",
                  option.locked && "cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-[var(--text-secondary)]",
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span>{option.label}</span>
                  {option.locked ? <Lock className="h-3.5 w-3.5" /> : null}
                </span>
                {option.locked ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-[var(--text-tertiary)]">
                    <Lock className="h-3 w-3" />
                  </span>
                ) : active ? (
                  <Check className="h-4 w-4 text-emerald-300" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onStart}
              disabled={loading}
              className="inline-flex min-h-[2.45rem] items-center justify-center gap-2 rounded-[0.9rem] border border-emerald-400/22 bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 text-[0.86rem] font-semibold text-white shadow-[0_18px_30px_-22px_rgba(16,185,129,0.54)] transition duration-200 hover:-translate-y-0.5 hover:from-emerald-400 hover:to-emerald-600 disabled:cursor-progress disabled:opacity-70"
            >
              {loading ? "Yuklanmoqda..." : buttonLabel}
              <ArrowRight className="h-4 w-4" />
            </button>

            {helperText ? <p className="text-[0.74rem] leading-5 text-[var(--text-secondary)]">{helperText}</p> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {metrics.map((metric) => (
              <div
                key={`${metric.label}-${metric.value}`}
                className="rounded-[0.9rem] border border-white/7 bg-white/[0.035] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <span className="block text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  {metric.label}
                </span>
                <strong className={cn("mt-1 block text-[0.84rem] font-semibold tracking-[-0.02em]", metricToneClassName(metric.tone))}>
                  {metric.value}
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.75 rounded-[0.95rem] border border-white/7 bg-white/[0.03] px-3 py-2">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Fokus
          </span>
          <span className="h-3.5 w-px bg-white/8" aria-hidden="true" />
          {focusTopics.map((selectedTopic, index) => (
            <span
              key={`${selectedTopic}-${index}`}
              className={cn(
                "inline-flex items-center rounded-full border px-2.25 py-1 text-[0.68rem] font-medium",
                index === 0
                  ? "border-emerald-400/16 bg-emerald-500/10 text-emerald-300"
                  : "border-white/8 bg-white/[0.03] text-[var(--text-secondary)]",
              )}
            >
              {selectedTopic}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
