"use client";

import { ArrowRight, CheckCircle2, CircleDashed, PlayCircle, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export type PracticeLaunchTone = "primary" | "success" | "warning" | "neutral";

export type PracticeLaunchTag = {
  label: string;
  tone?: PracticeLaunchTone;
};

export type PracticeLaunchMetric = {
  label: string;
  value: string;
  tone?: Exclude<PracticeLaunchTone, "warning">;
};

export type PracticeLaunchPreviewItem = {
  label: string;
  hint: string;
  status?: "active" | "complete" | "queued";
};

type PracticeLaunchPanelProps = {
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  description: string;
  tags?: PracticeLaunchTag[];
  metrics?: PracticeLaunchMetric[];
  previewBadge?: string;
  previewTitle: string;
  previewDescription: string;
  previewItems: PracticeLaunchPreviewItem[];
  ctaLabel: string;
  helperText?: string | null;
  onStart: () => void;
  loading?: boolean;
  className?: string;
};

function toneClassName(tone: PracticeLaunchTone = "neutral") {
  return {
    primary:
      "border-[color-mix(in_srgb,var(--accent-blue)_26%,transparent)] bg-[color-mix(in_srgb,var(--accent-blue)_14%,transparent)] text-[color-mix(in_srgb,var(--text-primary)_84%,var(--accent-blue)_16%)]",
    success:
      "border-[color-mix(in_srgb,var(--accent-green)_28%,transparent)] bg-[var(--accent-green-soft)] text-[var(--accent-green)]",
    warning:
      "border-[color-mix(in_srgb,var(--accent-yellow)_28%,transparent)] bg-[var(--accent-yellow-soft)] text-[var(--accent-yellow)]",
    neutral:
      "border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--card-bg-muted)_72%,transparent)] text-[var(--text-secondary)]",
  }[tone];
}

function metricToneClassName(tone: Exclude<PracticeLaunchTone, "warning"> = "neutral") {
  return {
    primary: "text-[var(--accent-blue)]",
    success: "text-[var(--accent-green)]",
    neutral: "text-[var(--text-primary)]",
  }[tone];
}

function previewStatusClassName(status: PracticeLaunchPreviewItem["status"] = "queued") {
  return {
    active:
      "border-[color-mix(in_srgb,var(--accent-blue)_28%,transparent)] bg-[color-mix(in_srgb,var(--accent-blue-soft)_62%,var(--card-bg-elevated)_38%)]",
    complete:
      "border-[color-mix(in_srgb,var(--accent-green)_28%,transparent)] bg-[color-mix(in_srgb,var(--accent-green-soft)_58%,var(--card-bg-elevated)_42%)]",
    queued:
      "border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--card-bg-muted)_66%,var(--card-bg-elevated)_34%)]",
  }[status];
}

function previewIconClassName(status: PracticeLaunchPreviewItem["status"] = "queued") {
  return {
    active:
      "border-[color-mix(in_srgb,var(--accent-blue)_24%,transparent)] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)]",
    complete:
      "border-[color-mix(in_srgb,var(--accent-green)_24%,transparent)] bg-[var(--accent-green-soft)] text-[var(--accent-green)]",
    queued:
      "border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--card-bg-muted)_72%,transparent)] text-[var(--text-secondary)]",
  }[status];
}

export function PracticeLaunchPanel({
  eyebrow,
  title,
  subtitle,
  description,
  tags = [],
  metrics = [],
  previewBadge = "Mashq preview",
  previewTitle,
  previewDescription,
  previewItems,
  ctaLabel,
  helperText,
  onStart,
  loading = false,
  className,
}: PracticeLaunchPanelProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] border border-[color-mix(in_srgb,var(--accent-blue)_18%,var(--glass-border))] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--accent-blue)_24%,transparent),transparent_32%,color-mix(in_srgb,var(--accent-green)_12%,transparent)_100%)] p-[1px] shadow-[0_26px_70px_-42px_color-mix(in_srgb,var(--accent-blue)_42%,transparent),0_24px_44px_-34px_rgba(0,0,0,0.64)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--accent-blue)_22%,transparent),transparent_28%),radial-gradient(circle_at_bottom_left,color-mix(in_srgb,var(--accent-green)_18%,transparent),transparent_30%)] opacity-90" />

      <div className="relative overflow-hidden rounded-[calc(2rem-1px)] border border-[var(--glass-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-bg-elevated)_92%,transparent),color-mix(in_srgb,var(--card-bg)_94%,transparent))] px-5 py-5 backdrop-blur-2xl sm:px-6 sm:py-6 xl:px-7 xl:py-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,color-mix(in_srgb,var(--glass-highlight)_26%,transparent),transparent_34%),radial-gradient(circle_at_82%_18%,color-mix(in_srgb,var(--accent-blue)_16%,transparent),transparent_24%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:3rem_3rem] [mask-image:radial-gradient(circle_at_center,rgba(255,255,255,0.32),transparent_86%)]" />

        <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
          <div className="relative flex min-w-0 flex-col gap-5">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--accent-blue)_24%,var(--glass-border))] bg-[color-mix(in_srgb,var(--accent-blue-soft)_72%,var(--card-bg)_28%)] px-3 py-2 text-[0.74rem] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--text-primary)_78%,var(--accent-blue)_22%)]">
              <Sparkles className="h-4 w-4" />
              <span>{eyebrow}</span>
            </div>

            <div className="space-y-3">
              <h2 className="max-w-[12ch] font-[var(--font-display)] text-[clamp(2rem,4vw,3.15rem)] font-bold leading-[1.02] tracking-[-0.04em] text-[var(--text-primary)]">
                {title}
              </h2>
              {subtitle ? (
                <p className="text-[clamp(1rem,1.8vw,1.25rem)] font-semibold tracking-[-0.025em] text-[color-mix(in_srgb,var(--text-primary)_90%,var(--accent-blue)_10%)]">
                  {subtitle}
                </p>
              ) : null}
              <p className="max-w-[39rem] text-[0.96rem] leading-7 text-[var(--text-secondary)]">{description}</p>
            </div>

            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {tags.map((tag) => (
                  <span
                    key={`${tag.label}-${tag.tone ?? "neutral"}`}
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-2 text-[0.78rem] font-semibold leading-none",
                      toneClassName(tag.tone),
                    )}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            ) : null}

            {metrics.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {metrics.map((metric) => (
                  <div
                    key={`${metric.label}-${metric.value}`}
                    className="relative overflow-hidden rounded-[1.2rem] border border-[var(--border-soft)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-bg-elevated)_88%,transparent),color-mix(in_srgb,var(--card-bg-muted)_66%,transparent))] px-4 py-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--glass-highlight)_34%,transparent)]"
                  >
                    <span className="block text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                      {metric.label}
                    </span>
                    <strong className={cn("mt-2 block text-[1.08rem] font-bold tracking-[-0.02em]", metricToneClassName(metric.tone))}>
                      {metric.value}
                    </strong>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-auto flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={onStart}
                disabled={loading}
                className="inline-flex min-h-[3.15rem] items-center justify-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--accent-blue)_30%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent-blue)_88%,white_12%)_0%,color-mix(in_srgb,var(--accent-blue)_72%,#4f46e5_28%)_52%,color-mix(in_srgb,var(--accent-green)_18%,var(--accent-blue)_82%)_100%)] px-5 text-[0.96rem] font-semibold text-white shadow-[0_22px_38px_-24px_color-mix(in_srgb,var(--accent-blue)_72%,transparent),inset_0_1px_0_rgba(255,255,255,0.24)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_26px_42px_-24px_color-mix(in_srgb,var(--accent-blue)_76%,transparent),inset_0_1px_0_rgba(255,255,255,0.3)] disabled:cursor-progress disabled:opacity-70"
              >
                {loading ? "Yuklanmoqda..." : ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </button>

              {helperText ? (
                <p className="max-w-[24rem] text-[0.82rem] leading-6 text-[var(--text-secondary)]">{helperText}</p>
              ) : null}
            </div>
          </div>

          <div className="relative flex min-w-0 flex-col gap-4">
            <div className="relative min-h-[13rem] overflow-hidden rounded-[1.7rem] border border-[color-mix(in_srgb,var(--glass-border)_88%,transparent)] bg-[linear-gradient(145deg,rgba(9,28,54,0.98)_0%,rgba(15,23,42,0.96)_48%,rgba(13,20,34,0.94)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_26px_40px_-34px_rgba(15,23,42,0.72)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.22),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_34%)]" />
              <div className="relative inline-flex w-fit items-center rounded-full border border-[rgba(74,222,128,0.26)] bg-[rgba(16,185,129,0.16)] px-3 py-2 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-[#d1fae5]">
                {previewBadge}
              </div>

              <div
                className="relative mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3.5 py-3 backdrop-blur-xl"
                aria-hidden="true"
              >
                <span className="block h-2 w-2 rounded-full bg-[#7dd3fc] shadow-[0_0_0_5px_rgba(56,189,248,0.18)]" />
                <span className="block h-px w-11 bg-[linear-gradient(90deg,rgba(125,211,252,0.78),rgba(148,163,184,0.42))]" />
                <span className="block h-2 w-2 rounded-full bg-[rgba(148,163,184,0.78)] shadow-[0_0_0_4px_rgba(148,163,184,0.14)]" />
                <span className="block h-px w-7 bg-[linear-gradient(90deg,rgba(125,211,252,0.78),rgba(148,163,184,0.42))]" />
                <span className="block h-2 w-2 rounded-full bg-[#34d399] shadow-[0_0_0_5px_rgba(16,185,129,0.14)]" />
              </div>

              <div className="absolute inset-x-4 bottom-4 rounded-[1.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.74),rgba(15,23,42,0.82))] px-4 py-4 backdrop-blur-xl">
                <span className="block text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[rgba(191,219,254,0.82)]">
                  Session focus
                </span>
                <h3 className="mt-1.5 text-[1.08rem] font-bold tracking-[-0.02em] text-white">{previewTitle}</h3>
                <p className="mt-1.5 text-[0.82rem] leading-6 text-[rgba(226,232,240,0.8)]">{previewDescription}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {previewItems.map((item) => {
                const status = item.status ?? "queued";
                const Icon =
                  status === "complete" ? CheckCircle2 : status === "active" ? PlayCircle : CircleDashed;

                return (
                  <div
                    key={`${item.label}-${item.hint}`}
                    className={cn(
                      "flex items-start gap-3 rounded-[1.2rem] border px-4 py-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-26px_color-mix(in_srgb,var(--accent-blue)_34%,transparent)]",
                      previewStatusClassName(status),
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                        previewIconClassName(status),
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.92rem] font-bold leading-6 text-[var(--text-primary)]">{item.label}</p>
                      <p className="mt-1 text-[0.8rem] leading-6 text-[var(--text-secondary)]">{item.hint}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
