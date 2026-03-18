"use client";

import { Brain, Clock3, Flame, Flag, GraduationCap, ShieldCheck, Sparkles, Star, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useProgressSnapshot } from "@/components/providers/progress-provider";
import type { AchievementItem } from "@/types/gamification";

const STORAGE_KEY = "autotest.gamification.achievements.seen.v1";

const iconMap = {
  brain: Brain,
  clock: Clock3,
  flame: Flame,
  flag: Flag,
  "graduation-cap": GraduationCap,
  shield: ShieldCheck,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  star: Star,
  zap: Zap,
} as const;

function achievementKey(achievement: AchievementItem) {
  return `${achievement.id ?? achievement.code ?? achievement.name}:${achievement.awarded_at}`;
}

export function AchievementUnlockStack() {
  const { gamification } = useProgressSnapshot();
  const [queue, setQueue] = useState<AchievementItem[]>([]);
  const initialized = useRef(false);

  const recentAchievements = useMemo(
    () => gamification?.recent_achievements ?? [],
    [gamification?.recent_achievements],
  );

  useEffect(() => {
    if (recentAchievements.length === 0) {
      return;
    }

    const currentKeys = recentAchievements.map(achievementKey);
    const rawStored = window.sessionStorage.getItem(STORAGE_KEY);
    const seen = rawStored ? new Set<string>(JSON.parse(rawStored) as string[]) : new Set<string>();

    if (!initialized.current) {
      initialized.current = true;
      currentKeys.forEach((key) => seen.add(key));
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
      return;
    }

    const unlockedNow = recentAchievements.filter((achievement) => !seen.has(achievementKey(achievement)));
    if (unlockedNow.length === 0) {
      return;
    }

    unlockedNow.forEach((achievement) => seen.add(achievementKey(achievement)));
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
    setQueue((current) => [...unlockedNow, ...current].slice(0, 3));
  }, [recentAchievements]);

  useEffect(() => {
    if (queue.length === 0) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setQueue((current) => current.slice(1));
    }, 4200);
    return () => window.clearTimeout(timeout);
  }, [queue]);

  if (queue.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-24 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      {queue.map((achievement) => {
        const Icon = iconMap[(achievement.icon ?? "sparkles") as keyof typeof iconMap] ?? Sparkles;
        return (
          <div
            key={achievementKey(achievement)}
            className="achievement-toast rounded-[1.4rem] border border-[color-mix(in_oklab,var(--primary)_26%,var(--border))] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--card)_96%,transparent),color-mix(in_oklab,var(--primary)_10%,transparent))] p-4 shadow-[0_24px_50px_-34px_rgba(79,70,229,0.6)]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(56,189,248,0.22),rgba(168,85,247,0.26))] text-indigo-200">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Yangi yutuq</p>
                <p className="mt-1 text-base font-semibold">{achievement.name}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{achievement.description ?? "Yangi yutuq ochildi."}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
