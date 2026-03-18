"use client";

import { useEffect, useId, useState } from "react";

import { cn } from "@/lib/utils";

type ReadinessRingProps = {
  value: number;
  title?: string;
  description?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

const FULL_CIRCLE = Math.PI * 2;

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function toneMeta(value: number) {
  if (value >= 70) {
    return {
      label: "Yuqori",
      from: "var(--accent-green)",
      to: "color-mix(in oklab, var(--accent-green) 62%, var(--glass-highlight) 38%)",
      track: "color-mix(in oklab, var(--accent-green) 16%, transparent)",
      badgeClassName: "bg-[var(--accent-green-soft)] text-[var(--accent-green)]",
    };
  }

  if (value >= 45) {
    return {
      label: "O'rta",
      from: "var(--accent-yellow)",
      to: "color-mix(in oklab, var(--accent-yellow) 58%, var(--glass-highlight) 42%)",
      track: "color-mix(in oklab, var(--accent-yellow) 16%, transparent)",
      badgeClassName: "bg-[var(--accent-yellow-soft)] text-[var(--accent-yellow)]",
    };
  }

  return {
    label: "Past",
    from: "var(--accent-red)",
    to: "color-mix(in oklab, var(--accent-red) 58%, var(--glass-highlight) 42%)",
    track: "color-mix(in oklab, var(--accent-red) 16%, transparent)",
    badgeClassName: "bg-[var(--accent-red-soft)] text-[var(--accent-red)]",
  };
}

export function ReadinessRing({
  value,
  title = "Imtihonga tayyorlik",
  description,
  size = 196,
  strokeWidth = 16,
  className,
}: ReadinessRingProps) {
  const gradientId = useId();
  const targetValue = clamp(value);
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      setAnimatedValue(0);
      secondFrame = window.requestAnimationFrame(() => setAnimatedValue(targetValue));
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [targetValue]);

  const radius = (size - strokeWidth) / 2;
  const circumference = FULL_CIRCLE * radius;
  const progressOffset = circumference - ((circumference * animatedValue) / 100);
  const tone = toneMeta(targetValue);

  return (
    <div className={cn("flex flex-col items-center gap-4 text-center", className)}>
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 overflow-visible"
          aria-hidden
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: tone.from }} />
              <stop offset="100%" style={{ stopColor: tone.to }} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={tone.track}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            style={{ transition: "stroke-dashoffset 800ms ease-out" }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
          <p className="text-caption text-[11px] font-semibold uppercase tracking-[0.2em]">
            {title}
          </p>
          <p className="mt-2 text-[2.4rem] font-semibold tracking-tight">
            {Math.round(animatedValue)}%
          </p>
          <span
            className={cn(
              "mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold",
              tone.badgeClassName,
            )}
          >
            {tone.label}
          </span>
        </div>
      </div>

      {description ? (
        <p className="text-body max-w-sm text-[var(--muted-foreground)]">{description}</p>
      ) : null}
    </div>
  );
}
