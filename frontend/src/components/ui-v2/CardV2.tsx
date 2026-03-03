import * as React from "react";
import { cn } from "@/lib/utils";

export function CardV2({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-v2"
      className={cn(
        "rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface)] shadow-[var(--v2-shadow-soft)]",
        className
      )}
      {...props}
    />
  );
}
