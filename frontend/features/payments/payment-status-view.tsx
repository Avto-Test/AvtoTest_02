import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const toneStyles = {
  cancel: {
    badge: "bg-rose-500/15 text-rose-700 ring-1 ring-rose-400/30",
    card: "border-rose-200/70 bg-[linear-gradient(145deg,#fff7f7,#fff1f2)]",
    icon: "bg-rose-500/12 text-rose-700",
  },
  info: {
    badge: "bg-sky-500/15 text-sky-700 ring-1 ring-sky-400/30",
    card: "border-sky-200/70 bg-[linear-gradient(145deg,#f8fcff,#eef7ff)]",
    icon: "bg-sky-500/12 text-sky-700",
  },
  pending: {
    badge: "bg-amber-500/15 text-amber-700 ring-1 ring-amber-400/30",
    card: "border-amber-200/70 bg-[linear-gradient(145deg,#fffdf6,#fff7e6)]",
    icon: "bg-amber-500/12 text-amber-700",
  },
  success: {
    badge: "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-400/30",
    card: "border-emerald-200/70 bg-[linear-gradient(145deg,#f6fffb,#ecfff6)]",
    icon: "bg-emerald-500/12 text-emerald-700",
  },
} as const;

export function PaymentStatusView({
  actions,
  badge,
  children,
  description,
  icon,
  meta,
  tone,
  title,
}: {
  actions?: ReactNode;
  badge: string;
  children?: ReactNode;
  description: string;
  icon: ReactNode;
  meta?: ReactNode;
  tone: keyof typeof toneStyles;
  title: string;
}) {
  const style = toneStyles[tone];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-12 sm:px-6">
        <div className="relative w-full overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,var(--primary)_18%,transparent),_transparent_62%)]" />
          <div className={cn("relative border-b p-8 sm:p-10", style.card)}>
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", style.badge)}>
                {badge}
              </span>
              {meta}
            </div>
            <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className={cn("flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-[1.5rem] p-4", style.icon)}>
                {icon}
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  {title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
                  {description}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-6 p-8 sm:p-10">
            {children}
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
