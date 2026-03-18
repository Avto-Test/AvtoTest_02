"use client";

import Link from "next/link";
import { ArrowRight, BrainCircuit, BookOpen, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonStyles } from "@/shared/ui/button";

type AIAction = {
  href: string;
  label: string;
  variant?: "default" | "outline";
  icon?: "book" | "arrow";
};

type AIFeedbackProps = {
  message: string;
  secondaryMessage: string;
  focusTopic?: string | null;
  readinessScore?: number | null;
  passProbability?: number | null;
  progressMessage?: string | null;
  readinessPrediction?: string | null;
  actions?: AIAction[];
  className?: string;
};

function ActionIcon({ icon }: { icon?: "book" | "arrow" }) {
  if (icon === "book") {
    return <BookOpen className="h-4 w-4" />;
  }
  return <ArrowRight className="h-4 w-4" />;
}

export function AIFeedback({
  message,
  secondaryMessage,
  focusTopic,
  readinessScore,
  passProbability,
  progressMessage,
  readinessPrediction,
  actions = [],
  className,
}: AIFeedbackProps) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-[var(--primary)]/16 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_7%,transparent),color-mix(in_oklab,var(--card)_98%,transparent))] p-6 shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
            <BrainCircuit className="h-3.5 w-3.5" />
            AI feedback
          </span>
          <div className="space-y-2">
            <h3 className="text-title text-xl font-semibold">{message}</h3>
            <p className="text-body max-w-2xl text-[var(--muted-foreground)]">{secondaryMessage}</p>
          </div>
          {progressMessage ? (
            <div className="rounded-[1rem] bg-[color-mix(in_oklab,var(--primary-soft)_54%,transparent)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--primary)]">{progressMessage}</p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[320px]">
          {focusTopic ? (
            <div className="rounded-[1rem] bg-[color-mix(in_oklab,var(--card)_92%,var(--muted))] px-4 py-3">
              <p className="text-caption">Fokus mavzu</p>
              <p className="mt-1 font-semibold">{focusTopic}</p>
            </div>
          ) : null}
          {typeof readinessScore === "number" ? (
            <div className="rounded-[1rem] bg-[color-mix(in_oklab,var(--card)_92%,var(--muted))] px-4 py-3">
              <p className="text-caption">Tayyorlik</p>
              <p className="mt-1 font-semibold">{Math.round(readinessScore)}%</p>
            </div>
          ) : null}
          {typeof passProbability === "number" ? (
            <div className="rounded-[1rem] bg-[color-mix(in_oklab,var(--card)_92%,var(--muted))] px-4 py-3">
              <p className="text-caption">Pass signal</p>
              <p className="mt-1 font-semibold">{Math.round(passProbability)}%</p>
            </div>
          ) : null}
        </div>
      </div>

      {readinessPrediction ? (
        <div className="mt-5 rounded-[1rem] bg-[color-mix(in_oklab,var(--accent-soft)_52%,transparent)] px-4 py-3">
          <p className="text-caption">Simulyatsiya prognozi</p>
          <p className="mt-1 font-medium">{readinessPrediction}</p>
        </div>
      ) : null}

      {actions.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {actions.map((action) => (
            <Link
              key={`${action.href}:${action.label}`}
              href={action.href}
              className={buttonStyles({
                variant: action.variant ?? "default",
                className: "rounded-xl",
              })}
            >
              <ActionIcon icon={action.icon} />
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-5 rounded-[1rem] bg-[color-mix(in_oklab,var(--primary-soft)_54%,transparent)] px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-[var(--primary)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="text-body text-[var(--foreground)]/86">
            Kichik, muntazam mashqlar eng katta o'zgarishni beradi.
          </p>
        </div>
      </div>
    </div>
  );
}
