import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-[var(--accent-brand)] text-[var(--accent-brand-contrast)] hover:bg-[var(--accent-brand-hover)] shadow-[var(--shadow-soft)]",
  outline:
    "border border-[var(--border-color)] bg-[var(--card-bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)]",
  ghost:
    "bg-transparent text-[var(--text-primary)] hover:bg-[var(--hover-bg)]",
  secondary:
    "bg-[var(--card-bg-muted)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)]",
  destructive:
    "bg-[var(--accent-red)] text-[var(--destructive-foreground)] hover:bg-[color-mix(in_srgb,var(--accent-red)_88%,black)]",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3 py-1.5 text-sm",
  lg: "h-11 px-5 py-2.5",
  icon: "h-10 w-10",
};

export function buttonStyles({
  className,
  variant = "default",
  size = "default",
}: {
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50",
    variant === "default" && "active:scale-[0.98]",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={buttonStyles({ className, variant, size })}
      {...props}
    />
  ),
);

Button.displayName = "Button";
