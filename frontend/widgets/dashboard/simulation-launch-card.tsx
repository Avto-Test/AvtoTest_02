"use client";

import Link from "next/link";

import { Clock3, Lock, ShieldCheck, Sparkles } from "lucide-react";

import { formatSimulationCountdown, resolveSimulationTone } from "@/lib/simulation-status";
import { cn } from "@/lib/utils";
import { buttonStyles } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import type { SimulationStatus } from "@/types/analytics";

type SimulationLaunchCardProps = {
  status?: SimulationStatus | null;
  readinessScore: number;
  passProbability: number;
  passLabel: string;
  href?: string;
  onLaunch?: () => void;
  starting?: boolean;
  className?: string;
};

const RADIUS = 118;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const INNER_RADIUS = 84;
const INNER_CIRCUMFERENCE = 2 * Math.PI * INNER_RADIUS;

export function SimulationLaunchCard({
  status,
  readinessScore,
  passProbability,
  passLabel,
  href,
  onLaunch,
  starting = false,
  className,
}: SimulationLaunchCardProps) {
  const safeProgress = Math.max(0, Math.min(100, status?.cooldown_progress ?? 100));
  const readiness = Math.max(0, Math.min(100, status?.readiness_gate_score ?? readinessScore));
  const remainingRatio = Math.max(0, 1 - safeProgress / 100);
  const remainingLength = CIRCUMFERENCE * remainingRatio;
  const outerDashOffset = CIRCUMFERENCE - remainingLength;
  const sparkAngle = -90 - remainingRatio * 360;
  const innerOffset = INNER_CIRCUMFERENCE - (readiness / 100) * INNER_CIRCUMFERENCE;
  const tone = resolveSimulationTone(status);
  const countdown = formatSimulationCountdown(status?.cooldown_remaining_seconds ?? 0);
  const canLaunch = status?.launch_ready ?? false;
  const callToAction = canLaunch
    ? starting
      ? "Yuklanmoqda..."
      : "Simulyatsiyani boshlash"
    : status?.cooldown_ready
      ? "Tayyorlikni oshiring"
      : `${countdown} dan keyin ochiladi`;

  return (
    <Card className={cn("overflow-hidden", tone.surface, className)}>
      <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
            <Sparkles className="h-3.5 w-3.5" />
            Simulyatsion test
          </div>
          <div>
            <h3 className="text-3xl font-semibold tracking-tight">Imtihon tayyorgarligi</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">
              Ichki doira tayyorlikni, tashqi pilik esa navbatdagi ochilish vaqtini ko&apos;rsatadi.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Tayyorlik</p>
              <p className="mt-3 text-3xl font-semibold">{Math.round(readiness)}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">O&apos;tish ehtimoli</p>
              <p className="mt-3 text-3xl font-semibold">{Math.round(passProbability)}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Holat</p>
              <p className="mt-3 text-lg font-semibold">{canLaunch ? "Boshlash mumkin" : status?.cooldown_ready ? "Tayyorlaning" : countdown}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canLaunch ? (
              href ? (
                <Link
                  href={href}
                  className={buttonStyles({
                    className:
                      "h-12 rounded-2xl px-5 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_28px_color-mix(in_oklab,#34d399_35%,transparent)] animate-pulse",
                  })}
                >
                  <Sparkles className="h-4 w-4" />
                  {callToAction}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onLaunch}
                  disabled={starting}
                  className={buttonStyles({
                    className:
                      "h-12 rounded-2xl px-5 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_28px_color-mix(in_oklab,#34d399_35%,transparent)] animate-pulse",
                  })}
                >
                  <Sparkles className="h-4 w-4" />
                  {callToAction}
                </button>
              )
            ) : (
              <div
                className={buttonStyles({
                  className: "h-12 rounded-2xl px-5",
                  variant: "outline",
                })}
                aria-disabled="true"
              >
                <Clock3 className="h-4 w-4" />
                {callToAction}
              </div>
            )}
            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-[var(--muted-foreground)]">
              {canLaunch ? "Imtihon ochiq" : status?.cooldown_ready ? "Deyarli tayyor" : "Ochilish kutilmoqda"}
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[19rem] items-center justify-center">
          <div
            className={cn(
              "relative flex h-[18rem] w-[18rem] items-center justify-center rounded-full",
              canLaunch ? "shadow-[0_0_48px_color-mix(in_oklab,#34d399_20%,transparent)]" : "",
            )}
          >
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--background)_28%,transparent),transparent_62%)]" />
            <div className="absolute inset-1 rounded-full border border-white/10" />
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 300 300" aria-hidden="true">
              <defs>
                <linearGradient id="simulation-fuse-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fb923c" />
                  <stop offset="55%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#fde68a" />
                </linearGradient>
                <linearGradient id="simulation-progress" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7dd3fc" />
                  <stop offset="45%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
              <circle cx="150" cy="150" r={RADIUS + 4} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
              <circle cx="150" cy="150" r={RADIUS} fill="none" stroke="rgba(249,115,22,0.14)" strokeWidth="3" />
              {remainingLength > 0 ? (
                <circle
                  cx="150"
                  cy="150"
                  r={RADIUS}
                  fill="none"
                  stroke="url(#simulation-fuse-ring)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${remainingLength} ${CIRCUMFERENCE}`}
                  strokeDashoffset={outerDashOffset}
                  className="transition-all duration-1000 ease-out"
                  style={{ filter: "drop-shadow(0 0 8px rgba(249,115,22,0.68))" }}
                />
              ) : null}
              <circle cx="150" cy="150" r={INNER_RADIUS} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="16" />
              <circle
                cx="150"
                cy="150"
                r={INNER_RADIUS}
                fill="none"
                stroke="url(#simulation-progress)"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={INNER_CIRCUMFERENCE}
                strokeDashoffset={innerOffset}
                className="transition-all duration-1000"
                style={{ filter: "drop-shadow(0 0 10px rgba(56,189,248,0.45))" }}
              />
            </svg>
            <div className="absolute inset-[0.25rem]" aria-hidden="true">
              {remainingLength > 0 ? (
                <div className="absolute inset-0" style={{ transform: `rotate(${sparkAngle}deg)` }}>
                  <div className="absolute left-1/2 top-[0.1rem] h-12 w-[0.2rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-yellow-100 via-orange-400 to-orange-500 opacity-95 blur-[0.8px]" />
                  <div className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_2px_rgba(255,190,92,0.24),0_0_14px_rgba(255,149,0,1),0_0_32px_rgba(249,115,22,0.86)] animate-pulse" />
                  <div className="absolute left-[calc(50%+0.5rem)] top-[0.5rem] h-2 w-2 rounded-full bg-orange-200 opacity-85 blur-[1px] animate-pulse" />
                  <div className="absolute left-[calc(50%+0.9rem)] top-[0.95rem] h-1.5 w-1.5 rounded-full bg-orange-200 opacity-75 blur-[1px] animate-pulse" />
                </div>
              ) : null}
              <div className="absolute left-1/2 top-[-0.15rem] -translate-x-1/2 rounded-full border border-white/10 bg-[rgba(12,17,34,0.96)] p-1.5 shadow-[0_0_18px_rgba(15,23,42,0.75)]">
                <Lock className={cn("h-3.5 w-3.5 text-slate-200", canLaunch ? "animate-pulse text-cyan-200" : "")} />
              </div>
            </div>
            <div className="absolute inset-[2.45rem] rounded-full border border-white/10 bg-[color-mix(in_oklab,var(--card)_86%,transparent)] backdrop-blur">
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Tayyorlik</p>
                <p className="mt-2 text-4xl font-semibold">{Math.round(readiness)}%</p>
                <p className="mt-2 max-w-[11rem] text-sm leading-5 text-[var(--muted-foreground)]">{passLabel}</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-xs">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {canLaunch ? "Boshlash mumkin" : status?.cooldown_ready ? "Yaqin qoldi" : "Qulf ochilishi kutilmoqda"}
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,#ffffff_6%,transparent),transparent_58%)]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
