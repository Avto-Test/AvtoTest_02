"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import { AppShell } from "@/components/app-shell";
import { AccountInfo } from "@/components/profile/account-info";
import { AccountSummary } from "@/components/profile/account-summary";
import { ProfileHero } from "@/components/profile/profile-hero";
import { ProgressChart } from "@/components/profile/progress-chart";
import { RecentPractice } from "@/components/profile/recent-practice";
import { RecommendationCard } from "@/components/profile/recommendation-card";
import { useProgressSnapshot } from "@/components/providers/progress-provider";
import { useUser } from "@/hooks/use-user";
import { formatSimulationCountdown } from "@/lib/simulation-status";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { ErrorState } from "@/shared/ui/error-state";

function resolveSimulationState() {
  return {
    title: "LOCKED",
    body: "Readiness signal hali to'liq shakllanmagan.",
  };
}

function toTitleCase(value: string | null | undefined) {
  if (!value) {
    return "Beginner";
  }

  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function buildTrendPoints(progressTrend: { label: string; value: number }[], recentScores: number[]) {
  const normalizedTrend = progressTrend
    .slice(-4)
    .map((item) => ({
      label: item.label,
      value: Math.max(0, Math.round(item.value)),
    }));

  if (normalizedTrend.length > 0) {
    return normalizedTrend;
  }

  return recentScores.slice(-4).map((score, index) => ({
    label: `${index + 1} kun`,
    value: Math.max(0, Math.round(score)),
  }));
}

function ProfilePageContent() {
  const { user, loading: userLoading } = useUser();
  const progress = useProgressSnapshot();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isLightTheme = resolvedTheme === "light";

  if (userLoading || progress.dashboardLoading || progress.summaryLoading) {
    return (
      <div className="space-y-6">
        <div className="h-64 animate-pulse rounded-3xl bg-[var(--muted)]" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <div className="h-80 animate-pulse rounded-3xl bg-[var(--muted)]" />
            <div className="h-40 animate-pulse rounded-3xl bg-[var(--muted)]" />
          </div>
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded-3xl bg-[var(--muted)]" />
            <div className="h-40 animate-pulse rounded-3xl bg-[var(--muted)]" />
            <div className="h-40 animate-pulse rounded-3xl bg-[var(--muted)]" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <ErrorState description="Profil ma'lumotini yuklab bo'lmadi. Sessiyani yangilab qayta urinib ko'ring." />;
  }

  if (progress.dashboardError || progress.summaryError || !progress.dashboard || !progress.summary) {
    return <ErrorState description="Profil ma'lumotini yuklab bo'lmadi." onRetry={() => void progress.reload()} />;
  }

  const simulationStatus = progress.dashboard.simulation_status;
  const simulation = simulationStatus?.launch_ready
    ? {
        title: "READY",
        body: "Simulyatsiyani hozir boshlash mumkin.",
      }
    : simulationStatus && !simulationStatus.cooldown_ready
      ? {
          title: "COOLDOWN",
          body: `${formatSimulationCountdown(simulationStatus.cooldown_remaining_seconds)} qoldi`,
        }
      : resolveSimulationState();

  const gamification = progress.gamification;
  const xpSummary = gamification?.xp;
  const readiness = Math.round(progress.dashboard.overview.readiness_score);
  const passProbability = Math.round(progress.dashboard.overview.pass_probability);
  const bestScore = Math.round(progress.dashboard.overview.best_score);
  const averageScore = Math.round(progress.dashboard.overview.average_score);

  const explicitTopic = progress.dashboard.recommendation.topic;
  const weakestTopic = explicitTopic
    ? explicitTopic
    : [...progress.dashboard.topic_breakdown].sort((left, right) => left.accuracy - right.accuracy)[0]?.topic ?? "General Practice";

  const recommendationDetail =
    progress.dashboard.recommendation.action_label ??
    (progress.dashboard.recommendation.question_count > 0
      ? `Complete ${progress.dashboard.recommendation.question_count} practice sessions`
      : "Complete 12 practice sessions");

  const trendPoints = buildTrendPoints(progress.dashboard.progress_trend, progress.dashboard.recent_scores);
  const lastAttempt = progress.summary.last_attempts[0] ?? null;
  const recentPracticeTitle = lastAttempt ? lastAttempt.test_title : "No attempts made yet";
  const recentPracticeDescription = lastAttempt
    ? `${lastAttempt.score}% • ${formatRelativeTime(lastAttempt.finished_at)}`
    : "Start your first practice session to see progress here.";
  const recentPracticeButton = lastAttempt ? "Continue learning" : "Start Practice";
  const recentPracticeHelper = lastAttempt
    ? "Return to your learning path to keep the momentum going."
    : "Agar siz practice mashqni boshlaganlaringiz, bu yerda ko'rinadi.";

  const levelValue = xpSummary?.level ?? 1;
  const xpToNextLevel = xpSummary?.xp_to_next_level ?? 0;
  const levelProgressPercent = xpSummary?.progress_percent ?? 0;
  const joinedAt = formatDate(user.created_at);
  const accountRecommendationTitle = progress.dashboard.recommendation.topic
    ? `Bugungi: ${progress.dashboard.recommendation.topic}`
    : "Bugungi: tavsiya";
  const accountRecommendationBody =
    progress.dashboard.recommendation.action_label ?? "Tavsiya etilgan review mashqini boshlang.";

  return (
    <div className="w-full">
      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="flex-1 space-y-6">
          <ProfileHero
            readiness={readiness}
            passProbability={passProbability}
            name={user.full_name ?? "Foydalanuvchi"}
            level={levelValue}
            levelLabel={toTitleCase(progress.dashboard.overview.current_training_level)}
            levelProgressPercent={levelProgressPercent}
            xpToNextLevel={xpToNextLevel}
            isLightTheme={isLightTheme}
            onStartPractice={() => router.push("/practice")}
          />

          <ProgressChart
            trendPoints={trendPoints}
            recommendationTopic={weakestTopic}
            recommendationDetail={recommendationDetail}
            bestScore={bestScore}
            averageScore={averageScore}
            simulationReady={Boolean(simulationStatus?.launch_ready)}
            simulationLabel={simulation.title}
            isLightTheme={isLightTheme}
          />

          <RecentPractice
            title={recentPracticeTitle}
            description={recentPracticeDescription}
            buttonLabel={recentPracticeButton}
            helperText={recentPracticeHelper}
            isLightTheme={isLightTheme}
            onAction={() => router.push(lastAttempt ? "/learning-path" : "/practice")}
          />
        </div>

        <div className="w-full space-y-4 xl:w-80">
          <RecommendationCard
            topic={weakestTopic}
            description={progress.dashboard.recommendation.reason ?? recommendationDetail}
            isLightTheme={isLightTheme}
            onStartPractice={() => router.push("/practice")}
          />
          <AccountInfo
            plan={user.plan === "premium" ? "Premium" : "Free"}
            verified={user.is_verified}
            joinedAt={joinedAt}
            isLightTheme={isLightTheme}
          />
          <AccountSummary
            emailStatusTitle={user.is_verified ? "Email tasdiqlangan" : "Email tasdiqlanmagan"}
            emailStatusBody={simulation.body}
            recommendationTitle={accountRecommendationTitle}
            recommendationBody={accountRecommendationBody}
            isLightTheme={isLightTheme}
          />
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  return (
    <AppShell>
      <ProfilePageContent />
    </AppShell>
  );
}
