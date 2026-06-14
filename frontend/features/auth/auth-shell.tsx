"use client";

import Link from "next/link";
import { Car, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";

function LovableThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const isLight = mounted && resolvedTheme === "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      aria-label="Toggle theme"
      className="lovable-theme-toggle group"
    >
      <Sun className="lovable-theme-icon lovable-theme-sun" />
      <Moon className="lovable-theme-icon lovable-theme-moon" />
    </button>
  );
}

export function AuthShell({
  title,
  description,
  children,
  footer,
  className,
  mode = "login",
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  mode?: AuthMode;
}) {
  const isLogin = mode === "login";

  return (
    <main className="lovable-auth-stage relative min-h-screen w-full overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0">
        <img
          src="/assets/auth/hero-night.jpg"
          alt=""
          aria-hidden="true"
          className="lovable-auth-hero lovable-auth-hero-night"
        />
        <img
          src="/assets/auth/hero-day.jpg"
          alt=""
          aria-hidden="true"
          className="lovable-auth-hero lovable-auth-hero-day"
        />
        <div className="lovable-hero-fade absolute inset-0" />
        <div className="lovable-hero-vignette absolute inset-0" />
        <div className="lovable-bg-grid absolute inset-0 opacity-60" />
      </div>

      <header className="relative z-30 flex items-center justify-between px-6 py-6 lg:px-12">
        <Link href="/" className="group flex items-center gap-3">
          <span className="lovable-brand-mark">
            <Car className="h-4 w-4 text-[var(--primary)]" />
          </span>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold tracking-[0.24em] text-[var(--foreground)]">
              AUTOTEST
            </div>
            <div className="text-[10px] tracking-[0.18em] text-[var(--muted-foreground)]">
              AI-POWERED DRIVING EDUCATION
            </div>
          </div>
        </Link>
        <LovableThemeToggle />
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-180px)] w-full max-w-[1600px] grid-cols-1 items-center px-6 pb-16 lg:px-12">
        <div className="relative flex w-full justify-center lg:justify-start">
          <div className={cn("lovable-glass-panel w-full max-w-[420px] rounded-[28px] p-8 sm:p-10", className)}>
            <div className="relative mb-7 grid grid-cols-2 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--background)_40%,transparent)] p-1 text-sm">
              <span
                className={cn(
                  "absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-[color-mix(in_oklab,var(--primary)_15%,transparent)] ring-1 ring-[color-mix(in_oklab,var(--primary)_30%,transparent)] transition-all duration-300 ease-out",
                  isLogin ? "left-1" : "left-[calc(50%+0px)]",
                )}
              />
              <Link
                href="/login"
                className={cn(
                  "relative z-10 flex h-9 items-center justify-center rounded-full font-medium transition",
                  isLogin ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                )}
              >
                Kirish
              </Link>
              <Link
                href="/register"
                className={cn(
                  "relative z-10 flex h-9 items-center justify-center rounded-full font-medium transition",
                  !isLogin ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                )}
              >
                Ro&apos;yxat
              </Link>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-normal text-[var(--foreground)]">
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
                {description}
              </p>
            </div>

            {children}

            <p className="mt-7 text-center text-sm text-[var(--muted-foreground)]">
              {isLogin ? "Hisobingiz yo'qmi? " : "Hisobingiz bormi? "}
              <Link
                href={isLogin ? "/register" : "/login"}
                className="font-medium text-[var(--foreground)] underline-offset-4 hover:underline"
              >
                {isLogin ? "Ro'yxatdan o'tish" : "Kirish"}
              </Link>
            </p>

            {footer ? <div className="mt-4 text-center text-sm text-[var(--muted-foreground)]">{footer}</div> : null}
          </div>
        </div>
      </section>

      <footer className="relative z-10 flex items-center justify-between px-6 pb-6 text-[11px] tracking-[0.18em] text-[var(--muted-foreground)] lg:px-12">
        <span>© {new Date().getFullYear()} AUTOTEST</span>
        <span className="hidden sm:inline">SECURE · ENCRYPTED · v1.0</span>
      </footer>
    </main>
  );
}
