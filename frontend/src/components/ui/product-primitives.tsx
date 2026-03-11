"use client";

import Link from "next/link";
import { memo, useMemo, type ComponentProps, type ReactNode } from "react";
import { ArrowUpRight, ChevronRight, type LucideIcon, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type ProductCardProps = ComponentProps<typeof Card>;

export function ProductCard({ className, ...props }: ProductCardProps) {
  return (
    <Card
      className={cn(
        "product-panel-card min-w-0 transition-shadow duration-200",
        className,
      )}
      {...props}
    />
  );
}

export function PageContainer({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("container-app", className)}>{children}</div>;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-[var(--space-stack)] lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="product-card-stack">
        {eyebrow ? <p className="product-meta-text">{eyebrow}</p> : null}
        <h2 className="product-section-title text-slate-950">{title}</h2>
        {description ? <p className="product-body-text max-w-2xl">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function PrimaryButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return <Button className={cn("rounded-[var(--radius-pill)] bg-[#2563EB] px-5 text-white shadow-[var(--shadow-soft)] transition-transform duration-150 hover:bg-[#1D4ED8] motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-px motion-safe:active:scale-[0.985]", className)} {...props} />;
}

export function SecondaryButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return <Button variant="outline" className={cn("rounded-[var(--radius-pill)] border-slate-200 bg-white px-5 text-slate-700 transition-transform duration-150 hover:bg-slate-50 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-px motion-safe:active:scale-[0.985]", className)} {...props} />;
}

export function ProductProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return <Progress value={value} className={cn("h-2.5 rounded-full transition-all duration-500 motion-reduce:transition-none", className)} />;
}

export function Avatar({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const normalized = (name ?? "").trim();
  const initials = normalized
    ? normalized
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("")
    : "AT";

  return (
    <div className={cn("flex h-12 w-12 items-center justify-center rounded-[var(--radius-soft)] border border-white/10 bg-[linear-gradient(135deg,rgba(37,99,235,0.95),rgba(34,197,94,0.85))] text-sm font-semibold text-white", className)}>
      {normalized ? initials : <User className="h-5 w-5" />}
    </div>
  );
}

export function StatCard({
  label,
  title,
  value,
  description,
  icon: Icon,
  footer,
  className,
}: {
  label: string;
  title?: string;
  value: ReactNode;
  description?: string;
  icon?: LucideIcon;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <ProductCard className={className}>
      <CardHeader className="gap-[var(--space-stack)] px-[var(--space-card)] pt-[var(--space-card)] pb-3">
        <div className="product-card-header">
          <div className="product-card-stack">
            <p className="product-meta-text">{label}</p>
            {title ? <CardTitle className="product-card-title text-slate-950">{title}</CardTitle> : null}
          </div>
          {Icon ? (
            <div className="product-icon-shell">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-[var(--space-card)] pb-[var(--space-card)]">
        <div className="product-display-title text-slate-950">{value}</div>
        {description ? <CardDescription className="product-body-text">{description}</CardDescription> : null}
        {footer}
      </CardContent>
    </ProductCard>
  );
}

export function ChartCard({
  eyebrow,
  title,
  description,
  children,
  action,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <ProductCard className={cn("h-full", className)}>
      <CardHeader className="gap-[var(--space-stack)] px-[var(--space-card)] pt-[var(--space-card)]">
        <div className="product-card-header">
          <div className="product-card-stack">
            <p className="product-meta-text">{eyebrow}</p>
            <CardTitle className="product-card-title text-slate-950">{title}</CardTitle>
            {description ? <CardDescription className="product-body-text">{description}</CardDescription> : null}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="px-[var(--space-card)] pb-[var(--space-card)]">{children}</CardContent>
    </ProductCard>
  );
}

export function ActionCard({
  href,
  icon: Icon,
  eyebrow,
  title,
  description,
  cta,
  meta,
  className,
}: {
  href: string;
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  cta?: string;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("group block", className)}>
      <ProductCard className="product-interactive-card h-full">
        <CardContent className="product-card-padding">
          <div className="product-card-header">
            <div className="product-card-stack">
              {eyebrow ? <p className="product-meta-text">{eyebrow}</p> : null}
              <div className="product-card-stack">
                <h3 className="product-card-title text-slate-950">{title}</h3>
                <p className="product-body-text">{description}</p>
              </div>
            </div>
            {Icon ? (
              <div className="product-icon-shell">
                <Icon className="h-5 w-5" />
              </div>
            ) : null}
          </div>
          {meta ? <div className="mt-5">{meta}</div> : null}
          <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-blue-600">
            {cta ?? "Ochish"}
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </CardContent>
      </ProductCard>
    </Link>
  );
}

export function InsightCard({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <ProductCard className={cn("h-full", className)}>
      <CardContent className="product-card-padding">
        <div className="product-card-header">
          <div className="product-card-stack">
            <p className="product-meta-text">{eyebrow}</p>
            <h3 className="product-card-title text-slate-950">{title}</h3>
            {description ? <p className="product-body-text">{description}</p> : null}
          </div>
          {action}
        </div>
        <div className="mt-[var(--space-stack)]">{children}</div>
      </CardContent>
    </ProductCard>
  );
}

const LeaderboardTableComponent = ({
  rows,
  currentUserId,
  resolveName,
}: {
  rows: Array<{ rank: number; user_id: string; xp_gained: number }>;
  currentUserId?: string;
  resolveName: (userId: string) => string;
}) => {
  const renderedRows = useMemo(() => rows.map((row) => {
    const isCurrentUser = currentUserId === row.user_id;
    return {
      ...row,
      isCurrentUser,
      label: resolveName(row.user_id),
    };
  }), [currentUserId, resolveName, rows]);

  return (
    <ProductCard className="overflow-hidden">
      <CardContent className="overflow-x-auto px-0">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100 hover:bg-transparent">
              <TableHead className="px-6 py-3 text-slate-400">{"O'rin"}</TableHead>
              <TableHead className="px-4 py-3 text-slate-400">Foydalanuvchi</TableHead>
              <TableHead className="px-6 py-3 text-right text-slate-400">XP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderedRows.map((row) => (
              <TableRow
                key={`${row.rank}-${row.user_id}`}
                className={cn(
                  "border-slate-100 hover:bg-slate-50/90",
                  row.isCurrentUser && "bg-blue-50",
                )}
              >
                <TableCell className="px-6 py-4 font-medium text-slate-950">#{row.rank}</TableCell>
                <TableCell className="px-4 py-4 text-slate-700">{row.label}</TableCell>
                <TableCell className="px-6 py-4 text-right font-semibold text-slate-950">{row.xp_gained} XP</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </ProductCard>
  );
};

export const LeaderboardTable = memo(LeaderboardTableComponent);

export function ExamQuestion({
  eyebrow,
  title,
  meta,
  children,
}: {
  eyebrow: string;
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ProductCard>
      <CardContent className="product-card-padding sm:p-7">
        <div className="product-card-header">
          <div>
            <p className="product-meta-text">{eyebrow}</p>
            <h2 className="mt-[var(--space-stack)] product-section-title text-slate-950">{title}</h2>
          </div>
          {meta}
        </div>
        <div className="mt-[var(--space-section)]">{children}</div>
      </CardContent>
    </ProductCard>
  );
}

export function ProductSkeletonCard({
  className,
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={cn("product-skeleton border border-slate-200/70 p-[var(--space-card)]", className)}>
      <div className="h-4 w-28 rounded-full bg-white/50" />
      <div className="mt-4 h-10 w-2/3 rounded-[var(--radius-soft)] bg-white/55" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-3 rounded-full bg-white/55",
              index === lines - 1 ? "w-2/3" : "w-full",
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function ProductTableSkeleton({
  rows = 5,
}: {
  rows?: number;
}) {
  return (
    <ProductCard className="overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="product-skeleton h-4 w-40" />
      </div>
      <div className="space-y-3 p-[var(--space-card)]">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="product-skeleton h-14 w-full" />
        ))}
      </div>
    </ProductCard>
  );
}

export function ProductEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="product-empty-state">
      <p className="product-empty-title">{title}</p>
      <p className="product-empty-description">{description}</p>
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function ProductErrorState({
  title,
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <ProductEmptyState
      title={title ?? "Ma'lumot topilmadi"}
      description={description ?? "Sahifa ma'lumotlarini yuklab bo'lmadi. Qayta urinib ko'ring."}
      action={action}
    />
  );
}

export function ProductMotivationPill({
  children,
  tone = "success",
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-[var(--radius-pill)] px-3 py-1.5 text-sm font-medium",
        tone === "success" && "border border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "warning" && "border border-amber-200 bg-amber-50 text-amber-700",
        tone === "neutral" && "border border-slate-200 bg-slate-100 text-slate-600",
      )}
    >
      {children}
    </span>
  );
}

export function AnswerOption({
  label,
  text,
  selected = false,
  onClick,
}: {
  label: string;
  text: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-4 rounded-[var(--radius-subcard)] border px-[var(--space-stack)] py-[var(--space-stack)] text-left transition duration-150 motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.99] hover:shadow-[var(--shadow-soft)]",
        selected
          ? "border-blue-300 bg-blue-50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-soft)] border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
        {label}
      </span>
      <span className="pt-1 text-[var(--font-body)] leading-7 text-slate-700">{text}</span>
      <ChevronRight className="ml-auto mt-1 h-4 w-4 text-slate-300" />
    </button>
  );
}
