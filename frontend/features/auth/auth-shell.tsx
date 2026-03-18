import Link from "next/link";
import { Car } from "lucide-react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthShell({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="auth-stage px-4 py-8 transition-colors duration-300 sm:px-6 sm:py-10">
      <div className="absolute right-4 top-4 z-50 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(26rem,29rem)] xl:items-center xl:gap-12">
          <div className="hidden space-y-5 xl:block">
            <Link href="/dashboard" className="auth-brand-lockup">
              <div className="auth-brand-mark">
                <Car className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Driving Prep</p>
                <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                  AUTOTEST
                </p>
              </div>
            </Link>
            <div className="max-w-xl space-y-4">
              <p className="auth-hero-kicker">Focused driving theory workspace</p>
              <h1 className="text-4xl font-bold leading-tight xl:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
                Mashq, simulyatsiya va progress bitta joyda.
              </h1>
              <p className="text-lg text-[var(--muted-foreground)]">
                Sodda, tez va tushunarli tayyorgarlik maydoni. Asosiy mashqlar va natijalar shu yerda jamlangan.
              </p>
            </div>
            <div className="grid max-w-xl gap-4 sm:grid-cols-2">
              <div className="auth-hero-card">
                <p className="text-sm text-[var(--muted-foreground)]">Aqlli mashq</p>
                <p className="mt-2 text-2xl font-bold">Practice + Simulation</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">Savollar, vaqt va natijalar bir xil oqimda yuradi.</p>
              </div>
              <div className="auth-hero-card">
                <p className="text-sm text-[var(--muted-foreground)]">Natijalar</p>
                <p className="mt-2 text-2xl font-bold">Dashboard</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">Faollik, tavsiyalar va asosiy ko&apos;rsatkichlar shu yerda ko&apos;rinadi.</p>
              </div>
            </div>
          </div>

          <div className={cn("auth-card-shell w-full max-w-[29rem] justify-self-center xl:justify-self-end", className)}>
            <div className="auth-card-inner">
              <div className="auth-card-header text-center">
                <p className="auth-card-kicker">Secure access</p>
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)] xl:hidden">
                  <Car className="h-6 w-6" />
                </div>
                <h1 className="auth-card-title">{title}</h1>
                <p className="auth-card-copy">{description}</p>
              </div>
              <div className="auth-card-body space-y-6">
                {children}
                {footer ? <div className="auth-card-footer text-center text-sm">{footer}</div> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
