import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export function Select({
  className,
  icon,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  icon?: React.ReactNode;
}) {
  return (
    <div className={cn("relative inline-flex min-w-[10rem] items-center", className)}>
      {icon ? <span className="pointer-events-none absolute left-3 text-[var(--muted-foreground)]">{icon}</span> : null}
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-xl border border-[var(--input)] bg-[var(--input)] pr-9 text-sm text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_20%,transparent)]",
          icon ? "pl-9" : "pl-3",
        )}
        {...props}
      />
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-[var(--muted-foreground)]" />
    </div>
  );
}
