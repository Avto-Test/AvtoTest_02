"use client";

import { Crown, Medal, Trophy } from "lucide-react";
import { useState } from "react";

import { getLeaderboard, getMyLeaderboard } from "@/api/leaderboard";
import { AppShell } from "@/components/app-shell";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { cn, formatDate } from "@/lib/utils";
import type { LeaderboardPeriod } from "@/types/leaderboard";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";

const periods: Array<{ value: LeaderboardPeriod; label: string }> = [
  { value: "daily", label: "Kunlik" },
  { value: "weekly", label: "Haftalik" },
  { value: "monthly", label: "Oylik" },
];

function rankTone(rank: number) {
  if (rank === 1) {
    return "text-amber-400";
  }
  if (rank === 2) {
    return "text-slate-300";
  }
  if (rank === 3) {
    return "text-orange-300";
  }
  return "text-[var(--muted-foreground)]";
}

export function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const boardResource = useAsyncResource(() => getLeaderboard(period), [period], true, {
    cacheKey: `leaderboard:${period}:board`,
    staleTimeMs: 5 * 60_000,
  });
  const meResource = useAsyncResource(() => getMyLeaderboard(period), [period], true, {
    cacheKey: `leaderboard:${period}:me`,
    staleTimeMs: 5 * 60_000,
  });

  const reload = async () => {
    await Promise.allSettled([boardResource.reload({ force: true }), meResource.reload({ force: true })]);
  };

  const loading = boardResource.loading || meResource.loading;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Leaderboard"
          description="XP eventlarga asoslangan joriy reyting."
          action={
            <div className="flex flex-wrap gap-2">
              {periods.map((option) => (
                <Button
                  key={option.value}
                  variant={period === option.value ? "default" : "outline"}
                  onClick={() => setPeriod(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          }
        />

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-[1.8rem]" />
            <Skeleton className="h-[28rem] rounded-[1.8rem]" />
          </div>
        ) : boardResource.error || meResource.error || !boardResource.data || !meResource.data ? (
          <ErrorState description="Leaderboard ma'lumoti yuklanmadi." onRetry={() => void reload()} />
        ) : boardResource.data.users.length === 0 ? (
          <EmptyState title="Leaderboard hali bo'sh" description="XP eventlar paydo bo'lgach reyting shu yerda ko'rinadi." />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="card-hover-lift">
                <CardContent className="p-6">
                  <p className="text-sm text-[var(--muted-foreground)]">Sizning o'rningiz</p>
                  <p className="mt-2 text-3xl font-bold">{meResource.data.rank ?? "Top tashqarisida"}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{periods.find((item) => item.value === period)?.label} kesim</p>
                </CardContent>
              </Card>
              <Card className="card-hover-lift">
                <CardContent className="p-6">
                  <p className="text-sm text-[var(--muted-foreground)]">Joriy period XP</p>
                  <p className="mt-2 text-3xl font-bold">{meResource.data.xp_gained}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">XP yig'ildi</p>
                </CardContent>
              </Card>
              <Card className="card-hover-lift">
                <CardContent className="p-6">
                  <p className="text-sm text-[var(--muted-foreground)]">Snapshot vaqti</p>
                  <p className="mt-2 text-2xl font-bold">{boardResource.data.captured_at ? formatDate(boardResource.data.captured_at) : "Hozir"}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">So'nggi yangilanish</p>
                </CardContent>
              </Card>
            </div>

            <Card className="card-hover-lift">
              <CardHeader>
                <CardTitle>Top o'quvchilar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {boardResource.data.users.map((entry) => (
                  <div
                    key={`${entry.user_id}-${entry.rank}`}
                    className={cn(
                      "flex items-center justify-between gap-4 rounded-[1.4rem] border p-4 transition",
                      entry.is_current_user
                        ? "border-[color-mix(in_oklab,var(--primary)_32%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]"
                        : "border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_94%,transparent)]",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--muted)] font-semibold", rankTone(entry.rank))}>
                        {entry.rank === 1 ? <Crown className="h-5 w-5" /> : entry.rank <= 3 ? <Medal className="h-5 w-5" /> : entry.rank}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{entry.display_name}</p>
                        <p className="text-sm text-[var(--muted-foreground)]">{entry.is_current_user ? "Siz" : `Rank #${entry.rank}`}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {entry.is_current_user ? <Badge>Siz</Badge> : null}
                      <div className="flex items-center gap-2 rounded-full bg-[var(--muted)] px-3 py-2 text-sm font-semibold">
                        <Trophy className="h-4 w-4 text-[var(--primary)]" />
                        {entry.xp_gained} XP
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
