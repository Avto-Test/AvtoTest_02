import { cn } from "@/lib/utils";

type SurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Padding size: 'md' (24px) | 'lg' (32px) */
  padding?: "md" | "lg";
  /** Enable hover lift effect */
  hoverLift?: boolean;
  /** Reduce visual weight for secondary surfaces */
  variant?: "default" | "secondary";
};

export function Surface({
  className,
  padding = "lg",
  hoverLift = true,
  variant = "default",
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem]",
        padding === "md" && "p-6",
        padding === "lg" && "p-7 sm:p-8",
        variant === "default" &&
          "border border-[var(--border)]/40 bg-[var(--card)] shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]",
        variant === "secondary" &&
          "border border-[var(--border)]/30 bg-[color-mix(in_oklab,var(--card)_98%,var(--muted))] shadow-[0_2px_16px_-6px_rgba(15,23,42,0.06)]",
        hoverLift && "surface-hover-lift",
        className,
      )}
      {...props}
    />
  );
}
