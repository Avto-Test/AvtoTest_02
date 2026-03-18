"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  indicatorClassName,
  animateOnMount = true,
}: {
  value: number;
  className?: string;
  indicatorClassName?: string;
  /** Animate from 0 to value on mount (600–900ms ease-out) */
  animateOnMount?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(animateOnMount ? 0 : value);

  useEffect(() => {
    if (!animateOnMount) return;
    setDisplayValue(Math.max(0, Math.min(100, value)));
  }, [animateOnMount, value]);

  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-[var(--muted)]", className)}>
      <div
        className={cn("h-full rounded-full bg-[var(--progress-gradient)] progress-animated", indicatorClassName)}
        style={{ width: `${displayValue}%` }}
      />
    </div>
  );
}
