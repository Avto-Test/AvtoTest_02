"use client";

import { Coins, Flame, Sparkles, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import type { AttemptResult } from "@/types/test";
import type { GamificationSummary } from "@/types/gamification";

function useAnimatedCount(value: number, duration = 720) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(value * eased));
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, value]);

  return display;
}

function RewardMetric({
  label,
  value,
  icon: Icon,
  toneClassName,
}: {
  label: string;
  value: number;
  icon: typeof Sparkles;
  toneClassName: string;
}) {
  const animatedValue = useAnimatedCount(value);

  return (
    <div className="notice-pop rounded-[1.25rem] border border-[color-mix(in_oklab,var(--border)_84%,transparent)] bg-[color-mix(in_oklab,var(--card)_94%,transparent)] px-4 py-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">{label}</p>
          <p className="mt-1 text-xl font-semibold">+{animatedValue}</p>
        </div>
      </div>
    </div>
  );
}

export function RewardSummary({
  result,
  gamification,
}: {
  result: AttemptResult;
  gamification: GamificationSummary | null;
}) {
  const rewardSummary = result.reward_summary;

  if (!rewardSummary) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <RewardMetric
          label="XP"
          value={rewardSummary.xp_awarded}
          icon={Sparkles}
          toneClassName="bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] text-[var(--primary)]"
        />

        <RewardMetric
          label="Coin"
          value={rewardSummary.coins_awarded}
          icon={Coins}
          toneClassName="bg-[color-mix(in_oklab,#f59e0b_16%,transparent)] text-amber-500"
        />

        <Card className="border-[color-mix(in_oklab,var(--accent)_24%,var(--border))] bg-[color-mix(in_oklab,var(--card)_94%,transparent)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Seriya</p>
                <p className="mt-1 text-xl font-semibold">
                  {gamification ? `${gamification.streak.current_streak} kunlik seriya` : "Yangilanmoqda..."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[color-mix(in_oklab,var(--border)_84%,transparent)] bg-[color-mix(in_oklab,var(--card)_94%,transparent)]">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Bosqich rivoji</p>
              <p className="mt-1 text-xl font-semibold">
                {gamification ? `Level ${gamification.xp.level}` : "Bosqich yangilanmoqda"}
              </p>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              {gamification
                ? `${gamification.xp.current_level_xp} / ${gamification.xp.next_level_xp} XP`
                : "XP hisoblanmoqda"}
            </p>
          </div>
          <Progress
            value={gamification?.xp.progress_percent ?? 0}
            className="h-2.5"
            indicatorClassName="bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500"
          />
        </CardContent>
      </Card>

      {rewardSummary.achievements.length > 0 ? (
        <Card className="border-[color-mix(in_oklab,var(--primary)_24%,var(--border))] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--card)_96%,transparent),color-mix(in_oklab,var(--primary)_9%,transparent))]">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--primary)_18%,transparent)] text-[var(--primary)]">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Yangi yutuq</p>
                <p className="mt-1 text-lg font-semibold">Tabriklaymiz, yangi badge ochildi</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {rewardSummary.achievements.map((achievement) => (
                <div
                  key={`${achievement.id ?? achievement.name}`}
                  className="badge-pop rounded-[1.2rem] border border-[color-mix(in_oklab,var(--primary)_24%,var(--border))] bg-[color-mix(in_oklab,var(--card)_92%,transparent)] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] text-[var(--primary)]">
                      <Trophy className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="font-semibold">{achievement.name}</p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        {achievement.icon ? `${achievement.icon} belgisi ochildi.` : "Yangi bosqich ochildi."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
