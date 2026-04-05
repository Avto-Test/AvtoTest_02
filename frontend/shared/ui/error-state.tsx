import Link from "next/link";
import { Compass, RotateCw, Sparkles, TriangleAlert } from "lucide-react";

import { resolveUserFacingNotice } from "@/lib/user-facing-messages";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

export function ErrorState({
  title = "Ma'lumot yuklanmadi",
  description,
  error,
  onRetry,
  action,
}: {
  title?: string;
  description: string;
  error?: unknown;
  onRetry?: () => void;
  action?: React.ReactNode;
}) {
  const notice = resolveUserFacingNotice(error ?? description, {
    title,
    description,
  });
  const isWarning = notice.tone === "warning";

  return (
    <div
      className={`rounded-[1.5rem] border p-5 shadow-[var(--shadow-soft)] ${
        isWarning
          ? "border-[color-mix(in_srgb,var(--accent-yellow)_24%,transparent)] bg-[var(--warning-gradient)]"
          : "border-[color-mix(in_srgb,var(--accent-blue)_22%,transparent)] bg-[color-mix(in_srgb,var(--card-bg-elevated)_92%,var(--accent-blue-soft)_8%)]"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            isWarning
              ? "theme-status-warning"
              : "border border-[color-mix(in_srgb,var(--accent-blue)_20%,transparent)] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)]"
          }`}
        >
          {isWarning ? <TriangleAlert className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={isWarning ? "warning" : "success"}>{notice.badge}</Badge>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {notice.title}
            </h3>
          </div>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            {notice.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {onRetry ? (
              <Button variant="outline" onClick={onRetry}>
                <RotateCw className="h-4 w-4" />
                Qayta tekshirish
              </Button>
            ) : null}
            {action}
            {notice.actionHref && notice.actionLabel ? (
              <Link href={notice.actionHref}>
                <Button variant={isWarning ? "default" : "secondary"}>
                  <Compass className="h-4 w-4" />
                  {notice.actionLabel}
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
