"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Sparkles } from "lucide-react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/i18n-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, SecondaryButton } from "@/components/ui/product-primitives";
import { useAuth } from "@/store/useAuth";

function resolveRole(pathname: string) {
  if (pathname.startsWith("/school")) {
    return {
      roleLabel: "O'quv markaz",
      homeHref: "/school/dashboard",
      description: "Maktab statistikasi",
    };
  }
  if (pathname.startsWith("/instructor")) {
    return {
      roleLabel: "Instruktor",
      homeHref: "/instructor/dashboard",
      description: "Guruh nazorati",
    };
  }
  return {
    roleLabel: "Talaba",
    homeHref: "/dashboard",
    description: "Imtihonga tayyorgarlik",
  };
}

export default function AppNavbar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { user, signOut } = useAuth();

  const roleMeta = useMemo(() => resolveRole(pathname), [pathname]);

  if (!user) {
    return null;
  }

  return (
    <header className="product-topbar">
      <div className="container-app flex h-20 items-center justify-between gap-4">
        <div className="min-w-0">
          <Link href={roleMeta.homeHref} className="inline-flex items-center gap-3">
            <div className="hidden h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#2563EB,#22C55E)] text-sm font-bold text-white shadow-[var(--shadow-soft)] sm:flex">
              AT
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {roleMeta.roleLabel}
              </p>
              <h1 className="truncate text-lg font-semibold text-foreground">
                {roleMeta.description}
              </h1>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {!user.is_premium && (
            <Button asChild size="sm" className="hidden rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 text-xs font-bold text-white shadow-lg transition-all hover:scale-105 hover:brightness-110 active:scale-95 md:flex">
              <Link href="/pricing" className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Premiumga o'ting</span>
              </Link>
            </Button>
          )}

          <div className="hidden rounded-full border border-border bg-card/90 px-3 py-2 text-sm text-muted-foreground md:flex md:items-center md:gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>AUTOTEST</span>
          </div>
          <div className="hidden sm:block">
            <LanguageSwitcher compact />
          </div>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <div className="hidden items-center gap-3 rounded-full border border-border bg-card/90 px-3 py-2 md:flex">
            <Avatar name={user.full_name || user.email} className="h-10 w-10 rounded-[14px] text-xs" />
            <div className="min-w-0">
              <p className="max-w-[180px] truncate text-sm font-medium text-foreground">
                {user.full_name || user.email}
              </p>
              <p className="max-w-[180px] truncate text-xs text-muted-foreground">{roleMeta.roleLabel}</p>
            </div>
          </div>
          <SecondaryButton type="button" className="border-border bg-card/90 text-foreground hover:bg-accent" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t("nav.sign_out", "Chiqish")}</span>
          </SecondaryButton>
        </div>
      </div>
    </header>
  );
}
