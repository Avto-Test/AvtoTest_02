"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const sectionTransition = {
  duration: 0.42,
  ease: "easeOut" as const,
};

const hoverLift = {
  y: -4,
  scale: 1.01,
  transition: {
    duration: 0.18,
    ease: "easeOut" as const,
  },
};

export function confidenceToneClass(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized === "high") {
    return "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
  }
  if (normalized === "medium") {
    return "border-amber-500/30 bg-amber-500/15 text-amber-100";
  }
  return "border-rose-500/30 bg-rose-500/15 text-rose-100";
}

type AnimatedNumberProps = {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
};

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: AnimatedNumberProps) {
  const shouldReduceMotion = useReducedMotion();
  const initialValue = shouldReduceMotion ? value : 0;
  const valueRef = useRef(initialValue);
  const [displayValue, setDisplayValue] = useState(initialValue);

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const controls = animate(valueRef.current, value, {
      duration: 0.55,
      ease: "easeOut",
      onUpdate: (latest) => {
        valueRef.current = latest;
        setDisplayValue(latest);
      },
    });

    return () => {
      controls.stop();
    };
  }, [shouldReduceMotion, value]);

  return (
    <span className={className}>
      {prefix}
      {(shouldReduceMotion ? value : displayValue).toLocaleString("uz-UZ", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

export function IntelligenceAnimatedProgress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const initialValue = shouldReduceMotion ? value : 0;
  const progressRef = useRef(initialValue);
  const [displayValue, setDisplayValue] = useState(initialValue);

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const controls = animate(progressRef.current, value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (latest) => {
        progressRef.current = latest;
        setDisplayValue(latest);
      },
    });

    return () => {
      controls.stop();
    };
  }, [shouldReduceMotion, value]);

  return <Progress className={className} value={shouldReduceMotion ? value : displayValue} />;
}

type IntelligenceHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  badgeLabel?: string;
  actions?: ReactNode;
  children?: ReactNode;
  accent?: string;
};

export function IntelligenceHero({
  eyebrow,
  title,
  description,
  badge,
  badgeLabel = "Asosiy signal",
  actions,
  children,
  accent,
}: IntelligenceHeroProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : hoverLift}
      transition={sectionTransition}
      className="intelligence-hero"
      style={
        accent
          ? ({
              ["--intelligence-accent" as string]: accent,
            } as CSSProperties)
          : undefined
      }
    >
      <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
        <div className="space-y-4">
          <Badge className="w-fit rounded-full border-white/20 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/80">
            {eyebrow}
          </Badge>
          <div className="space-y-3">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-white/72 sm:text-base">
              {description}
            </p>
          </div>
          {actions ? (
            <div className="flex flex-wrap gap-3">
              {actions}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          {badge ? (
            <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">
                {badgeLabel}
              </p>
              <p className="mt-2 text-lg font-medium text-white">
                {badge}
              </p>
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </motion.section>
  );
}

type IntelligenceMetricCardProps = {
  eyebrow: string;
  title: string;
  value?: string;
  description: string;
  icon: LucideIcon;
  tone?: "neutral" | "success" | "warning" | "danger";
  trailing?: ReactNode;
  delay?: number;
  numericValue?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
};

export function IntelligenceMetricCard({
  eyebrow,
  title,
  value,
  description,
  icon: Icon,
  tone = "neutral",
  trailing,
  delay = 0,
  numericValue,
  decimals = 0,
  prefix,
  suffix,
}: IntelligenceMetricCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const toneClass =
    tone === "success"
      ? "from-emerald-500/18 via-emerald-400/10 to-transparent"
      : tone === "warning"
        ? "from-amber-500/18 via-amber-400/10 to-transparent"
        : tone === "danger"
          ? "from-rose-500/18 via-rose-400/10 to-transparent"
          : "from-sky-500/18 via-cyan-400/10 to-transparent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : hoverLift}
      transition={{ ...sectionTransition, delay }}
    >
      <Card className="intelligence-panel overflow-hidden">
        <div className={cn("absolute inset-x-0 top-0 h-24 bg-gradient-to-br", toneClass)} />
        <CardHeader className="relative pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="intelligence-eyebrow">{eyebrow}</p>
              <CardTitle className="mt-2 text-lg">{title}</CardTitle>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/90 backdrop-blur">
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-4xl font-semibold tracking-[-0.04em] text-white">
                {typeof numericValue === "number" ? (
                  <AnimatedNumber
                    value={numericValue}
                    decimals={decimals}
                    prefix={prefix}
                    suffix={suffix}
                  />
                ) : (
                  value
                )}
              </p>
              <CardDescription className="mt-2 max-w-sm text-sm text-white/68">
                {description}
              </CardDescription>
            </div>
            {trailing}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

type IntelligencePanelProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function IntelligencePanel({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  delay = 0,
}: IntelligencePanelProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : hoverLift}
      transition={{ ...sectionTransition, delay }}
      className={className}
    >
      <Card className="intelligence-panel h-full">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="intelligence-eyebrow">{eyebrow}</p>
              <CardTitle className="text-xl">{title}</CardTitle>
              {description ? (
                <CardDescription className="max-w-2xl text-sm text-white/66">
                  {description}
                </CardDescription>
              ) : null}
            </div>
            {action}
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

type IntelligenceActionButtonProps = {
  href: string;
  label: string;
  secondary?: boolean;
};

export function IntelligenceActionButton({
  href,
  label,
  secondary = false,
}: IntelligenceActionButtonProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.01 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      <Button
        variant={secondary ? "secondary" : "default"}
        asChild
        className={cn(
          "rounded-full px-5",
          secondary
            ? "bg-white/10 text-white hover:bg-white/15"
            : "bg-white text-slate-950 hover:bg-white/90",
        )}
      >
        <Link href={href}>
          {label}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </Button>
    </motion.div>
  );
}

type IntelligenceSectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  badge?: string;
  action?: ReactNode;
};

export function IntelligenceSectionHeader({
  eyebrow,
  title,
  description,
  badge,
  action,
}: IntelligenceSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        <p className="intelligence-eyebrow">{eyebrow}</p>
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-white/62 sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {badge ? (
          <span className="intelligence-pill border-cyan-400/18 bg-cyan-400/8 text-cyan-50">
            {badge}
          </span>
        ) : null}
        {action}
      </div>
    </div>
  );
}

type IntelligenceMiniMetricProps = {
  label: string;
  value: ReactNode;
  description?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
};

export function IntelligenceMiniMetric({
  label,
  value,
  description,
  tone = "neutral",
}: IntelligenceMiniMetricProps) {
  const toneClass =
    tone === "success"
      ? "border-emerald-400/18 bg-emerald-400/8"
      : tone === "warning"
        ? "border-amber-400/18 bg-amber-400/8"
        : tone === "danger"
          ? "border-rose-400/18 bg-rose-400/8"
          : "border-white/10 bg-white/6";

  return (
    <div className={cn("rounded-[1.35rem] border p-4", toneClass)}>
      <p className="intelligence-eyebrow">{label}</p>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
        {value}
      </div>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-white/60">
          {description}
        </p>
      ) : null}
    </div>
  );
}

type EmptyIntelligenceStateProps = {
  title: string;
  description: string;
};

export function EmptyIntelligenceState({
  title,
  description,
}: EmptyIntelligenceStateProps) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/12 bg-white/4 px-6 text-center">
      <h3 className="text-lg font-medium text-white">{title}</h3>
      <p className="mt-3 max-w-md text-sm leading-6 text-white/62">{description}</p>
    </div>
  );
}

export function IntelligenceLoadingSkeleton() {
  return (
    <div className="intelligence-page">
      <div className="container-app space-y-6 py-8 sm:py-10">
        <div className="intelligence-hero min-h-64 animate-pulse" />
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="intelligence-panel h-72 animate-pulse" />
          <div className="intelligence-panel h-72 animate-pulse" />
          <div className="intelligence-panel h-80 animate-pulse" />
          <div className="intelligence-panel h-80 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
