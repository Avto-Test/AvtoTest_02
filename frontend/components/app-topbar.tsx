"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Coins, Flame, LayoutDashboard, LogOut, Menu, Search, Settings2, Shield, Sparkles, Trophy, UserRound } from "lucide-react";
import { type CSSProperties, type MouseEvent, useEffect, useRef, useState } from "react";

import { useProgressSnapshot } from "@/components/providers/progress-provider";
import { useExperimentVariant } from "@/components/providers/experiment-provider";
import { useUser } from "@/hooks/use-user";
import { trackEvent } from "@/lib/analytics";
import { getUpgradeButtonLabel, UPGRADE_BUTTON_EXPERIMENT } from "@/lib/experiments";
import { isSuperAdmin } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { formatSimulationCountdown } from "@/lib/simulation-status";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import type { User } from "@/types/user";

const PREMIUM_CTA_NAVIGATION_DELAY_MS = 430;

function MetricChip({
  icon: Icon,
  label,
  value,
  numericValue,
  deltaLabel,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
  numericValue?: number;
  deltaLabel?: string;
}) {
  const [burst, setBurst] = useState(false);
  const [rewardDelta, setRewardDelta] = useState<string | null>(null);
  const previousValue = useRef(value);
  const previousNumericValue = useRef<number | undefined>(numericValue);
  const initialized = useRef(false);

  useEffect(() => {
    if (previousValue.current === value) return;
    previousValue.current = value;
    const frame = window.requestAnimationFrame(() => setBurst(true));
    const t = window.setTimeout(() => setBurst(false), 600);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(t);
    };
  }, [value]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      previousNumericValue.current = numericValue;
      return;
    }
    if (typeof numericValue !== "number" || typeof previousNumericValue.current !== "number") {
      previousNumericValue.current = numericValue;
      return;
    }
    const delta = numericValue - previousNumericValue.current;
    previousNumericValue.current = numericValue;
    if (delta <= 0 || !deltaLabel) return;
    const frame = window.requestAnimationFrame(() => setRewardDelta(`+${delta} ${deltaLabel}`));
    const t = window.setTimeout(() => setRewardDelta(null), 1600);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(t);
    };
  }, [deltaLabel, numericValue]);

  return (
    <div
      className={`relative flex items-center gap-2 rounded-[1rem] bg-[color-mix(in_oklab,var(--card)_66%,transparent)] px-2.5 py-1.5 backdrop-blur-sm transition-transform duration-200 ${
        burst ? "scale-[1.02]" : ""
      }`}
    >
      {rewardDelta ? (
        <span className="reward-float pointer-events-none absolute -right-1 -top-1 rounded-full bg-[var(--accent-brand)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--accent-brand-contrast)]">
          {rewardDelta}
        </span>
      ) : null}
      <div className="flex h-7 w-7 items-center justify-center rounded-[0.8rem] bg-[var(--primary-soft)]">
        <Icon className="h-3.5 w-3.5 text-[var(--primary)]" />
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{label}</p>
        <p className="text-[0.92rem] font-semibold leading-tight">{value}</p>
      </div>
    </div>
  );
}

function PremiumCtaWord({ label }: { label: string }) {
  return Array.from(label).map((letter, index) => (
    <span
      key={`${letter}-${index}`}
      className="premium-cta-letter"
      style={{ "--premium-cta-letter-order": index } as CSSProperties}
    >
      {letter}
    </span>
  ));
}

function PremiumAction({ isPremium }: { isPremium: boolean }) {
  const router = useRouter();
  const variant = useExperimentVariant(UPGRADE_BUTTON_EXPERIMENT, "A");
  const upgradeLabel = getUpgradeButtonLabel(variant);
  const label = isPremium ? "Premium" : upgradeLabel;
  const [isLaunching, setIsLaunching] = useState(false);
  const navigationTimer = useRef<number | null>(null);

  useEffect(() => {
    if (isPremium) return;
    void router.prefetch("/upgrade");
  }, [isPremium, router]);

  useEffect(() => {
    return () => {
      if (navigationTimer.current) {
        window.clearTimeout(navigationTimer.current);
      }
    };
  }, []);

  function handleUpgradeClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      isLaunching ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    setIsLaunching(true);
    void trackEvent("premium_click", {
      source: "app_topbar",
      cta_label: upgradeLabel,
    });

    navigationTimer.current = window.setTimeout(() => {
      navigationTimer.current = null;
      router.push("/upgrade");
    }, PREMIUM_CTA_NAVIGATION_DELAY_MS);
  }

  const content = (
    <>
      <svg className="premium-cta-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
        />
      </svg>
      <span className="premium-cta-text" aria-hidden="true">
        <span className="premium-cta-word premium-cta-word-primary">
          <PremiumCtaWord label={label} />
        </span>
        <span className="premium-cta-word premium-cta-word-secondary">
          <PremiumCtaWord label={label} />
        </span>
      </span>
    </>
  );

  if (isPremium) {
    return (
      <div className={cn("premium-cta premium-cta-status hidden sm:inline-flex")} role="status" aria-label="Premium faol">
        {content}
      </div>
    );
  }

  return (
    <Link
      href="/upgrade"
      className={cn("premium-cta premium-cta-upgrade hidden sm:inline-flex", isLaunching && "premium-cta-arming")}
      aria-label={upgradeLabel}
      aria-disabled={isLaunching}
      onClick={handleUpgradeClick}
    >
      {content}
    </Link>
  );
}

function getUserDisplayName(user: User) {
  const fullName = user.full_name?.trim();
  if (fullName) {
    return fullName;
  }
  return user.email.split("@")[0] || "Foydalanuvchi";
}

function getUserInitials(user: User) {
  const source = getUserDisplayName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return source || "AU";
}

function ProfileMenu({
  user,
  membershipLabel,
  onLogout,
  upgradeActionLabel,
}: {
  user: User;
  membershipLabel: string;
  onLogout: () => void;
  upgradeActionLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);
  const quickActions = [
    {
      href: "/profile",
      label: "Profil",
      description: "Shaxsiy ma'lumotlar va kabinet",
      icon: UserRound,
    },
    {
      href: "/settings",
      label: "Sozlamalar",
      description: "Tema, bildirishnoma va hisob",
      icon: Settings2,
    },
    {
      href: isSuperAdmin(user) ? "/admin" : "/dashboard",
      label: isSuperAdmin(user) ? "Admin" : "Dashboard",
      description: isSuperAdmin(user) ? "Boshqaruv paneli" : "Asosiy panelga qaytish",
      icon: isSuperAdmin(user) ? Shield : LayoutDashboard,
    },
    {
      href: "/upgrade",
      label: user.is_premium ? "Premium" : upgradeActionLabel,
      description: user.is_premium ? "Tarif va imkoniyatlarni ko'rish" : "Premium imkoniyatlarni ochish",
      icon: Sparkles,
    },
  ];

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent | globalThis.MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <motion.button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        whileHover={{ y: -1, scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="group relative flex h-9 w-9 items-center justify-center rounded-[0.95rem]"
      >
        <span className="absolute inset-0 rounded-[0.95rem] bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--accent-yellow)_36%,transparent),transparent_55%),radial-gradient(circle_at_bottom_right,color-mix(in_srgb,var(--accent-blue)_28%,transparent),transparent_52%),linear-gradient(135deg,var(--bg-tertiary),var(--bg-secondary))] shadow-[var(--shadow-soft)] transition-all duration-300 group-hover:shadow-[var(--shadow-elevated)]" />
        <span className="absolute inset-[1px] rounded-[0.9rem] border border-[var(--glass-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent-yellow)_68%,var(--glass-bg-strong)),color-mix(in_srgb,var(--accent-green)_48%,var(--glass-bg-strong))_48%,color-mix(in_srgb,var(--accent-blue)_58%,var(--glass-bg-strong)))] shadow-[inset_0_1px_0_var(--glass-highlight)] transition-transform duration-300 group-hover:scale-[0.98]" />
        <span className="relative flex h-7 w-7 items-center justify-center rounded-[0.78rem] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--glass-highlight)_28%,transparent),color-mix(in_srgb,var(--glass-bg)_82%,transparent))] text-[0.68rem] font-bold tracking-[0.08em] text-[var(--text-primary)]">
          {initials}
        </span>
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[22rem]"
          >
            <div className="rounded-[1.65rem] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-3 shadow-[var(--shadow-elevated)] backdrop-blur-2xl">
              <div className="flex items-center rounded-[1.35rem] border border-[var(--border-soft)] bg-[var(--card-bg)] p-3 shadow-[inset_0_1px_0_var(--glass-highlight)]">
                <motion.section
                  whileHover={{ scale: 1.07, rotate: -3 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent-yellow),var(--accent-green),var(--accent-blue))] shadow-[var(--shadow-soft)]"
                >
                  <span className="text-sm font-bold tracking-[0.08em] text-[var(--text-primary)]">{initials}</span>
                </motion.section>

                <section className="ml-3 min-w-0 border-l border-[var(--border-soft)] pl-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{displayName}</h3>
                    <h4 className="bg-[linear-gradient(135deg,var(--accent-blue),var(--accent-green),var(--accent-yellow))] bg-clip-text text-lg font-bold text-transparent">
                      {membershipLabel}
                    </h4>
                    <p className="truncate text-xs text-[var(--text-secondary)]">{user.email}</p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <motion.div key={action.href} whileHover={{ scale: 1.12, y: -1 }} whileTap={{ scale: 0.97 }}>
                          <Link
                            href={action.href}
                            onClick={() => setOpen(false)}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] transition-colors duration-200 hover:border-[color-mix(in_srgb,var(--accent-blue)_24%,transparent)] hover:text-[var(--accent-blue)]"
                            aria-label={action.label}
                          >
                            <Icon className="h-4 w-4" />
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className="mt-3 space-y-2">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <motion.div
                      key={`${action.href}-${index}`}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04, duration: 0.18, ease: "easeOut" }}
                    >
                      <Link
                        href={action.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between rounded-[1.1rem] border border-[var(--border-soft)] bg-[var(--card-bg)] px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent-blue)_22%,transparent)] hover:bg-[var(--hover-bg)]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] border border-[var(--border-soft)] bg-[var(--card-bg-muted)] text-[var(--accent-blue)]">
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{action.label}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{action.description}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Open</span>
                      </Link>
                    </motion.div>
                  );
                })}

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => {
                    setOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center justify-between rounded-[1.1rem] border border-[color-mix(in_srgb,var(--accent-red)_22%,transparent)] bg-[var(--accent-red-soft)] px-4 py-3 text-left transition-all duration-200 hover:border-[color-mix(in_srgb,var(--accent-red)_32%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent-red-soft)_86%,var(--card-bg)_14%)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] border border-[color-mix(in_srgb,var(--accent-red)_22%,transparent)] bg-[var(--accent-red-soft)] text-[var(--accent-red)]">
                      <LogOut className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--accent-red)]">Hisobdan chiqish</p>
                      <p className="text-xs text-[var(--text-secondary)]">Sessiyani yopish va login oynasiga qaytish</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-red)]">Exit</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function AppTopbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { user, logout, loading: authLoading, error: authError, sessionPresent } = useUser();
  const { gamification } = useProgressSnapshot();
  const upgradeVariant = useExperimentVariant(UPGRADE_BUTTON_EXPERIMENT, "A");
  const pathname = usePathname();
  const [searchFocused, setSearchFocused] = useState(false);
  const isPremiumUser = Boolean(user?.is_premium);
  const upgradeActionLabel = getUpgradeButtonLabel(upgradeVariant);
  const showLevelPanel = Boolean(user) && pathname !== "/simulation";
  const showSessionFallback = !user && (authLoading || sessionPresent || Boolean(authError));

  const levelLabel = gamification ? `Lvl ${gamification.xp.level}` : "--";
  const xpLabel = gamification ? `${gamification.xp.total_xp} XP` : "--";
  const coinLabel = gamification ? `${gamification.coins.balance}` : "--";
  const streakLabel = gamification ? `${gamification.streak.current_streak}` : "--";
  const activeBoost = gamification?.active_xp_boost ?? null;
  const membershipLabel = isSuperAdmin(user) ? "Administrator" : isPremiumUser ? "Premium" : "Bepul";

  return (
    <header className="sticky top-0 z-20 overflow-visible border-b border-[var(--border)]/60 bg-[color-mix(in_oklab,var(--background)_88%,transparent)] backdrop-blur-lg">
      <div
        className={cn(
          "relative px-4 pt-2 sm:px-5 lg:px-7",
          showLevelPanel ? "pb-10 sm:pb-11 lg:pb-[3.05rem]" : "pb-1",
        )}
      >
        <div className="flex flex-wrap items-center gap-2.5 xl:flex-nowrap">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="icon" className="-ml-1 h-8 w-8 shrink-0 lg:hidden" onClick={onMenuToggle}>
              <Menu className="h-5 w-5" />
            </Button>

            {user ? (
              <div className="flex max-w-full flex-wrap gap-1.5">
                <MetricChip icon={Sparkles} label="XP" value={xpLabel} numericValue={gamification?.xp.total_xp} deltaLabel="XP" />
                <MetricChip icon={Coins} label="Coin" value={coinLabel} numericValue={gamification?.coins.balance} deltaLabel="coin" />
                <MetricChip icon={Flame} label="Seriya" value={streakLabel} numericValue={gamification?.streak.current_streak} />
                <MetricChip icon={Trophy} label="Level" value={levelLabel} numericValue={gamification?.xp.level} />
                {activeBoost ? (
                  <MetricChip
                    icon={Sparkles}
                    label="Boost"
                    value={`x${activeBoost.multiplier.toFixed(1)} - ${formatSimulationCountdown(activeBoost.remaining_seconds)}`}
                  />
                ) : null}
              </div>
            ) : showSessionFallback ? (
              <div className="hidden max-w-full flex-wrap gap-1.5 sm:flex">
                <div className="h-[3.25rem] w-[5.5rem] animate-pulse rounded-[1rem] bg-[color-mix(in_oklab,var(--card)_66%,transparent)]" />
                <div className="h-[3.25rem] w-[5.5rem] animate-pulse rounded-[1rem] bg-[color-mix(in_oklab,var(--card)_66%,transparent)]" />
                <div className="h-[3.25rem] w-[5.5rem] animate-pulse rounded-[1rem] bg-[color-mix(in_oklab,var(--card)_66%,transparent)]" />
              </div>
            ) : null}
          </div>

          <div className="order-3 w-full md:order-none md:min-w-[16rem] md:flex-1 xl:max-w-[28rem]">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                className={`h-9 rounded-[0.95rem] border-[var(--border)]/80 bg-[color-mix(in_oklab,var(--card)_60%,transparent)] pl-9.5 text-[0.92rem] backdrop-blur-sm transition-all ${
                  searchFocused ? "ring-2 ring-[var(--primary)]/20" : ""
                }`}
                placeholder="Qidirish..."
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.25 sm:gap-1.5">
            {user ? <PremiumAction isPremium={isPremiumUser} /> : null}
            <ThemeToggle />
            {user ? <NotificationBell /> : null}
            {user ? (
              <ProfileMenu
                user={user}
                membershipLabel={membershipLabel}
                upgradeActionLabel={upgradeActionLabel}
                onLogout={() => void logout()}
              />
            ) : showSessionFallback ? (
              <>
                <div className="hidden items-center gap-2 rounded-[0.95rem] border border-[var(--border)]/70 bg-[color-mix(in_oklab,var(--card)_70%,transparent)] px-3 py-2 text-[0.78rem] text-[var(--text-secondary)] sm:inline-flex">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-green)]" />
                  Sessiya
                </div>
                <div className="h-9 w-9 animate-pulse rounded-[0.95rem] border border-[var(--border)]/70 bg-[color-mix(in_oklab,var(--card)_70%,transparent)]" />
              </>
            ) : null}
          </div>
        </div>

        {showLevelPanel ? (
          <div className="pointer-events-none absolute bottom-1.5 right-4 z-[3] sm:bottom-2 sm:right-5 lg:bottom-2 lg:right-7">
            <div className="rounded-[9px] border border-[color-mix(in_oklab,var(--border)_84%,transparent)] bg-[color-mix(in_oklab,var(--card)_88%,transparent)] px-[9px] py-[5px] shadow-[0_10px_22px_-20px_rgba(15,23,42,0.2)] backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="text-[11px] leading-[1.25] text-[var(--text-secondary)]">Keyingi level</span>
                <span className="text-[1rem] font-semibold leading-none text-[var(--text-primary)]">{gamification ? `${gamification.xp.xp_to_next_level} XP` : "--"}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
