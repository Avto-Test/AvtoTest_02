import * as React from "react";
import { cn } from "@/lib/utils";
import { CardV2 } from "./CardV2";

interface SectionWrapperV2Props extends React.ComponentProps<"section"> {
  label?: string;
  title?: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  contentClassName?: string;
}

export function SectionWrapperV2({
  label,
  title,
  description,
  badge,
  actions,
  className,
  contentClassName,
  children,
  ...props
}: SectionWrapperV2Props) {
  return (
    <section className={cn("space-y-6", className)} {...props}>
      {(label || title || description || badge || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            {label && <p className="text-xs uppercase tracking-wide text-[var(--v2-text-tertiary)]">{label}</p>}
            {(title || badge) && (
              <div className="flex items-center gap-2">
                {title && <h2 className="text-sm font-medium text-[var(--v2-text-primary)]">{title}</h2>}
                {badge}
              </div>
            )}
            {description && <p className="text-sm text-[var(--v2-text-secondary)]">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}

      <CardV2 className={cn("p-6 md:p-7", contentClassName)}>{children}</CardV2>
    </section>
  );
}
