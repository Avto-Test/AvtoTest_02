"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { formatSimulationCountdown } from "@/lib/simulation-status";
import { clamp, cn } from "@/lib/utils";
import { buttonStyles } from "@/shared/ui/button";
import { Surface } from "@/shared/ui/surface";
import type { SimulationStatus } from "@/types/analytics";

type DashboardSimulationIndicatorProps = {
  readinessScore: number;
  status?: SimulationStatus | null;
  href: string;
  className?: string;
};

const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getReadinessLevel(score: number) {
  if (score >= 70) return "Yuqori";
  if (score >= 45) return "O'rta";
  return "Past";
}

function getStatusCopy(status: SimulationStatus | null | undefined, level: string) {
  if (status?.launch_ready) {
    return {
      badge: "Tayyor",
      description: "Simulyatsiyani boshlash mumkin.",
      buttonLabel: "Simulyatsiyani boshlash",
    };
  }
  if (status && !status.cooldown_ready) {
    return {
      badge: "Kutish",
      description: `Yangi simulyatsiya ${formatSimulationCountdown(status.cooldown_remaining_seconds)} dan keyin.`,
      buttonLabel: "Tayyorgarlikni oshirish",
    };
  }
  return {
    badge: "Qulflangan",
    description:
      level === "Past"
        ? "Tayyorgarlik hali yetarli emas."
        : "Yana biroz mashq qiling.",
    buttonLabel: "Tayyorgarlikni oshirish",
  };
}

export function DashboardSimulationIndicator({
  readinessScore,
  status,
  href,
  className,
}: DashboardSimulationIndicatorProps) {
  const progress = clamp(status?.readiness_gate_score ?? readinessScore, 0, 100);
  const readinessLevel = getReadinessLevel(progress);
  const readinessOffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;
  const copy = getStatusCopy(status, readinessLevel);

  return (
    <Surface variant="secondary" padding="lg" className={cn("h-full", className)}>
      <div className="flex flex-col items-center gap-6">
        <div className="w-full">
          <p className="text-caption font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Simulyatsiya
          </p>
          <h3 className="text-section mt-1 font-semibold">Tayyorlik</h3>
        </div>

        <div className="relative flex h-36 w-36 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120" aria-hidden>
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke="var(--muted)"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke="url(#sim-readiness)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={readinessOffset}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="sim-readiness" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-bold">{readinessLevel}</p>
            <p className="text-caption mt-0.5">{Math.round(progress)}%</p>
          </div>
        </div>

        <div className="w-full space-y-3 text-center">
          <span className="inline-flex rounded-full bg-[var(--muted)]/80 px-3 py-1 text-xs font-medium">
            {copy.badge}
          </span>
          <p className="text-caption">{copy.description}</p>
          <Link
            href={href}
            className={buttonStyles({
              variant: status?.launch_ready ? "default" : "outline",
              className: "w-full justify-center rounded-xl",
            })}
          >
            {copy.buttonLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </Surface>
  );
}
