'use client';

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { Bell, Search, User, Menu, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user?.full_name || user?.email?.split("@")[0] || "Guest";
  const roleLabel = user?.is_admin ? "Administrator" : user?.is_premium ? "Premium Member" : "Free Plan";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/90 px-4 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden -ml-2 rounded-full p-2 text-muted-foreground hover:bg-muted"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative hidden w-full max-w-lg md:flex">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search tests, lessons, history..."
            className="h-9 w-full rounded-full border-none bg-muted/60 pl-9 text-sm focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <LanguageSwitcher />
        <ThemeToggle />

        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-destructive" />
        </button>

        <div className="mx-1 h-6 w-px bg-border md:mx-2" />

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-full px-2 py-1 text-sm hover:bg-muted"
          >
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="mt-1 text-[10px] text-muted-foreground md:text-xs">{roleLabel}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10 md:h-9 md:w-9">
              <User className="h-4 w-4 text-primary md:h-5 md:w-5" />
            </div>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-52 rounded-lg border border-border bg-popover shadow-lg">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <div className="my-1 h-px bg-border/80" />
              <nav className="flex flex-col px-1 py-1 text-sm">
                <Link
                  href="/profile"
                  className="rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  href="/billing"
                  className="rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  Billing
                </Link>
              </nav>
              <div className="my-1 h-px bg-border/80" />
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="w-full rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
