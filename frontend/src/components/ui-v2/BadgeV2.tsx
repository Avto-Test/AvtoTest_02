import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeV2Variants = cva(
  "inline-flex items-center rounded-2xl border px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "border-[var(--v2-border)] bg-[var(--v2-surface-subtle)] text-[var(--v2-text-secondary)]",
        success: "border-transparent bg-[var(--v2-success-bg)] text-[var(--v2-success)]",
        warning: "border-transparent bg-[var(--v2-warning-bg)] text-[var(--v2-warning)]",
        danger: "border-transparent bg-[var(--v2-danger-bg)] text-[var(--v2-danger)]",
        info: "border-transparent bg-[var(--v2-info-bg)] text-[var(--v2-info)]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export function BadgeV2({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeV2Variants>) {
  return (
    <span
      data-slot="badge-v2"
      data-variant={variant}
      className={cn(badgeV2Variants({ variant }), className)}
      {...props}
    />
  );
}

export { badgeV2Variants };
