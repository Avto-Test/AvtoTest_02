import Link from "next/link";
import { Building2, Car, FileText } from "lucide-react";

import { LinkButton } from "@/landing/link-button";

const navItems = [
  { href: "#demo", label: "Demo", icon: FileText },
  { href: "#features", label: "Xususiyatlar" },
  { href: "#how-it-works", label: "Qanday ishlaydi?" },
  { href: "#b2b", label: "Tashkilotlar uchun", icon: Building2, iconClassName: "text-primary" },
  { href: "#testimonials", label: "Fikrlar" },
];

export function LandingHeader() {
  return (
    <header className="landing-navbar-glass fixed inset-x-0 top-0 z-50 border-b">
      <div className="landing-container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
            <Car className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="block text-lg font-bold tracking-tight text-foreground">AUTOTEST</span>
            <span className="hidden text-[11px] uppercase tracking-[0.24em] text-muted-foreground sm:block">
              AI Driving Prep
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {Icon ? (
                  <Icon
                    className={`h-4 w-4 transition-transform group-hover:scale-110 ${item.iconClassName ?? "text-primary"}`}
                  />
                ) : null}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LinkButton
            href="#demo"
            variant="outline"
            size="sm"
            className="rounded-full border-accent/25 bg-accent/5 px-4 text-accent hover:bg-accent/10"
          >
            Demo
          </LinkButton>
          <LinkButton
            href="/login"
            size="sm"
            className="landing-button-success hidden rounded-full px-4 sm:inline-flex"
          >
            Kirish
          </LinkButton>
          <Link
            href="/register"
            className="hidden text-sm font-medium text-foreground/88 transition-colors hover:text-foreground lg:inline-flex"
          >
            Ro&apos;yxatdan o&apos;tish
          </Link>
        </div>
      </div>
    </header>
  );
}
