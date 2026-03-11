"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BrainCircuit,
  Coins,
  GraduationCap,
  Radar,
  Rocket,
  ScanSearch,
  ShieldAlert,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AnimatedNumber,
  EmptyIntelligenceState,
  IntelligenceActionButton,
  IntelligenceAnimatedProgress,
  IntelligenceHero,
  IntelligenceLoadingSkeleton,
  IntelligenceMetricCard,
  IntelligencePanel,
  confidenceToneClass,
} from "@/components/intelligence/IntelligencePrimitives";
import {
  IntelligenceProgressChart,
  IntelligenceTopicBarChart,
  IntelligenceTrendChart,
} from "@/components/intelligence/IntelligenceCharts";
import { SurfaceNav } from "@/components/intelligence/SurfaceNav";
import { useI18n } from "@/components/i18n-provider";
import { LeaderboardSurface } from "@/components/leaderboard/LeaderboardSurface";
import { studentNav } from "@/config/navigation";
import {
  getUserIntelligenceBundle,
  type UserIntelligenceBundle,
} from "@/lib/intelligence";
import { useAuth } from "@/store/useAuth";

function formatAttemptDate(value: string | null): string {
  if (!value) {
    return "Jarayonda";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Noma'lum";
  }
  return date.toLocaleDateString("uz-UZ", {
    month: "short",
    day: "numeric",
  });
}

function xpProgress(bundle: UserIntelligenceBundle): number {
  const { xp_total, level } = bundle.xp;
  const currentLevelBase = 100 * ((level - 1) ** 2);
  const nextLevelThreshold = 100 * (level ** 2);
  const span = Math.max(1, nextLevelThreshold - currentLevelBase);
  return Math.max(
    0,
    Math.min(100, Number((((xp_total - currentLevelBase) / span) * 100).toFixed(1))),
  );
}

export default function StudentDashboardSurface() {
  const { t } = useI18n();
  const { user, token, hydrated, fetchUser } = useAuth();
  const [bundle, setBundle] = useState<UserIntelligenceBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const response = await getUserIntelligenceBundle();
        if (!active) {
          return;
        }
        setBundle(response);
      } catch (loadError) {
        if (!active) {
          return;
        }
        console.error("Dashboard intelligence load failed", loadError);
        setError("Tayyorgarlik paneli ma'lumotlarini yuklashda xatolik yuz berdi.");
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
  }, [hydrated, token]);

  const displayName = useMemo(() => {
    return user?.full_name || user?.email?.split("@")[0] || "O'quvchi";
  }, [user?.email, user?.full_name]);

  if (!hydrated || loading) {
    return <IntelligenceLoadingSkeleton />;
  }

  if (error || !bundle) {
    return (
      <div className="intelligence-page">
        <div className="container-app py-8 sm:py-10">
          <SurfaceNav items={studentNav} className="mb-6" />
          <IntelligencePanel
            eyebrow={t("student.dashboard.error_eyebrow", "Dashboard xatosi")}
            title={t("student.dashboard.error_title", "Tayyorgarlik paneli vaqtincha mavjud emas")}
            description={error ?? "Dashboard ma'lumotlari topilmadi."}
          >
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => window.location.reload()}>Qayta urinish</Button>
              <Button asChild variant="outline">
                <Link href="/tests">Testlar sahifasi</Link>
              </Button>
            </div>
          </IntelligencePanel>
        </div>
      </div>
    );
  }

  const weakTopicChartData = bundle.analytics.weakTopicMetrics.length > 0
    ? bundle.analytics.weakTopicMetrics.map((item) => ({
        topic: item.category,
        value: Number((100 - item.accuracy).toFixed(1)),
      }))
    : bundle.readiness.weak_topics.slice(0, 5).map((topic) => ({
        topic,
        value: 100,
      }));

  const scoreTrendData = bundle.analytics.scoreTrend.map((point) => ({
    label: `Test ${point.testIndex}`,
    value: point.score,
  }));
  const activityTrendData = bundle.analytics.testActivity.map((point) => ({
    label: point.label,
    value: point.tests_count,
  }));
  const difficultyTrendData = bundle.analytics.difficultyProgression.map((point) => ({
    label: `#${point.testIndex}`,
    value: point.averageDifficulty,
  }));
  const nextPracticeTopic = bundle.coach.focus_topics[0] ?? bundle.readiness.weak_topics[0] ?? null;
  const isReadyForCertificate = bundle.readiness.certificate_unlocked;
  const earnedAchievements = bundle.achievements.slice(0, 4);

  if (bundle.analytics.isEmptyState) {
    return (
      <div className="intelligence-page">
        <div className="container-app space-y-6 py-8 sm:py-10">
          <SurfaceNav items={studentNav} />
          <IntelligenceHero
            eyebrow={t("student.dashboard.hero_eyebrow", "Imtihon tayyorgarligi paneli")}
            title={`Salom, ${displayName}. ${t("student.dashboard.empty_hero_title", "Natijalar birinchi mashqdan keyin shu yerda ko'rinadi.")}`}
            description={t("student.dashboard.empty_hero_description", "Birinchi test yoki o'rganish sessiyasini yakunlang. Shundan keyin tayyorgarlik darajasi, zaif mavzular, keyingi tavsiya va XP progress bir joyda paydo bo'ladi.")}
            badge={t("student.dashboard.no_data", "Hali ma'lumot yo'q")}
            actions={(
              <>
                <IntelligenceActionButton href="/learning/session" label={t("student.dashboard.start_learning_session", "O'rganish sessiyasini boshlash")} />
                <IntelligenceActionButton href="/tests" label={t("student.dashboard.test_modes", "Test rejimlari")} secondary />
              </>
            )}
          >
            <div className="intelligence-float-card rounded-[1.75rem] border border-white/14 bg-white/6 p-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">{"Boshlang'ich maqsad"}</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">3 ta yakunlangan urinish</p>
              <p className="mt-2 text-sm leading-6 text-white/66">
                Zaif mavzular, tayyorgarlik trendi va keyingi tavsiyalar ishonchli ko&apos;rinishi uchun kamida uchta yakunlangan urinish kerak.
              </p>
            </div>
          </IntelligenceHero>

          <IntelligencePanel
            eyebrow={t("student.dashboard.warm_start", "Start rejimi")}
            title={t("student.dashboard.warm_start_title", "Panel tayyor, endi mashq ma'lumoti kerak")}
            description={t("student.dashboard.warm_start_description", "Interfeys imtihondan o'tish ehtimoli, tayyorgarlik, zaif mavzular, keyingi qadam va faollik atrofida allaqachon tayyorlangan.")}
          >
            <EmptyIntelligenceState
              title={t("student.dashboard.practice_waiting", "Mashq ma'lumoti kutilmoqda")}
              description={t("student.dashboard.practice_waiting_description", "Adaptiv test yoki o'rganish sessiyasini tugatgach bu yerda ML ehtimoli, tayyorlik darajasi, zaif mavzular va XP faolligi avtomatik ko'rinadi.")}
            />
          </IntelligencePanel>
        </div>
      </div>
    );
  }

  return (
    <div className="intelligence-page">
      <div className="container-app space-y-6 py-8 sm:py-10">
        <SurfaceNav items={studentNav} />
        <IntelligenceHero
          eyebrow={t("student.dashboard.hero_eyebrow", "Imtihon tayyorgarligi paneli")}
          title={`${displayName}, ${t("student.dashboard.live_title", "bugungi tayyorgarlik ko'rinishi tayyor.")}`}
          description={t("student.dashboard.live_description", "Bu yerda imtihondan o'tish ehtimoli, tayyorgarlik darajasi, zaif mavzular, bugungi mashqlar va keyingi tavsiya bitta sirtga yig'iladi.")}
          badge={bundle.coach.message}
          badgeLabel={t("student.dashboard.badge_label", "Keyingi tavsiya")}
          actions={(
            <>
              <IntelligenceActionButton
                href={nextPracticeTopic ? `/tests?topic=${encodeURIComponent(nextPracticeTopic)}` : "/tests"}
                label={nextPracticeTopic ? `${nextPracticeTopic} ${t("student.dashboard.practice_topic_suffix", "bo'yicha mashq")}` : t("student.dashboard.start_adaptive_test", "Adaptiv testni boshlash")}
              />
              <IntelligenceActionButton href="/learning/session" label={t("student.dashboard.learning_session", "O'rganish sessiyasi")} secondary />
              <IntelligenceActionButton href="/simulation" label={t("student.dashboard.exam_simulation_flow", "Imtihon simulyatsiyasi")} secondary />
            </>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="intelligence-float-card rounded-[1.75rem] border border-white/14 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">{t("student.dashboard.focus_topics", "Fokus mavzular")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {bundle.coach.focus_topics.slice(0, 3).map((topic) => (
                  <span key={topic} className="intelligence-pill">
                    <Target className="h-3.5 w-3.5" />
                    {topic}
                  </span>
                ))}
              </div>
            </div>
            <div className="intelligence-float-card rounded-[1.75rem] border border-white/14 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">{t("student.dashboard.certificate", "Sertifikat")}</p>
              <p className="mt-3 text-lg font-medium text-white">
                {isReadyForCertificate ? t("student.dashboard.unlocked", "Ochiq") : t("student.dashboard.locked", "Yopiq")}
              </p>
              <p className="mt-2 text-sm text-white/64">
                {isReadyForCertificate
                  ? t("student.dashboard.certificate_ready", "Tayyorlik sertifikati yuklab olishga tayyor.")
                  : t("student.dashboard.certificate_threshold", "80+ tayyorlik balli kerak bo'ladi.")}
              </p>
            </div>
          </div>
        </IntelligenceHero>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <IntelligenceMetricCard
            eyebrow={t("student.dashboard.performance_intelligence", "1-zona")}
            title={t("student.dashboard.pass_probability", "Imtihondan o'tish ehtimoli")}
            numericValue={bundle.prediction.exam_pass_probability}
            decimals={1}
            suffix="%"
            description={t("student.dashboard.pass_probability_description", "Tayyorlik, so'nggi aniqlik va zaif mavzu bosimidan shakllangan joriy imtihon signali.")}
            icon={Radar}
            trailing={(
              <Badge className={confidenceToneClass(bundle.prediction.confidence)}>
                {bundle.prediction.confidence}
              </Badge>
            )}
          />
          <IntelligenceMetricCard
            eyebrow={t("student.dashboard.readiness_engine", "2-zona")}
            title={t("student.dashboard.readiness_score", "Tayyorlik darajasi")}
            numericValue={bundle.readiness.readiness_score}
            decimals={1}
            suffix="%"
            description={t("student.dashboard.readiness_score_description", "Mashq natijalari va yakunlash odatlariga asoslangan mustaqil tayyorgarlik bahosi.")}
            icon={BrainCircuit}
            tone={bundle.readiness.readiness_score >= 80 ? "success" : bundle.readiness.readiness_score >= 60 ? "warning" : "danger"}
            delay={0.04}
          />
          <IntelligenceMetricCard
            eyebrow={t("student.dashboard.confidence", "3-zona")}
            title={t("student.dashboard.coach_confidence", "Keyingi tavsiya ishonchi")}
            value={bundle.coach.confidence_level.toUpperCase()}
            description={`${t("student.dashboard.readiness_horizon", "Taxminiy imtihon tayyorligi ufqi")}: ${bundle.coach.exam_readiness_days_estimate} ${t("student.dashboard.days", "kun")}.`}
            icon={ShieldAlert}
            tone={bundle.coach.confidence_level === "high" ? "success" : bundle.coach.confidence_level === "medium" ? "warning" : "danger"}
            delay={0.08}
          />
          <IntelligenceMetricCard
            eyebrow={t("student.dashboard.recommended_load", "4-zona")}
            title={t("student.dashboard.questions_today", "Bugungi savollar")}
            numericValue={bundle.coach.recommended_questions_today}
            description={t("student.dashboard.questions_today_description", "Bugungi mashq hajmi joriy tayyorgarlik holati va zaif mavzular asosida belgilanadi.")}
            icon={Rocket}
            tone="neutral"
            delay={0.12}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <IntelligencePanel
              eyebrow={t("student.dashboard.zone1", "1-zona")}
              title={t("student.dashboard.zone1_title", "Asosiy ko'rsatkichlar")}
              description={t("student.dashboard.zone1_description", "Asosiy signallar yuqorida qoladi: imtihon ehtimoli, tayyorgarlik trayektoriyasi va tavsiya ishonchi.")}
            >
              {scoreTrendData.length > 0 ? (
                <IntelligenceTrendChart data={scoreTrendData} color="#22d3ee" />
              ) : (
                <EmptyIntelligenceState
                  title="Trend uchun ma'lumot yetarli emas"
                  description="Yana bir nechta yakunlangan testdan keyin natija chizig'i shu yerda paydo bo'ladi."
                />
              )}
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <p className="intelligence-eyebrow">{t("student.dashboard.rule_engine", "Qoidalarga asoslangan signal")}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    <AnimatedNumber value={bundle.analytics.passProbability} decimals={1} suffix="%" />
                  </p>
                </div>
                <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <p className="intelligence-eyebrow">{t("student.dashboard.training_level", "Mashq bosqichi")}</p>
                  <p className="mt-2 text-2xl font-semibold capitalize text-white">{bundle.analytics.trainingLevel}</p>
                </div>
                <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <p className="intelligence-eyebrow">{t("student.dashboard.average_score", "O'rtacha ball")}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    <AnimatedNumber value={bundle.analytics.averageScore} decimals={1} suffix="%" />
                  </p>
                </div>
              </div>
            </IntelligencePanel>

            <IntelligencePanel
              eyebrow={t("student.dashboard.zone3", "3-zona")}
              title={t("student.dashboard.zone3_title", "Keyingi qadam")}
              description={t("student.dashboard.zone3_description", "Coach chiqishi umumiy dashboard shovqini o'rniga aniq amallarga aylantiriladi.")}
              delay={0.08}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <p className="intelligence-eyebrow">{t("student.dashboard.questions_today", "Bugungi savollar")}</p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    <AnimatedNumber value={bundle.coach.recommended_questions_today} />
                  </p>
                  <p className="mt-2 text-sm text-white/62">
                    {nextPracticeTopic
                      ? `${nextPracticeTopic} bo'yicha bugungi mashqni birinchi o'ringa qo'ying.`
                      : "Bugungi mashqni adaptiv test yoki o'rganish sessiyasi bilan boshlang."}
                  </p>
                </div>
                <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <p className="intelligence-eyebrow">{t("student.dashboard.focus_topics", "Fokus mavzular")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {bundle.coach.focus_topics.slice(0, 4).map((topic) => (
                      <span key={topic} className="intelligence-pill">
                        <Target className="h-3.5 w-3.5" />
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="intelligence-float-card rounded-[1.75rem] border border-cyan-400/16 bg-cyan-400/8 p-5">
                <p className="text-base font-medium text-white">{bundle.coach.message}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {bundle.coach.focus_topics.map((topic) => (
                    <span key={topic} className="intelligence-pill">
                      <Zap className="h-3.5 w-3.5" />
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <Link
                  href={nextPracticeTopic ? `/tests?topic=${encodeURIComponent(nextPracticeTopic)}` : "/tests"}
                  className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4 transition hover:border-cyan-300/40 hover:bg-white/10"
                >
                  <Target className="h-5 w-5 text-cyan-300" />
                  <h3 className="mt-3 text-base font-medium text-white">{t("student.dashboard.practice_weak_topic", "Zaif mavzuni mashq qilish")}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/62">
                    {nextPracticeTopic ? `${nextPracticeTopic} bo'yicha maqsadli mashqni boshlang.` : "Zaif mavzu bo'yicha mashq yo'nalishini oching."}
                  </p>
                </Link>
                <Link
                  href="/dashboard/history"
                  className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4 transition hover:border-amber-300/40 hover:bg-white/10"
                >
                  <ScanSearch className="h-5 w-5 text-amber-300" />
                  <h3 className="mt-3 text-base font-medium text-white">{t("student.dashboard.review_mistakes", "Xatolarni ko'rib chiqish")}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/62">
                    {"So'nggi urinishlardagi xatolar va pasayish nuqtalarini tezda ko'rib chiqing."}
                  </p>
                </Link>
                <Link
                  href="/simulation"
                  className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4 transition hover:border-emerald-300/40 hover:bg-white/10"
                >
                  <GraduationCap className="h-5 w-5 text-emerald-300" />
                  <h3 className="mt-3 text-base font-medium text-white">{t("student.dashboard.take_exam_simulation", "Imtihon simulyatsiyasini boshlash")}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/62">
                    {"Qat'iy vaqtli sessiya orqali haqiqiy imtihonga qanchalik tayyor ekaningizni tekshiring."}
                  </p>
                </Link>
              </div>
            </IntelligencePanel>
          </div>

          <div className="space-y-6">
            <IntelligencePanel
              eyebrow={t("student.dashboard.zone2", "2-zona")}
              title={t("student.dashboard.zone2_title", "Zaif mavzular aniqlanishi")}
              description={t("student.dashboard.zone2_description", "Zaif mavzular va qiyinlik bosimi birga ko'rsatiladi, shuning uchun tashxis va tuzatish bir kadrda qoladi.")}
              delay={0.04}
            >
              {weakTopicChartData.length > 0 ? (
                <IntelligenceTopicBarChart data={weakTopicChartData} />
              ) : (
                <EmptyIntelligenceState
                  title="Zaif mavzu signali hali tayyor emas"
                  description="Mavzu bo'yicha xatolar ko'paygach, zaif mavzu ustunlari shu yerda ko'rinadi."
                />
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                {bundle.readiness.weak_topics.slice(0, 6).map((topic) => (
                  <span key={topic} className="intelligence-pill">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {topic}
                  </span>
                ))}
              </div>
              {difficultyTrendData.length > 0 ? (
                <div className="intelligence-float-card mt-6 rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
                  <p className="intelligence-eyebrow">{t("student.dashboard.topic_difficulty_trend", "Mavzu qiyinligi trendi")}</p>
                  <IntelligenceProgressChart data={difficultyTrendData} color="#f97316" />
                </div>
              ) : null}
            </IntelligencePanel>

            <IntelligencePanel
              eyebrow={t("student.dashboard.zone4", "4-zona")}
              title={t("student.dashboard.zone4_title", "Faollik")}
              description={t("student.dashboard.zone4_description", "So'nggi testlar, XP oqimi va olingan yutuqlar motivatsiya hamda progress dalilini bir zonada saqlaydi.")}
              delay={0.12}
            >
              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="intelligence-float-card space-y-4 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="intelligence-eyebrow">{t("student.dashboard.xp_progression", "XP o'sishi")}</p>
                      <p className="mt-2 text-3xl font-semibold text-white">
                        <AnimatedNumber value={bundle.xp.xp_total} />
                      </p>
                    </div>
                    <Badge className="border-sky-500/30 bg-sky-500/15 text-sky-100">
                      {t("student.dashboard.level", "Daraja")} {bundle.xp.level}
                    </Badge>
                  </div>
                  <IntelligenceAnimatedProgress value={xpProgress(bundle)} className="h-2.5" />
                  <p className="text-sm text-white/62">
                    Keyingi darajagacha {bundle.xp.xp_to_next_level} XP qoldi. Coin balansi: {bundle.coins.coins_total}.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="intelligence-float-card rounded-2xl border border-white/8 bg-black/14 p-3">
                      <p className="intelligence-eyebrow">{t("student.dashboard.coins", "Coinlar")}</p>
                      <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
                        <Coins className="h-4 w-4 text-amber-300" />
                        <AnimatedNumber value={bundle.coins.coins_total} />
                      </p>
                    </div>
                    <div className="intelligence-float-card rounded-2xl border border-white/8 bg-black/14 p-3">
                      <p className="intelligence-eyebrow">{t("student.dashboard.achievements", "Yutuqlar")}</p>
                      <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
                        <Award className="h-4 w-4 text-fuchsia-300" />
                        <AnimatedNumber value={bundle.achievements.length} />
                      </p>
                    </div>
                  </div>
                </div>

                <div className="intelligence-float-card space-y-4 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <div>
                      <p className="intelligence-eyebrow">{t("student.dashboard.recent_tests", "So'nggi testlar")}</p>
                    <div className="mt-3 space-y-3">
                      {bundle.summary.last_attempts.slice(0, 4).map((attempt) => (
                        <div
                          key={attempt.id}
                          className="intelligence-float-card flex items-center justify-between rounded-2xl border border-white/8 bg-black/14 px-3 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">{attempt.test_title}</p>
                            <p className="mt-1 text-xs text-white/54">{formatAttemptDate(attempt.finished_at)}</p>
                          </div>
                          <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-sm font-medium text-white">
                            {attempt.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {earnedAchievements.length > 0 ? (
                    <div>
                      <p className="intelligence-eyebrow">{t("student.dashboard.latest_achievements", "So'nggi yutuqlar")}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {earnedAchievements.map((achievement) => (
                          <span key={`${achievement.code}-${achievement.awarded_at}`} className="intelligence-pill">
                            <Trophy className="h-3.5 w-3.5 text-amber-300" />
                            {achievement.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              {activityTrendData.length > 0 ? (
                <div className="intelligence-float-card mt-6 rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
                  <p className="intelligence-eyebrow">{t("dashboard.recent_activity", "So'nggi faollik")}</p>
                  <IntelligenceProgressChart data={activityTrendData} color="#34d399" />
                </div>
              ) : null}
            </IntelligencePanel>
          </div>
        </div>

        <LeaderboardSurface preview />
      </div>
    </div>
  );
}
