"use client";

import { ArrowRight, CircleDashed, PlayCircle, Sparkles, Target } from "lucide-react";

import { cn } from "@/lib/utils";

type DashboardSmartTestCardProps = {
  title: string;
  description: string;
  topic?: string | null;
  selectedTopics?: string[];
  reminderText?: string | null;
  warningText?: string | null;
  buttonLabel?: string;
  helperText?: string;
  onStart: () => void;
  loading?: boolean;
  className?: string;
};

export function DashboardSmartTestCard({
  title,
  description,
  topic,
  selectedTopics = [],
  reminderText,
  warningText,
  buttonLabel = "Mashqni boshlash",
  helperText,
  onStart,
  loading = false,
  className,
}: DashboardSmartTestCardProps) {
  const visibleSelectedTopics = selectedTopics.slice(0, 3);
  const focusTopic = visibleSelectedTopics[0] ?? topic ?? "Adaptive focus";
  const tags = [
    topic ? { label: `Tavsiya: ${topic}`, tone: "primary" as const } : null,
    reminderText ? { label: reminderText, tone: "success" as const } : null,
    warningText ? { label: warningText, tone: "warning" as const } : null,
  ].filter(Boolean);
  const metrics = [
    {
      label: "Rejim",
      value: visibleSelectedTopics.length > 0 ? "Focused" : "Adaptive",
      tone: "primary",
    },
    {
      label: "Fokus",
      value: visibleSelectedTopics.length > 0 ? `${visibleSelectedTopics.length} mavzu` : topic ? "1 mavzu" : "Auto",
      tone: "neutral",
    },
    {
      label: "AI Coach",
      value: "Tayyor",
      tone: "success",
    },
  ];
  const previewItems =
    visibleSelectedTopics.length > 0
      ? visibleSelectedTopics.map((selectedTopic, index) => ({
          label: selectedTopic,
          hint:
            index === 0
              ? "Sessiya shu mavzudan boshlanadi va savollar adaptiv ravishda chuqurlashadi."
              : "Zaif joylarni mustahkamlash uchun qo'shimcha savollar qo'shiladi.",
          status: index === 0 ? "active" : "queued",
        }))
      : [
          {
            label: "Rasmli va matnli savollar",
            hint: "Bir xil zonalar fokusni buzmasdan savollarni ketma-ket ko'rsatadi.",
            status: "active",
          },
          {
            label: "AI Coach tushuntirishi",
            hint: "Har javobdan keyin sabab va amaliy haydash tavsiyasi chiqadi.",
            status: "queued",
          },
          {
            label: "XP va coin reward",
            hint: "To'g'ri javoblar mikro-reward bilan darhol ko'rsatiladi.",
            status: "queued",
          },
        ];
  const compactPreviewItems = previewItems.slice(0, 2);
  const previewTitle = focusTopic;
  const previewDescription =
    helperText ?? "Savollar AI Coach feedback va reward oqimi bilan izchil ravishda ochiladi.";

  function tagClassName(tone?: "primary" | "success" | "warning" | "neutral") {
    return {
      primary:
        "border-emerald-400/15 bg-emerald-500/10 text-emerald-300",
      success:
        "border-emerald-400/20 bg-emerald-500/12 text-emerald-300",
      warning:
        "border-amber-400/20 bg-amber-500/10 text-amber-200",
      neutral:
        "border-white/10 bg-white/[0.04] text-[var(--text-secondary)]",
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
        "relative overflow-hidden rounded-[1.45rem] border border-[var(--border)]/58 bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-emerald-950/16 p-4 shadow-[0_20px_42px_-34px_rgba(0,0,0,0.54)] backdrop-blur-xl md:p-[1.15rem]",
        "animate-fade-in",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-500/7 blur-3xl" />
        <div className="absolute right-[10%] top-[16%] h-24 w-24 rounded-full bg-sky-400/7 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-full w-[42%] opacity-10">
          <svg className="h-full w-full" viewBox="0 0 400 320" aria-hidden="true">
            <path
              d="M390 320 Q 334 262, 286 214 T 202 128 T 116 42"
              fill="none"
              stroke="currentColor"
              strokeWidth="46"
              className="text-white/8"
            />
            <path
              d="M390 320 Q 334 262, 286 214 T 202 128 T 116 42"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="14 16"
              className="text-white/22"
            />
          </svg>
        </div>
      </div>

      <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(15.75rem,19rem)]">
        <div className="min-w-0 space-y-3">
          <div className="inline-flex items-center gap-1.75 rounded-full border border-emerald-500/16 bg-emerald-500/10 px-2.75 py-1.25">
            <Sparkles className="h-3.25 w-3.25 text-emerald-300" />
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Mashqni boshlash
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-[0.85rem] bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-[0_14px_24px_-18px_rgba(16,185,129,0.46)]">
                <Target className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="max-w-[13ch] font-[var(--font-display)] text-[clamp(1.35rem,2.3vw,1.95rem)] font-bold leading-[1] tracking-[-0.04em] text-[var(--text-primary)]">
                  {title}
                </h2>
                <p className="mt-1.5 text-[0.84rem] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--text-primary)_86%,var(--accent-blue)_14%)]">
                  {`${focusTopic} uchun tayyorlangan oqim`}
                </p>
              </div>
            </div>

            <p className="max-w-[36rem] text-[0.84rem] leading-6 text-[var(--text-secondary)]">{description}</p>
          </div>

          {tags.length > 0 || visibleSelectedTopics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={`${tag.label}-${tag.tone ?? "neutral"}`}
                  className={cn("inline-flex items-center rounded-full border px-2.25 py-1 text-[0.68rem] font-semibold", tagClassName(tag.tone))}
                >
                  {tag.label}
                </span>
              ))}
              {visibleSelectedTopics.map((selectedTopic) => (
                <span
                  key={selectedTopic}
                  className={cn("inline-flex items-center rounded-full border px-2.25 py-1 text-[0.68rem] font-semibold", tagClassName("neutral"))}
                >
                  {selectedTopic}
                </span>
              ))}
              {selectedTopics.length > visibleSelectedTopics.length ? (
                <span className={cn("inline-flex items-center rounded-full border px-2.25 py-1 text-[0.68rem] font-semibold", tagClassName("neutral"))}>
                  {`+${selectedTopics.length - visibleSelectedTopics.length} mavzu`}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
            <button
              type="button"
              onClick={onStart}
              disabled={loading}
              className="inline-flex min-h-[2.55rem] items-center justify-center gap-2 rounded-[0.95rem] border border-emerald-400/22 bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 text-[0.88rem] font-semibold text-white shadow-[0_18px_30px_-22px_rgba(16,185,129,0.54)] transition duration-200 hover:-translate-y-0.5 hover:from-emerald-400 hover:to-emerald-600 disabled:cursor-progress disabled:opacity-70"
            >
              {loading ? "Yuklanmoqda..." : buttonLabel}
              <ArrowRight className="h-4 w-4" />
            </button>

            {helperText ? (
              <p className="max-w-[21rem] text-[0.76rem] leading-5 text-[var(--text-secondary)]">{helperText}</p>
            ) : null}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div
                key={`${metric.label}-${metric.value}`}
                className="rounded-[0.95rem] border border-white/7 bg-white/[0.035] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <span className="block text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  {metric.label}
                </span>
                <strong className={cn("mt-1.5 block text-[0.94rem] font-bold tracking-[-0.02em]", metricToneClassName(metric.tone))}>
                  {metric.value}
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="relative overflow-hidden rounded-[1.25rem] border border-white/8 bg-[linear-gradient(145deg,rgba(10,28,50,0.94)_0%,rgba(14,21,36,0.96)_52%,rgba(11,18,29,0.94)_100%)] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_30px_-28px_rgba(15,23,42,0.76)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_34%)]" />

            <div className="relative inline-flex w-fit items-center rounded-full border border-emerald-400/18 bg-emerald-500/12 px-2.75 py-1.25 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-emerald-200">
              Practice Preview
            </div>

            <div
              className="relative mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.05] px-2.75 py-1.5"
              aria-hidden="true"
            >
              <span className="block h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_0_4px_rgba(125,211,252,0.14)]" />
              <span className="block h-px w-7 bg-[linear-gradient(90deg,rgba(125,211,252,0.78),rgba(148,163,184,0.42))]" />
              <span className="block h-2 w-2 rounded-full bg-white/45 shadow-[0_0_0_4px_rgba(255,255,255,0.08)]" />
              <span className="block h-px w-4 bg-[linear-gradient(90deg,rgba(125,211,252,0.78),rgba(148,163,184,0.42))]" />
              <span className="block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]" />
            </div>

            <div className="relative mt-2.5 rounded-[1rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(15,23,42,0.82))] px-3.5 py-3 backdrop-blur-xl">
              <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-sky-100/70">
                Session focus
              </span>
              <h3 className="mt-1.5 text-[0.94rem] font-bold tracking-[-0.02em] text-white">{previewTitle}</h3>
              <p className="mt-1 text-[0.76rem] leading-5 text-slate-200/76">
                {previewDescription}
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            {compactPreviewItems.map((item) => {
              const Icon = item.status === "active" ? PlayCircle : CircleDashed;

              return (
                <div
                  key={`${item.label}-${item.hint}`}
                  className="flex items-start gap-2.5 rounded-[0.95rem] border border-white/7 bg-white/[0.035] px-3 py-2.75 transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.05]"
                >
                  <div className="flex h-[1.625rem] w-[1.625rem] shrink-0 items-center justify-center rounded-full border border-emerald-400/16 bg-emerald-500/10 text-emerald-300">
                    <Icon className="h-3.25 w-3.25" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.82rem] font-semibold text-[var(--text-primary)]">{item.label}</p>
                    <p className="mt-0.5 text-[0.74rem] leading-5 text-[var(--text-secondary)]">{item.hint}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
