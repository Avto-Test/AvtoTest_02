"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Ellipsis, LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { Button, buttonStyles } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

type AdminToolbarProps = {
  search?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

type AdminSurfaceProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

type AdminStatCardProps = {
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
  className?: string;
};

type AdminActionMenuItem = {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  tone?: "default" | "danger";
};

type AdminActionMenuProps = {
  items: AdminActionMenuItem[];
  align?: "left" | "right";
  className?: string;
};

export function AdminToolbar({ search, filters, actions, className }: AdminToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[1.25rem] border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_96%,var(--background))] p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
        {search ? <div className="min-w-0 flex-1">{search}</div> : null}
        {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminSurface({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: AdminSurfaceProps) {
  return (
    <Card className={cn("min-w-0 rounded-[1.5rem] shadow-none", className)}>
      <CardHeader className="flex flex-col gap-4 border-b border-[var(--border)]/70 pb-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
          {description ? <CardDescription className="mt-1 max-w-3xl">{description}</CardDescription> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </CardHeader>
      <CardContent className={cn("p-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function AdminStatCard({
  label,
  value,
  caption,
  icon: Icon,
  tone = "primary",
  className,
}: AdminStatCardProps) {
  const toneClasses = {
    primary: "bg-[var(--accent-green-soft)] text-[var(--accent-green)]",
    success: "bg-[var(--accent-green-soft)] text-[var(--accent-green)]",
    warning: "bg-[var(--accent-yellow-soft)] text-[var(--accent-yellow)]",
    danger: "bg-[var(--accent-red-soft)] text-[var(--accent-red)]",
    neutral: "bg-[var(--card-bg-muted)] text-[var(--foreground)]",
  };

  return (
    <Card className={cn("rounded-[1.5rem] shadow-none", className)}>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
          {caption ? <p className="mt-2 text-sm text-[var(--muted-foreground)]">{caption}</p> : null}
        </div>
        <div className={cn("rounded-2xl p-3", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminTableShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-[1.25rem] border border-[var(--border)]", className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function AdminDetailHeader({
  title,
  description,
  onBack,
  action,
  meta,
}: {
  title: string;
  description?: string;
  onBack?: () => void;
  action?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[1.5rem] border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_96%,var(--background))] p-5 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          {onBack ? (
            <Button variant="ghost" className="-ml-2 mb-3 h-8 px-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)]" onClick={onBack}>
              <ChevronLeft className="h-4 w-4" />
              Ro&apos;yxatga qaytish
            </Button>
          ) : null}
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">{description}</p> : null}
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
    </div>
  );
}

export function AdminJsonPreview({
  value,
  label = "JSON details",
}: {
  value: unknown;
  label?: string;
}) {
  return (
    <details className="group rounded-xl border border-[var(--border)] bg-[var(--muted)]/45">
      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-[var(--foreground)]">
        <span className="inline-flex items-center gap-2">
          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          {label}
        </span>
      </summary>
      <div className="border-t border-[var(--border)] px-3 py-3">
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-6 text-[var(--muted-foreground)]">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    </details>
  );
}

export function AdminActionMenu({ items, align = "right", className }: AdminActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <Button
        size="icon"
        variant="outline"
        className="h-9 w-9 rounded-xl"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="More actions"
      >
        <Ellipsis className="h-4 w-4" />
      </Button>
      {open ? (
        <div
          className={cn(
            "absolute top-[calc(100%+0.5rem)] z-20 min-w-44 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-[0_18px_36px_-18px_rgba(15,23,42,0.35)]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => {
            const itemClassName = cn(
              "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-colors",
              item.tone === "danger"
                ? "text-[var(--accent-red)] hover:bg-[var(--accent-red-soft)]"
                : "text-[var(--foreground)] hover:bg-[var(--muted)]",
              item.disabled && "pointer-events-none opacity-50",
            );

            if (item.href) {
              return (
                <Link
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                  className={itemClassName}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                className={itemClassName}
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function AdminPrimaryLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return <Link href={href} className={cn(buttonStyles({ size: "sm" }), className)}>{children}</Link>;
}
