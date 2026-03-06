import * as React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PaymentTone = "success" | "pending" | "cancel" | "info";

const toneStyles: Record<
  PaymentTone,
  {
    iconWrap: string;
    chip: string;
    border: string;
    glow: string;
  }
> = {
  success: {
    iconWrap: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30",
    chip: "bg-emerald-500/12 text-emerald-100 ring-1 ring-emerald-400/20",
    border: "border-emerald-400/25",
    glow: "from-emerald-400/20 via-cyan-400/10 to-transparent",
  },
  pending: {
    iconWrap: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/30",
    chip: "bg-sky-500/12 text-sky-100 ring-1 ring-sky-400/20",
    border: "border-sky-400/25",
    glow: "from-sky-400/20 via-cyan-400/10 to-transparent",
  },
  cancel: {
    iconWrap: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30",
    chip: "bg-rose-500/12 text-rose-100 ring-1 ring-rose-400/20",
    border: "border-rose-400/25",
    glow: "from-rose-400/18 via-orange-400/8 to-transparent",
  },
  info: {
    iconWrap: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-300/30",
    chip: "bg-amber-500/12 text-amber-100 ring-1 ring-amber-300/20",
    border: "border-amber-300/25",
    glow: "from-amber-300/18 via-sky-300/8 to-transparent",
  },
};

type PaymentStatusViewProps = {
  tone?: PaymentTone;
  badge?: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  children?: React.ReactNode;
};

export function PaymentStatusView({
  tone = "info",
  badge = "AUTOTEST Premium",
  title,
  description,
  icon,
  actions,
  meta,
  children,
}: PaymentStatusViewProps) {
  const styles = toneStyles[tone];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(140%_120%_at_10%_0%,rgba(6,182,212,0.12)_0%,rgba(11,19,36,0.94)_42%,#050816_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b blur-3xl", styles.glow)} />
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="container-app relative flex min-h-screen items-center justify-center px-4 py-10">
        <Card className={cn("w-full max-w-2xl border bg-slate-950/70 shadow-[0_30px_100px_rgba(2,6,23,0.45)] backdrop-blur-xl", styles.border)}>
          <CardHeader className="items-center px-6 pb-4 pt-8 text-center sm:px-10">
            <div className={cn("inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]", styles.chip)}>
              {badge}
            </div>
            <div className={cn("mt-5 inline-flex h-20 w-20 items-center justify-center rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]", styles.iconWrap)}>
              {icon}
            </div>
            <CardTitle className="mt-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {title}
            </CardTitle>
            <CardDescription className="max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              {description}
            </CardDescription>
            {meta ? <div className="pt-2">{meta}</div> : null}
          </CardHeader>

          <CardContent className="space-y-6 px-6 pb-8 sm:px-10">
            {children}
            {actions ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                {actions}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
