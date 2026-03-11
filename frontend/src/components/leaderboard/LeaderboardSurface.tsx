"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Medal, Sparkles, Trophy } from "lucide-react";

import {
  AnimatedNumber,
  EmptyIntelligenceState,
  IntelligenceHero,
  IntelligenceLoadingSkeleton,
  IntelligenceMetricCard,
  IntelligencePanel,
} from "@/components/intelligence/IntelligencePrimitives";
import { SurfaceNav } from "@/components/intelligence/SurfaceNav";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { studentNav } from "@/config/navigation";
import {
  getLeaderboardBundle,
  type LeaderboardPeriod,
  type LeaderboardEntryResponse,
} from "@/lib/intelligence";
import { useAuth } from "@/store/useAuth";

type LeaderboardSurfaceProps = {
  preview?: boolean;
};

const PERIODS: LeaderboardPeriod[] = ["daily", "weekly", "monthly"];

function confidenceTone(rank: number | null): "success" | "warning" | "neutral" {
  if (rank !== null && rank <= 10) {
    return "success";
  }
  if (rank !== null && rank <= 50) {
    return "warning";
  }
  return "neutral";
}

function buildLearnerLabel(
  userId: string,
  currentUserId: string | undefined,
  viewerLabel: string,
  learnerPrefix: string,
): string {
  if (currentUserId && userId === currentUserId) {
    return viewerLabel;
  }
  const compact = userId.replaceAll("-", "").slice(0, 6).toUpperCase();
  return `${learnerPrefix} ${compact}`;
}

function rankIcon(rank: number) {
  if (rank === 1) {
    return <Crown className="h-4 w-4 text-amber-300" />;
  }
  if (rank <= 3) {
    return <Medal className="h-4 w-4 text-sky-300" />;
  }
  return <Trophy className="h-4 w-4 text-white/55" />;
}

export function LeaderboardSurface({
  preview = false,
}: LeaderboardSurfaceProps) {
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
        if (!active) {
          return;
        }
        setBundle(response);
      } catch (loadError) {
        if (!active) {
          return;
        }
        console.error("Leaderboard load failed", loadError);
        setError(t("leaderboard.load_error"));
        setBundle(null);
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

  const visibleRows = useMemo(() => {
    if (!bundle) {
      return [];
    }
    return preview ? bundle.leaderboard.users.slice(0, 5) : bundle.leaderboard.users;
  }, [bundle, preview]);

  if (!hydrated || loading) {
    return preview ? (
      <div className="space-y-3">
        <div className="intelligence-float-card h-24 rounded-[1.5rem] border border-white/10 bg-white/6 animate-pulse" />
        <div className="intelligence-float-card h-64 rounded-[1.5rem] border border-white/10 bg-white/6 animate-pulse" />
      </div>
    ) : (
      <IntelligenceLoadingSkeleton />
    );
  }

  if (error || !bundle) {
    return (
        <IntelligencePanel
        eyebrow={t("leaderboard.panel_eyebrow")}
        title={t("leaderboard.unavailable_title")}
        description={error ?? t("leaderboard.unavailable_description")}
      >
        <EmptyIntelligenceState
          title={t("leaderboard.empty_title")}
          description={t("leaderboard.empty_description")}
        />
      </IntelligencePanel>
    );
  }

  const myRank = bundle.me.rank;
  const podiumRows = visibleRows.slice(0, 3);

  if (preview) {
    return (
      <IntelligencePanel
        eyebrow={t("leaderboard.preview_eyebrow")}
        title={t("leaderboard.preview_title")}
        description={t("leaderboard.preview_description")}
      >
        <div className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
            <p className="intelligence-eyebrow">{t("leaderboard.your_weekly_rank")}</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {myRank !== null ? `#${myRank}` : t("leaderboard.outside_top_50")}
            </p>
            <p className="mt-2 text-sm text-white/62">
              {t("leaderboard.weekly_xp_gained")} <AnimatedNumber value={bundle.me.xp_gained} />
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/8 bg-black/14 p-3">
                <p className="intelligence-eyebrow">{t("leaderboard.coins")}</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  <AnimatedNumber value={bundle.coins.coins_total} />
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/14 p-3">
                <p className="intelligence-eyebrow">{t("leaderboard.badges")}</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  <AnimatedNumber value={bundle.achievements.length} />
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {visibleRows.length === 0 ? (
              <EmptyIntelligenceState
                title={t("leaderboard.no_snapshot_title")}
                description={t("leaderboard.no_snapshot_description")}
              />
            ) : (
              visibleRows.map((entry) => (
                <motion.div
                  key={`${entry.rank}-${entry.user_id}`}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="intelligence-float-card flex items-center justify-between rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/18 text-white">
                      {rankIcon(entry.rank)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {buildLearnerLabel(
                          entry.user_id,
                          user?.id,
                          t("leaderboard.you"),
                          t("leaderboard.learner_prefix"),
                        )}
                      </p>
                      <p className="mt-1 text-xs text-white/52">{t("leaderboard.rank_label")} #{entry.rank}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                      <AnimatedNumber value={entry.xp_gained} /> XP
                    </p>
                    {user?.id === entry.user_id ? (
                      <Badge className="mt-2 border-emerald-500/30 bg-emerald-500/15 text-emerald-100">
                        {t("leaderboard.you")}
                      </Badge>
                    ) : null}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </IntelligencePanel>
    );
  }

  return (
    <div className="intelligence-page">
      <div className="container-app space-y-6 py-8 sm:py-10">
        <SurfaceNav items={studentNav} />
        <IntelligenceHero
          eyebrow={t("leaderboard.hero_eyebrow")}
          title={t("leaderboard.hero_title")}
          description={t("leaderboard.hero_description")}
          badge={`${t("leaderboard.current_period")}: ${t(`leaderboard.period.${period}`)}`}
          badgeLabel={t("leaderboard.badge_label", "Joriy davr")}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="intelligence-float-card rounded-[1.75rem] border border-white/14 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">{t("leaderboard.your_position")}</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                {myRank !== null ? `#${myRank}` : t("leaderboard.outside_top_50")}
              </p>
              <p className="mt-2 text-sm text-white/64">
                <AnimatedNumber value={bundle.me.xp_gained} /> {t("leaderboard.period_xp")}
              </p>
            </div>
            <div className="intelligence-float-card rounded-[1.75rem] border border-white/14 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">{t("leaderboard.achievement_stack")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {bundle.achievements.slice(0, 4).map((achievement) => (
                  <span key={`${achievement.code}-${achievement.awarded_at}`} className="intelligence-pill">
                    <Sparkles className="h-3.5 w-3.5" />
                    {achievement.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </IntelligenceHero>

        <div className="grid gap-4 md:grid-cols-3">
          <IntelligenceMetricCard
            eyebrow={t("leaderboard.weekly_summary")}
            title={t("leaderboard.your_xp")}
            numericValue={bundle.xp.xp_total}
            description={t("leaderboard.your_xp_description")}
            icon={Trophy}
          />
          <IntelligenceMetricCard
            eyebrow={t("leaderboard.coin_economy")}
            title={t("leaderboard.coin_balance")}
            numericValue={bundle.coins.coins_total}
            description={t("leaderboard.coin_balance_description")}
            icon={Sparkles}
            delay={0.04}
          />
          <IntelligenceMetricCard
            eyebrow={t("leaderboard.standing")}
            title={t("leaderboard.current_rank")}
            value={myRank !== null ? `#${myRank}` : t("leaderboard.outside_top_50")}
            description={t("leaderboard.current_rank_description")}
            icon={Crown}
            tone={confidenceTone(myRank)}
            delay={0.08}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <IntelligencePanel
            eyebrow={t("leaderboard.global_board", "Global reyting")}
            title={t("leaderboard.podium_title", "Haftaning top 3 o'quvchisi")}
            description={t("leaderboard.podium_description", "Joriy snapshot bo'yicha eng yuqori XP to'plagan uchlik.")}
          >
            {podiumRows.length === 0 ? (
              <EmptyIntelligenceState
                title={t("leaderboard.no_snapshot_title")}
                description={t("leaderboard.no_snapshot_description")}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {podiumRows.map((entry, index) => (
                  <motion.div
                    key={`podium-${entry.user_id}`}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="intelligence-podium-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="intelligence-eyebrow">
                          {index === 0 ? "Hafta yetakchisi" : `Top ${entry.rank}`}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-white">
                          {buildLearnerLabel(entry.user_id, user?.id, t("leaderboard.you"), t("leaderboard.learner_prefix"))}
                        </h3>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/18 text-white">
                        {rankIcon(entry.rank)}
                      </div>
                    </div>
                    <p className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-white">
                      <AnimatedNumber value={entry.xp_gained} /> XP
                    </p>
                    <p className="mt-2 text-sm text-white/62">
                      #{entry.rank} {t("leaderboard.rank_label").toLowerCase()} • {t(`leaderboard.period.${period}`)}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </IntelligencePanel>

          <IntelligencePanel
            eyebrow={t("leaderboard.group_board", "Guruh ko'rinishi")}
            title={t("leaderboard.group_board_title", "Sizning natija holatingiz")}
            description={t("leaderboard.group_board_description", "Talaba yuzasida global snapshotlar ko'rsatiladi. Guruh kesimidagi progress esa instruktor va maktab panellarida kuzatiladi.")}
            delay={0.06}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                <p className="intelligence-eyebrow">{t("leaderboard.group_board_signal", "Joriy holat")}</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {myRank !== null ? `#${myRank}` : t("leaderboard.outside_top_50")}
                </p>
                <p className="mt-2 text-sm text-white/62">
                  {t("leaderboard.group_board_note", "Sizning o'rningiz global snapshotdan olinadi, guruh bo'yicha qo'shimcha taqqoslov esa instruktor panelida saqlanadi.")}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                <p className="intelligence-eyebrow">{t("leaderboard.xp_race", "XP poygasi")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {bundle.achievements.slice(0, 4).map((achievement) => (
                    <span key={`${achievement.code}-${achievement.awarded_at}`} className="intelligence-pill">
                      <Sparkles className="h-3.5 w-3.5" />
                      {achievement.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </IntelligencePanel>
        </div>

        <IntelligencePanel
          eyebrow={t("leaderboard.panel_eyebrow")}
          title={t("leaderboard.snapshots_title")}
          description={t("leaderboard.snapshots_description")}
        >
          <Tabs value={period} onValueChange={(value) => setPeriod(value as LeaderboardPeriod)}>
            <TabsList className="mb-4 h-auto rounded-[1.25rem] bg-white/8 p-1">
              {PERIODS.map((item) => (
                <TabsTrigger
                  key={item}
                  value={item}
                  className="rounded-[1rem] capitalize data-[state=active]:bg-white data-[state=active]:text-slate-950"
                >
                  {t(`leaderboard.period.${item}`)}
                </TabsTrigger>
              ))}
            </TabsList>

            {PERIODS.map((item) => (
              <TabsContent key={item} value={item} className="space-y-3">
                {visibleRows.length === 0 ? (
                  <EmptyIntelligenceState
                    title={t("leaderboard.snapshot_unavailable_title")}
                    description={t("leaderboard.snapshot_unavailable_description")}
                  />
                ) : (
                  visibleRows.map((entry: LeaderboardEntryResponse) => (
                    <motion.div
                      key={`${item}-${entry.rank}-${entry.user_id}`}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="intelligence-float-card flex items-center justify-between rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/18 text-white">
                          {rankIcon(entry.rank)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {buildLearnerLabel(
                              entry.user_id,
                              user?.id,
                              t("leaderboard.you"),
                              t("leaderboard.learner_prefix"),
                            )}
                          </p>
                          <p className="mt-1 text-xs text-white/54">{t("leaderboard.rank_label")} #{entry.rank}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">
                          <AnimatedNumber value={entry.xp_gained} /> XP
                        </p>
                        <p className="mt-1 text-xs text-white/48">
                          {entry.user_id === user?.id
                            ? t("leaderboard.private_summary_note")
                            : t("leaderboard.public_board_note")}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </IntelligencePanel>
      </div>
    </div>
  );
}

export default LeaderboardSurface;
