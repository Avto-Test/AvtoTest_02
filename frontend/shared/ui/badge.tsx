import * as React from "react";

import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "secondary",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary" | "outline" | "success" | "warning";
}) {
  const styles = {
    default: "bg-[var(--accent-brand)] text-[var(--accent-brand-contrast)]",
    secondary: "bg-[var(--card-bg-muted)] text-[var(--text-primary)]",
    outline: "border border-[var(--border-color)] bg-transparent text-[var(--text-primary)]",
    success: "border border-[color-mix(in_srgb,var(--accent-green)_26%,transparent)] bg-[var(--accent-green-soft)] text-[var(--accent-green)]",
    warning: "border border-[color-mix(in_srgb,var(--accent-yellow)_26%,transparent)] bg-[var(--accent-yellow-soft)] text-[var(--accent-yellow)]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
