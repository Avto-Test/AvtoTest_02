"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Crown, Medal, Trophy } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartCard,
  LeaderboardTable,
  PageContainer,
  PrimaryButton,
  ProductCard,
  ProductEmptyState,
  ProductSkeletonCard,
  ProductTableSkeleton,
  SectionHeader,
  StatCard,
  TierBadge,
} from "@/components/ui/product-primitives";
import { getXpTierProgress } from "@/lib/gamification";
import {
  getLeaderboardBundle,
  type LeaderboardPeriod,
} from "@/lib/intelligence";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/useAuth";

type LeaderboardSurfaceProps = {
  preview?: boolean;
};

const PERIODS: LeaderboardPeriod[] = ["daily", "weekly", "monthly"];

function buildLearnerLabel(
  userId: string,
  currentUserId: string | undefined,
  viewerLabel: string,
  learnerPrefix: string,
): string {
  if (currentUserId && userId === currentUserId) {
    return viewerLabel;
  }
  return `${learnerPrefix} ${userId.replaceAll("-", "").slice(0, 6).toUpperCase()}`;
}

function periodTitle(period: LeaderboardPeriod): string {
  if (period === "daily") {
    return "Bugun";
  }
  if (period === "monthly") {
    return "Oy";
  }
  return "Hafta";
}

function podiumIcon(rank: number) {
  if (rank === 1) {
    return <Crown className="h-5 w-5 text-amber-400" />;
  }
  if (rank === 2) {
    return <Medal className="h-5 w-5 text-slate-400" />;
  }
  return <Trophy className="h-5 w-5 text-orange-400" />;
}

function PreviewSkeleton() {
  return <ProductSkeletonCard className="min-h-[260px]" lines={5} />;
}

export function LeaderboardSurface({ preview = false }: LeaderboardSurfaceProps) {
  const { t } = useI18n();
  const { user, token, hydrated, fetchUser } = useAuth();
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof getLeaderboardBundle>> | null>(null);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!user && token) {
      void fetchUser();
    }
  }, [fetchUser, hydrated, token, user]);

  useEffect(() => {
    if (!hydrated || !token) {
      return;
    }

    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await getLeaderboardBundle(period);
        if (active) {
          setBundle(response);
        }
      } catch {
        if (active) {
          setBundle(null);
          setError(t("leaderboard.load_error", "Ma'lumot topilmadi."));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [hydrated, period, t, token]);

  const rows = useMemo(() => {
    if (!bundle) {
      return [];
    }
    return preview ? bundle.leaderboard.users.slice(0, 5) : bundle.leaderboard.users.slice(0, 20);
  }, [bundle, preview]);

  const resolveName = useCallback(
    (userId: string) => buildLearnerLabel(userId, user?.id, t("leaderboard.you", "Siz"), t("leaderboard.learner_prefix", "O'quvchi")),
    [t, user?.id],
  );

  if (!hydrated || loading) {
    return preview ? <PreviewSkeleton /> : <PageContainer><ProductTableSkeleton rows={8} /></PageContainer>;
  }

  if (preview) {
    if (!bundle || rows.length === 0) {
      return (
        <ChartCard
          eyebrow={t("leaderboard.preview_eyebrow", "Reyting")}
          title={t("leaderboard.preview_title", "Haftalik reyting")}
          description={t("leaderboard.preview_description", "XP bo'yicha eng faol o'quvchilar.")}
        >
          <ProductEmptyState
            title="Reyting ma'lumoti hali tayyor emas"
            description="Haftalik snapshot yaratilgach eng faol o'quvchilar shu yerda ko'rinadi."
          />
        </ChartCard>
      );
    }

    return (
      <ChartCard
        eyebrow={t("leaderboard.preview_eyebrow", "Reyting")}
        title={t("leaderboard.preview_title", "Haftalik reyting")}
        description={t("leaderboard.preview_description", "XP bo'yicha eng faol o'quvchilar.")}
      >
        <div className="space-y-3">
          {rows.map((entry) => (
            <div key={`${entry.rank}-${entry.user_id}`} className="product-subtle-card-plain flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="product-icon-shell h-10 w-10 bg-white text-slate-700">
                  {podiumIcon(entry.rank)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {resolveName(entry.user_id)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">#{entry.rank}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-900">{entry.xp_gained} XP</p>
            </div>
          ))}
        </div>
      </ChartCard>
    );
  }

  const unsupportedMessage =
    !bundle || rows.length === 0
      ? period === "daily"
        ? "Kunlik reyting hozircha mavjud emas."
        : period === "monthly"
          ? "Oylik reyting hozircha mavjud emas."
          : "Reyting ma'lumoti topilmadi."
      : null;

  const podium = rows.slice(0, 3);
  const tierProgress = getXpTierProgress(bundle?.xp.xp_total ?? 0);

  return (
    <PageContainer className="product-page-stack">
      <ProductCard className="product-card-shell sm:p-8">
        <SectionHeader
          eyebrow={t("nav.leaderboard", "Reyting")}
          title="Reyting jadvali"
          description="Haftalik, oylik va kunlik XP bo'yicha o'rningiz shu yerda ko'rinadi."
          action={
            <Tabs value={period} onValueChange={(value) => setPeriod(value as LeaderboardPeriod)}>
              <TabsList className="h-auto rounded-[var(--radius-soft)] bg-slate-100 p-1">
                {PERIODS.map((item) => (
                  <TabsTrigger
                    key={item}
                    value={item}
                    className="rounded-[var(--radius-soft)] px-3 py-1.5 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-slate-950"
                  >
                    {periodTitle(item)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          }
        />
      </ProductCard>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("leaderboard.rank_label", "O'rin")}
          title={t("leaderboard.current_rank", "Joriy o'rin")}
          value={bundle?.me.rank ? `#${bundle.me.rank}` : "-"}
          description={t("leaderboard.current_rank_description", "Tanlangan davr bo'yicha joriy o'rningiz.")}
          icon={Trophy}
        />
        <StatCard
          label="XP"
          title={t("leaderboard.your_xp", "Jami XP")}
          value={bundle?.xp.xp_total ?? 0}
          description={t("leaderboard.your_xp_description", "Hozirgacha yig'ilgan umumiy XP miqdori.")}
          icon={Medal}
        />
        <StatCard
          label={t("leaderboard.period_label", "Davr")}
          title={t("leaderboard.period_xp_title", "Tanlangan davrdagi XP")}
          value={bundle?.me.xp_gained ?? 0}
          description={t("leaderboard.period_xp_description", "Aynan shu davrda to'plangan XP.")}
          icon={Crown}
        />
        <StatCard
          label="XP tier"
          title="Sizning tier"
          value={<TierBadge tier={tierProgress.tier} />}
          description={tierProgress.nextTier ? `${tierProgress.nextTier.label} uchun ${tierProgress.remainingXp} XP qoldi.` : "Siz eng yuqori tierdasiz."}
          icon={Medal}
        />
      </div>

      <ProductCard className="product-card-shell">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="product-meta-text">
              Tanlangan davr
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">Top 3 va to&apos;liq reyting</h3>
          </div>
        </div>

        {unsupportedMessage ? (
          <div className="mt-6">
            <ProductEmptyState
              title={error ? "Reytingni yuklab bo'lmadi" : "Reyting hali shakllanmagan"}
              description="Mashq va testlarni yakunlaganingizdan keyin reyting shu yerda ko'rinadi."
              action={
                <PrimaryButton asChild>
                  <a href="/practice">Mashqni boshlash</a>
                </PrimaryButton>
              }
            />
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-3">
              {podium.map((entry, index) => (
                <div
                  key={`podium-${entry.user_id}`}
                  className={cn(
                    "flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-4 text-center shadow-sm",
                    index === 1 && "mt-4",
                    index === 2 && "mt-8",
                  )}
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    {podiumIcon(entry.rank)}
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {resolveName(entry.user_id)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">#{entry.rank}</p>
                  <p className="mt-3 text-lg font-semibold text-slate-900">{entry.xp_gained} XP</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <LeaderboardTable
                rows={rows}
                currentUserId={user?.id}
                resolveName={resolveName}
                getRowMeta={(row) => (
                  row.user_id === user?.id ? <TierBadge tier={tierProgress.tier} /> : null
                )}
              />
            </div>
          </>
        )}
      </ProductCard>
    </PageContainer>
  );
}

export default LeaderboardSurface;
