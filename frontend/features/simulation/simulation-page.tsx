"use client";

import Link from "next/link";
import { Check, Coins, Lock, LockOpen, Rocket, TimerReset } from "lucide-react";
import { useMemo, useState } from "react";
import { useTheme } from "next-themes";

import { ApiError } from "@/api/client";
import { getEconomyOverview, reduceSimulationCooldown, unlockSimulationFastTrack } from "@/api/economy";
import { getSimulationHistory, startSimulationExam } from "@/api/simulation";
import { AppShell } from "@/components/app-shell";
import { AssessmentSession } from "@/components/assessment-session";
import { useProgressSnapshot } from "@/components/providers/progress-provider";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { useAnalytics } from "@/hooks/use-analytics";
import { useUser } from "@/hooks/use-user";
import { resolveTopicMasteryState } from "@/lib/learning";
import { formatSimulationCountdown } from "@/lib/simulation-status";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/ui/error-state";
import { Select } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { SimulationHistory } from "@/widgets/simulation/simulation-history";

type ActiveSession = {
  attemptId: string;
  title: string;
  subtitle: string;
  durationMinutes: number;
  questions: Awaited<ReturnType<typeof startSimulationExam>>["questions"];
  modeLabel: string;
  startedAt?: string | null;
  pressureMode: boolean;
  mistakeLimit: number;
  mistakeCount: number;
  violationLimit: number;
  violationCount: number;
  savedAnswers: Awaited<ReturnType<typeof startSimulationExam>>["saved_answers"];
};

function resolveActionError(error: unknown) {
  if (error instanceof ApiError && typeof error.detail === "object" && error.detail) {
    const rawPayload = error.detail as {
      error?: string;
      message?: string;
      detail?: { error?: string; message?: string } | string;
    };
    const payload =
      rawPayload.detail && typeof rawPayload.detail === "object"
        ? rawPayload.detail
        : rawPayload;
    if (payload.error === "SIMULATION_LOCKED") {
      return payload.message ?? "Simulyatsiya hozircha ochilmagan. Learning Pathni davom ettiring yoki coin bilan tez oching.";
    }
    if (typeof rawPayload.detail === "string" && rawPayload.detail.trim()) {
      return rawPayload.detail;
    }
  }

  return error instanceof Error ? error.message : "Simulyatsiyada xatolik yuz berdi.";
}

function readinessLabel(score: number) {
  if (score >= 75) {
    return "Yuqori";
  }
  if (score >= 45) {
    return "O'rta";
  }
  return "Past";
}

function buildReadinessMessage({
  readinessScore,
  remainingTopics,
  cooldownReady,
  cooldownRemainingSeconds,
  launchReady,
  fastUnlockActive,
  warningMessage,
}: {
  readinessScore: number;
  remainingTopics: number;
  cooldownReady: boolean;
  cooldownRemainingSeconds: number;
  launchReady: boolean;
  fastUnlockActive: boolean;
  warningMessage?: string | null;
}) {
  const readiness = readinessLabel(readinessScore);

  if (fastUnlockActive) {
    return warningMessage ?? "Coin bilan tez ochish faollashdi. Simulyatsiyani hozir boshlashingiz mumkin.";
  }

  if (launchReady) {
    return "Learning Path bo'yicha tavsiya etilgan tayyorgarlik darajasiga yetdingiz. Simulyatsiyani boshlashingiz mumkin.";
  }

  if (!cooldownReady) {
        return `Avvalgi urinishdan keyingi kutish vaqti davom etmoqda. Keyingi imtihon ${formatSimulationCountdown(cooldownRemainingSeconds)} dan keyin ochiladi.`;
  }

  if (remainingTopics > 0) {
    return `Tayyorgarligingiz hali ${readiness.toLowerCase()}. Tavsiya etilgan yo'l: yana ${remainingTopics} ta mavzuni 70%+ darajaga olib chiqing yoki coin bilan tez oching.`;
  }

  return "Yana bir necha mashqdan so'ng simulyatsiya learning path orqali ochiladi.";
}

function SimulationPageContent() {
  const { authenticated } = useUser();
  const { resolvedTheme } = useTheme();
  const progress = useProgressSnapshot();
  const analytics = useAnalytics();
  const historyResource = useAsyncResource(getSimulationHistory, [authenticated], authenticated, {
    cacheKey: "simulation:history",
    staleTimeMs: 30_000,
  });
  const economyResource = useAsyncResource(getEconomyOverview, [authenticated], authenticated, {
    cacheKey: "economy:overview",
    staleTimeMs: 15_000,
  });

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [starting, setStarting] = useState(false);
  const [spending, setSpending] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [reductionDays, setReductionDays] = useState("1");
  const [actionError, setActionError] = useState<string | null>(null);

  const simulationStatus = analytics.dashboard?.simulation_status;
  const configuredQuestionCount = simulationStatus?.recommended_question_count ?? 40;
  const cooldownOffer = economyResource.data?.simulation_cooldown_offer;
  const fastUnlockOffer = economyResource.data?.simulation_fast_unlock_offer;
  const historyItems = (historyResource.data?.items ?? []).slice(0, 3);
  const readinessScore = analytics.dashboard?.overview.readiness_score ?? 0;
  const passProbability = analytics.dashboard?.overview.pass_probability ?? 0;

  const remainingTopics = useMemo(() => {
    if (!analytics.dashboard) {
      return 0;
    }

    return analytics.dashboard.topic_breakdown.filter((topic) => {
      const state = resolveTopicMasteryState(topic.topic, analytics.dashboard!);
      return state === "weak" || state === "improving";
    }).length;
  }, [analytics.dashboard]);

  const cooldownReady = simulationStatus?.cooldown_ready ?? false;
  const launchReady = simulationStatus?.launch_ready ?? false;
  const fastUnlockActive = simulationStatus?.fast_unlock_active ?? false;
  const cooldownRemainingSeconds = simulationStatus?.cooldown_remaining_seconds ?? 0;
  const countdownText = fastUnlockActive
    ? "Fast unlock faol. Cooldown davom etsa ham simulyatsiya ochiq."
    : cooldownReady
      ? "Simulyatsiya hozir ochiq."
      : `Keyingi imtihon ${formatSimulationCountdown(cooldownRemainingSeconds)} dan keyin ochiladi.`;
  const canStartSimulation = launchReady || fastUnlockActive;
  const coinBalance = economyResource.data?.coin_balance ?? progress.gamification?.coins.balance ?? 0;
  const nextLevelXp = progress.gamification?.xp.xp_to_next_level ?? 143;
  const readinessMessage = buildReadinessMessage({
    readinessScore,
    remainingTopics,
    cooldownReady,
    cooldownRemainingSeconds,
    launchReady,
    fastUnlockActive,
    warningMessage: simulationStatus?.warning_message,
  });
  const SimulationAccessIcon = canStartSimulation ? LockOpen : Lock;
  const simulationCtaClassName =
    "group relative inline-flex min-w-[20.5rem] items-center justify-between gap-3 overflow-hidden rounded-[12px] border border-emerald-300/18 bg-[linear-gradient(135deg,rgba(61,226,125,0.98)_0%,rgba(35,200,128,0.97)_44%,rgba(22,171,141,0.95)_100%)] px-6 py-3 text-[15px] font-semibold text-white shadow-[0_12px_30px_rgba(16,185,129,0.24)] transition-all duration-300 before:absolute before:inset-y-0 before:left-[-28%] before:w-[34%] before:-skew-x-[24deg] before:bg-white/20 before:opacity-0 before:blur-xl before:transition-all before:duration-500 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_18px_38px_rgba(16,185,129,0.32)] hover:before:left-[110%] hover:before:opacity-100 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0";
  const isLightTheme = resolvedTheme === "light";
  const glassPanelClass =
    "rounded-[14px] border border-[color-mix(in_oklab,var(--border)_76%,transparent)] bg-[color-mix(in_oklab,var(--card)_72%,transparent)] shadow-[0_20px_42px_-32px_rgba(15,23,42,0.18)] backdrop-blur-[12px]";
  const glassRowClass =
    "rounded-[14px] border border-[color-mix(in_oklab,var(--border)_72%,transparent)] bg-[color-mix(in_oklab,var(--card)_84%,transparent)]";
  const surfaceTextPrimaryClass = "text-[var(--text-primary)]";
  const surfaceTextSecondaryClass = "text-[var(--text-secondary)]";
  const surfaceTextTertiaryClass = "text-[var(--text-tertiary)]";
  const startSimulation = async () => {
    setStarting(true);
    setActionError(null);
    try {
      const response = await startSimulationExam();
      setActiveSession({
        attemptId: response.id,
        title: "Simulyatsion imtihon",
        subtitle: `${response.question_count} savollik yakuniy sinov`,
        durationMinutes: response.duration_minutes,
        questions: response.questions,
        modeLabel: "Simulation",
        startedAt: response.started_at,
        pressureMode: response.pressure_mode,
        mistakeLimit: response.mistake_limit,
        mistakeCount: response.mistake_count,
        violationLimit: response.violation_limit,
        violationCount: response.violation_count,
        savedAnswers: response.saved_answers,
      });
    } catch (error) {
      setActionError(resolveActionError(error));
    } finally {
      setStarting(false);
    }
  };

  const spendForCooldown = async () => {
    setActionError(null);
    setSpending(true);
    try {
      await reduceSimulationCooldown(Number(reductionDays));
      await Promise.allSettled([analytics.reload(), historyResource.reload(), economyResource.reload(), progress.reload()]);
    } catch (error) {
      setActionError(resolveActionError(error));
    } finally {
      setSpending(false);
    }
  };

  const unlockWithCoins = async () => {
    setActionError(null);
    setUnlocking(true);
    try {
      await unlockSimulationFastTrack();
      await Promise.allSettled([analytics.reload(), historyResource.reload(), economyResource.reload(), progress.reload()]);
    } catch (error) {
      setActionError(resolveActionError(error));
    } finally {
      setUnlocking(false);
    }
  };

  if (activeSession) {
    return (
      <AssessmentSession
        session={activeSession}
        onExit={() => setActiveSession(null)}
        onFinished={() => void Promise.allSettled([analytics.reload(), historyResource.reload(), economyResource.reload(), progress.reload()])}
      />
    );
  }

  if (analytics.loading || historyResource.loading) {
    return (
      <div className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-[var(--card)] p-4 lg:h-[calc(100vh-10.6rem)] lg:p-5">
        <Skeleton className="h-52 rounded-[1.4rem]" />
        <div className="mt-4 grid gap-4 lg:h-[calc(100%-14rem)] lg:grid-cols-2">
          <Skeleton className="h-72 rounded-[1.2rem]" />
          <Skeleton className="h-72 rounded-[1.2rem]" />
        </div>
      </div>
    );
  }

  if (analytics.error || !analytics.dashboard) {
    return (
      <ErrorState
        description="Simulyatsiya ma'lumoti yuklanmadi."
        error={analytics.error}
        onRetry={() => void Promise.allSettled([analytics.reload(), historyResource.reload(), economyResource.reload()])}
      />
    );
  }

  return (
    <section className="relative -mx-4 -mb-5 -mt-5 min-h-screen overflow-hidden sm:-mx-5 sm:-mb-6 sm:-mt-6 lg:-mx-7 lg:-mb-8 lg:-mt-8">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/assets/road.png')",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          filter: isLightTheme ? "brightness(1.06) saturate(0.92)" : undefined,
        }}
      />
      <div className="absolute inset-0 bg-black/35" />
      {isLightTheme ? (
        <div className="absolute inset-0 bg-white/8 backdrop-blur-[3px]" />
      ) : null}

      <div className="relative z-[2] flex min-h-screen flex-col">
        <div className="relative min-h-[21rem] px-4 pb-2 pt-10 sm:px-6 lg:min-h-[22rem] lg:px-[3.75rem] lg:pb-1 lg:pt-10">
          <div className="absolute right-4 top-[0.1rem] sm:right-6 sm:top-[0.05rem] lg:right-5 lg:top-0">
            <div className="rounded-[9px] border border-[color-mix(in_oklab,var(--border)_82%,transparent)] bg-[color-mix(in_oklab,var(--card)_80%,transparent)] px-[9px] py-[5px] backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="text-[11px] leading-[1.25] text-[var(--text-secondary)]">Keyingi level</span>
                <span className="text-[1rem] font-semibold leading-none text-[var(--text-primary)]">{nextLevelXp} XP</span>
              </div>
            </div>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/ringchart.png"
            alt=""
            className="ring-chart pointer-events-none absolute right-[15rem] top-[47%] z-[1] hidden w-[29rem] -translate-y-1/2 rotate-[-8deg] scale-[1.96] opacity-95 mix-blend-screen [filter:brightness(1.2)_saturate(1.1)] lg:block xl:right-[17.5rem]"
          />
          <div className="pointer-events-none absolute right-[15rem] top-[47%] z-[2] hidden h-[29rem] w-[29rem] -translate-y-1/2 rotate-[-8deg] lg:flex lg:items-center lg:justify-center xl:right-[17.5rem]">
            <div className="flex w-full translate-x-4 -translate-y-3 rotate-[8deg] flex-col items-center justify-center text-center xl:translate-x-5 xl:-translate-y-4">
              <p className="text-[1rem] font-medium text-white/86 xl:text-[1.1rem]">Tayyorlik</p>
              <p className="mt-1 text-[3.85rem] font-bold leading-none text-white xl:text-[4.45rem]">
                {Math.round(readinessScore)}%
              </p>
              <p className="mt-2 text-[1rem] text-white/74 xl:text-[1.08rem]">
                O&apos;tish ehtimoli <span className="font-semibold text-white">{Math.round(passProbability)}%</span>
              </p>
            </div>
          </div>

          <div className="relative z-[2] max-w-[32.5rem] space-y-3 pr-2">
            <h1 className="text-[3.45rem] font-bold leading-[0.98] tracking-tight text-white">Simulyatsiya</h1>

            <div className="flex items-center gap-2 text-[13px] leading-[1.3] text-white/88">
              {canStartSimulation ? (
                <>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/90">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span>{fastUnlockActive ? "Coin unlock faol, simulyatsiya ochiq." : "Simulyatsiya ochiq va tayyor"}</span>
                </>
              ) : (
                <>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/18">
                    <Lock className="h-3.5 w-3.5 text-amber-300" />
                  </div>
                  <span>Simulyatsiya tavsiya etilgan yo&apos;l bo&apos;yicha hali yopiq</span>
                </>
              )}
            </div>

            <p className="max-w-[31rem] text-[13px] leading-[1.35] text-white/74">{readinessMessage}</p>

            {actionError ? (
              <div className="max-w-[30rem] rounded-[12px] border border-rose-400/14 bg-rose-500/10 px-3 py-2.5 text-[12px] leading-[1.3] text-rose-100 backdrop-blur-md">
                {actionError}
              </div>
            ) : simulationStatus?.warning_message && !canStartSimulation ? (
              <div className="max-w-[30rem] rounded-[12px] border border-amber-400/14 bg-amber-500/10 px-3 py-2.5 text-[12px] leading-[1.3] text-amber-100 backdrop-blur-md">
                {simulationStatus.warning_message}
              </div>
            ) : null}

            <div className="max-w-[31rem] rounded-[12px] border border-white/10 bg-black/18 p-3 backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/72">Savollar soni</p>
                  <p className="mt-1 text-[13px] leading-[1.35] text-white/82">Admin belgilagan test formati.</p>
                </div>
                <span className="rounded-full border border-emerald-400/16 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                  {configuredQuestionCount} savol
                </span>
              </div>
            </div>

            {canStartSimulation ? (
              <button
                type="button"
                onClick={() => void startSimulation()}
                disabled={starting}
                className={simulationCtaClassName}
              >
                <span className="relative z-[1] flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/18 bg-black/12 transition-transform duration-300 group-hover:scale-105">
                    <Rocket className={`h-4 w-4 ${starting ? "animate-pulse" : ""}`} />
                  </span>
                  <span>{starting ? "Yuklanmoqda..." : "Simulyatsiyani boshlash"}</span>
                </span>
                <span className="relative z-[1] flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/14 transition-all duration-300 group-hover:translate-x-0.5 group-hover:scale-105 group-hover:bg-black/22">
                  <SimulationAccessIcon className="h-4.5 w-4.5 animate-[pulse_2.4s_ease-in-out_infinite]" />
                </span>
              </button>
            ) : (
              <Link
                href="/learning-path"
                className={simulationCtaClassName}
              >
                <span className="relative z-[1] flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/18 bg-black/12 transition-transform duration-300 group-hover:scale-105">
                    <Rocket className="h-4 w-4" />
                  </span>
                  <span>Learning Pathni davom ettirish</span>
                </span>
                <span className="relative z-[1] flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/14 transition-all duration-300 group-hover:translate-x-0.5 group-hover:scale-105 group-hover:bg-black/22">
                  <SimulationAccessIcon className="h-4.5 w-4.5 animate-[pulse_2.4s_ease-in-out_infinite]" />
                </span>
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-3 px-4 pb-4 sm:px-6 sm:pb-5 lg:grid-cols-[1fr_1fr] lg:px-[3.75rem] lg:pb-6">
          <div className={cn(glassPanelClass, "p-3")}>
            <div>
              <h3 className={cn("text-[15px] font-semibold leading-[1.3]", surfaceTextPrimaryClass)}>Tez ochish</h3>
              <p className={cn("mt-1 text-[13px] leading-[1.3]", surfaceTextSecondaryClass)}>Learning Path tavsiya etiladi, coin esa tezkor yo&apos;l.</p>
            </div>

            <div className="mt-3 space-y-3">
              <div className="rounded-[14px] border border-[color-mix(in_oklab,var(--accent-green)_18%,transparent)] bg-[color-mix(in_oklab,var(--accent-green-soft)_86%,transparent)] p-[10px]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/90">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("text-[15px] font-medium leading-[1.3]", surfaceTextPrimaryClass)}>Learning Path orqali</span>
                      <span className={cn("text-[12px] leading-[1.3]", surfaceTextTertiaryClass)}>(tavsiya etiladi)</span>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-[1.3] text-[var(--accent-green)]">+ reward ko&apos;proq!</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void unlockWithCoins()}
                disabled={unlocking || Boolean(fastUnlockOffer?.active)}
                className={cn(
                  "flex w-full items-center justify-between p-[10px] text-left transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--card)_92%,var(--accent-yellow)_4%)] disabled:cursor-not-allowed disabled:opacity-70",
                  glassRowClass,
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/18">
                    <Coins className="h-4 w-4 text-amber-300" />
                  </div>
                  <span className={cn("text-[15px] font-medium leading-[1.3]", surfaceTextPrimaryClass)}>
                    {fastUnlockOffer?.active
                      ? "Coin unlock faol"
                      : unlocking
                        ? "Ochilmoqda..."
                        : `${fastUnlockOffer?.cost ?? 120} coin bilan ochish`}
                  </span>
                </div>
                <span className="text-[15px] font-semibold leading-[1.3] text-amber-300">{coinBalance} coin</span>
              </button>
            </div>

            <div className={cn("mt-3 p-3", glassRowClass)}>
              <h3 className={cn("text-[15px] font-semibold leading-[1.3]", surfaceTextPrimaryClass)}>Cooldown</h3>
              <div className="mt-3 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--card)_86%,var(--foreground)_4%)]">
                  <Lock className="h-4 w-4 text-[var(--text-secondary)]" />
                </div>
                <div className="min-w-0">
                  <p className={cn("text-[13px] leading-[1.3]", surfaceTextPrimaryClass)}>{countdownText}</p>
                  <p className={cn("mt-1 text-[12px] leading-[1.3]", surfaceTextTertiaryClass)}>Yana {simulationStatus?.cooldown_days ?? 14} kunlik kutish boshlanadi.</p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-[8.75rem_1fr]">
                <Select
                  className="min-w-0"
                  value={reductionDays}
                  onChange={(event) => setReductionDays(event.target.value)}
                  icon={<Coins className="h-4 w-4" />}
                  disabled={!cooldownOffer?.available_days || spending}
                >
                  {Array.from({ length: cooldownOffer?.available_days ?? 0 }, (_, index) => index + 1).map((day) => (
                    <option key={day} value={String(day)}>
                      {day} kun
                    </option>
                  ))}
                  {!cooldownOffer?.available_days ? <option value="1">Mavjud emas</option> : null}
                </Select>

                <Button
                  onClick={() => void spendForCooldown()}
                  disabled={!cooldownOffer?.available_days || spending}
                  className="rounded-[10px] border border-white/8 bg-transparent px-4 py-2.5 text-[13px] leading-[1.3] text-amber-300 hover:bg-white/[0.04] hover:text-amber-200"
                >
                  <TimerReset className="h-4 w-4" />
                  {spending
                    ? "Qisqartirilmoqda..."
                    : `${Number(reductionDays) * (cooldownOffer?.cost_per_day ?? 40)} coin bilan qisqartirish`}
                </Button>
              </div>
            </div>
          </div>

          {historyResource.error ? (
            <div className={cn(glassPanelClass, "flex min-h-0 flex-col p-3")}>
              <h3 className={cn("text-[15px] font-semibold leading-[1.3]", surfaceTextPrimaryClass)}>So&apos;nggi imtihonlar</h3>
              <div className="mt-3 flex flex-1 items-center justify-center rounded-[14px] border border-dashed border-[color-mix(in_oklab,var(--border)_70%,transparent)] bg-[color-mix(in_oklab,var(--card)_72%,transparent)] p-4 text-center text-[13px] leading-[1.3] text-[var(--text-secondary)]">
                Tarixni yuklab bo&apos;lmadi. Qayta urinib ko&apos;ring.
              </div>
              <Button onClick={() => void historyResource.reload()} className="mt-3 rounded-[10px] bg-white px-4 py-2.5 text-[13px] leading-[1.3] text-black hover:bg-white/90">
                Qayta urinish
              </Button>
            </div>
          ) : (
            <SimulationHistory items={historyItems} />
          )}
        </div>
      </div>
    </section>
  );
}

export function SimulationPage() {
  return (
    <AppShell>
      <SimulationPageContent />
    </AppShell>
  );
}
