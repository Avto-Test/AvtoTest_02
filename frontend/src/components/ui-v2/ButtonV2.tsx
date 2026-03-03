import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const buttonV2Variants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v2-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--v2-canvas)]",
  {
    variants: {
      variant: {
        primary:
          "border-[var(--v2-accent)] bg-[var(--v2-accent)] text-[var(--v2-accent-foreground)] shadow-[var(--v2-shadow-soft)] hover:opacity-90",
        secondary:
          "border-transparent bg-[var(--v2-soft)] text-[var(--v2-soft-foreground)] hover:bg-[#e9edf2]",
        outline:
          "border-[var(--v2-border)] bg-[var(--v2-surface)] text-[var(--v2-text-primary)] shadow-[var(--v2-shadow-soft)] hover:bg-[var(--v2-surface-subtle)]",
        ghost:
          "border-transparent bg-transparent text-[var(--v2-text-secondary)] hover:bg-[var(--v2-surface-subtle)] hover:text-[var(--v2-text-primary)]",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-[15px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export function ButtonV2({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonV2Variants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button-v2"
      data-variant={variant}
      data-size={size}
      className={cn(buttonV2Variants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonV2Variants };
