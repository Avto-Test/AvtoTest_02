"use client";

export { default as StudentDashboardSurface } from "@/components/dashboard/StudentDashboardSurface";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  BadgeDollarSign,
  BrainCircuit,
  Coins,
  Flame,
  GraduationCap,
  ListChecks,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

import {
  AnimatedNumber,
  EmptyIntelligenceState,
  IntelligenceActionButton,
  IntelligenceHero,
  IntelligenceLoadingSkeleton,
  IntelligenceMetricCard,
  IntelligencePanel,
} from "@/components/intelligence/IntelligencePrimitives";
import {
  IntelligenceProgressChart,
  IntelligenceTopicBarChart,
  IntelligenceTrendChart,
} from "@/components/intelligence/IntelligenceCharts";
import { SurfaceNav } from "@/components/intelligence/SurfaceNav";
import { LeaderboardSurface } from "@/components/leaderboard/LeaderboardSurface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { studentNav } from "@/config/navigation";
import { getAvailableCheckoutPlans } from "@/lib/payments";
import {
  downloadReadinessCertificate,
  getUserIntelligenceBundle,
  getUserProfileBundle,
  type UserIntelligenceBundle,
} from "@/lib/intelligence";
import type { CheckoutPlan } from "@/schemas/payment.schema";
import { useAuth } from "@/store/useAuth";

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function useEnsureUserHydrated() {
  const { user, token, hydrated, fetchUser } = useAuth();

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!user && token) {
      void fetchUser();
    }
  }, [fetchUser, hydrated, token, user]);

  return { user, token, hydrated };
}

export function PracticeHub() {
  const { t } = useI18n();
  const { hydrated } = useEnsureUserHydrated();

  if (!hydrated) {
    return <IntelligenceLoadingSkeleton />;
  }

  return (
    <div className="intelligence-page">
      <div className="container-app space-y-6 py-8 sm:py-10">
        <SurfaceNav items={studentNav} />
        <IntelligenceHero
          eyebrow={t("student.practice.eyebrow", "Mashq markazi")}
          title={t("student.practice.title", "Har bir o'rganish rejimi bir bosishda ochiladi.")}
          description={t("student.practice.description", "Mashq testlari, adaptiv sessiyalar, qayta ko'rish navbati, darslar va imtihon simulyatsiyasi backend test mexanizmi o'zgarmagan holda ochiq qoladi.")}
          badge={t("student.practice.badge", "Funksiya yaxlitligi saqlandi")}
          actions={(
            <>
              <IntelligenceActionButton href="/tests" label={t("student.practice.tests_cta", "Mashq testlari")} />
              <IntelligenceActionButton href="/simulation" label={t("student.practice.simulation_cta", "Imtihon simulyatsiyasi")} secondary />
            </>
          )}
        >
          <div className="intelligence-float-card rounded-[1.75rem] border border-white/14 bg-white/6 p-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">{t("student.practice.stack_label", "O'rganish steki")}</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{t("student.practice.stack_value", "5 ta faol yo'nalish")}</p>
            <p className="mt-2 text-sm leading-6 text-white/66">
              {t("student.practice.stack_description", "Mashq, simulyatsiya, qayta ko'rish, darslar va analitika endi bitta talaba platformasi ichida jamlangan.")}
            </p>
          </div>
        </IntelligenceHero>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link href="/tests" className="intelligence-float-card rounded-[1.75rem] border border-white/10 bg-white/6 p-5 transition hover:border-cyan-300/35 hover:bg-white/10">
            <Target className="h-5 w-5 text-cyan-300" />
            <h2 className="mt-4 text-xl font-semibold text-white">{t("student.practice.card_tests_title", "Mashq testlari")}</h2>
            <p className="mt-2 text-sm leading-6 text-white/62">{t("student.practice.card_tests_description", "Mavjud adaptiv va erkin tasodifiy test mexanizmi o'zgarmagan.")}</p>
          </Link>
          <Link href="/learning/session" className="intelligence-float-card rounded-[1.75rem] border border-white/10 bg-white/6 p-5 transition hover:border-emerald-300/35 hover:bg-white/10">
            <BrainCircuit className="h-5 w-5 text-emerald-300" />
            <h2 className="mt-4 text-xl font-semibold text-white">{t("student.practice.card_learning_title", "O'rganish sessiyasi")}</h2>
            <p className="mt-2 text-sm leading-6 text-white/62">{t("student.practice.card_learning_description", "Mavjud adaptiv o'rganish mexanizmi asosidagi fokuslangan mashq oqimi.")}</p>
          </Link>
          <Link href="/review-queue" className="intelligence-float-card rounded-[1.75rem] border border-white/10 bg-white/6 p-5 transition hover:border-amber-300/35 hover:bg-white/10">
            <ListChecks className="h-5 w-5 text-amber-300" />
            <h2 className="mt-4 text-xl font-semibold text-white">{t("student.practice.card_review_title", "Qayta ko'rish navbati")}</h2>
            <p className="mt-2 text-sm leading-6 text-white/62">{t("student.practice.card_review_description", "Oraliqli takrorlash va zaif mavzularni mustahkamlash ochiq qoladi.")}</p>
          </Link>
          <Link href="/simulation" className="intelligence-float-card rounded-[1.75rem] border border-white/10 bg-white/6 p-5 transition hover:border-fuchsia-300/35 hover:bg-white/10">
            <ShieldCheck className="h-5 w-5 text-fuchsia-300" />
            <h2 className="mt-4 text-xl font-semibold text-white">{t("student.practice.card_simulation_title", "Imtihon simulyatsiyasi")}</h2>
            <p className="mt-2 text-sm leading-6 text-white/62">{t("student.practice.card_simulation_description", "14 kunlik kutish qoidasi bilan qat'iy 20 daqiqalik haydovchilik imtihoni mashqi.")}</p>
          </Link>
        </div>

        <IntelligencePanel
          eyebrow={t("student.practice.secondary_eyebrow", "Qo'shimcha yo'nalishlar")}
          title={t("student.practice.secondary_title", "Yordamchi o'rganish sahifalari")}
          description={t("student.practice.secondary_description", "Asosiy test mexanizmi saqlangan holda bu sahifalarga bevosita kirish mumkin.")}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/analytics" className="intelligence-float-card rounded-[1.35rem] border border-white/10 bg-white/6 p-4 transition hover:bg-white/10">
              <Radar className="h-4 w-4 text-sky-300" />
              <p className="mt-3 text-base font-medium text-white">{t("nav.analytics", "Analitika")}</p>
            </Link>
            <Link href="/leaderboard" className="intelligence-float-card rounded-[1.35rem] border border-white/10 bg-white/6 p-4 transition hover:bg-white/10">
              <Trophy className="h-4 w-4 text-amber-300" />
              <p className="mt-3 text-base font-medium text-white">{t("nav.leaderboard", "Reyting jadvali")}</p>
            </Link>
            <Link href="/achievements" className="intelligence-float-card rounded-[1.35rem] border border-white/10 bg-white/6 p-4 transition hover:bg-white/10">
              <Award className="h-4 w-4 text-fuchsia-300" />
              <p className="mt-3 text-base font-medium text-white">{t("nav.achievements", "Yutuqlar")}</p>
            </Link>
          </div>
        </IntelligencePanel>
      </div>
    </div>
  );
}

export function AnalyticsHub() {
  const { t } = useI18n();
  const { hydrated, token } = useEnsureUserHydrated();
  const [bundle, setBundle] = useState<UserIntelligenceBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        if (active) {
          setBundle(response);
        }
      } catch (loadError) {
        if (active) {
          console.error("Analytics hub load failed", loadError);
          setError(t("student.analytics.load_error", "Analitika ma'lumotlari yuklanmadi."));
          setBundle(null);
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
  }, [hydrated, t, token]);

  if (!hydrated || loading) {
    return <IntelligenceLoadingSkeleton />;
  }

  if (error || !bundle) {
    return (
      <div className="intelligence-page">
        <div className="container-app space-y-6 py-8 sm:py-10">
          <SurfaceNav items={studentNav} />
          <IntelligencePanel
            eyebrow={t("nav.analytics", "Analitika")}
            title={t("student.analytics.unavailable_title", "Analitika hozircha mavjud emas")}
            description={error ?? t("student.analytics.unavailable_description", "Analitika ma'lumotlari topilmadi.")}
          >
            <EmptyIntelligenceState
              title={t("student.analytics.unavailable_title", "Analitika mavjud emas")}
              description={t("student.analytics.unavailable_description", "Dashboard analytics endpoint hozircha ma'lumot bermadi.")}
            />
          </IntelligencePanel>
        </div>
      </div>
    );
  }

  const scoreTrend = bundle.analytics.scoreTrend.map((point) => ({
    label: `Test ${point.testIndex}`,
    value: point.score,
  }));
  const difficultyTrend = bundle.analytics.difficultyProgression.map((point) => ({
    label: `#${point.testIndex}`,
    value: point.averageDifficulty,
  }));
  const weakTopicData = bundle.analytics.weakTopicMetrics.map((metric) => ({
    topic: metric.category,
    value: Number((100 - metric.accuracy).toFixed(1)),
  }));

  return (
    <div className="intelligence-page">
      <div className="container-app space-y-6 py-8 sm:py-10">
        <SurfaceNav items={studentNav} />
        <IntelligenceHero
          eyebrow={t("student.analytics.eyebrow", "Analitika")}
          title={t("student.analytics.title", "Tayyorgarlik, zaif mavzular va progress bir ekran ichida.")}
          description={t("student.analytics.description", "Bu sahifa talaba panelidagi asosiy signallarni trendlar, mavzu xaritasi va progress tarixi bilan chuqurlashtiradi.")}
          badge={bundle.coach.message}
          badgeLabel={t("student.analytics.badge_label", "Bugungi tavsiya")}
          actions={(
            <>
              <IntelligenceActionButton href="/dashboard" label={t("student.analytics.back_dashboard", "Dashboardga qaytish")} />
              <IntelligenceActionButton href="/practice" label={t("student.analytics.open_practice", "Mashq markazini ochish")} secondary />
            </>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <IntelligenceMetricCard eyebrow={t("student.analytics.ml", "ML")} title={t("student.analytics.pass_probability", "Imtihondan o'tish ehtimoli")} numericValue={bundle.prediction.exam_pass_probability} decimals={1} suffix="%" description={t("student.analytics.pass_probability_description", "Ansambl bashorat endpointi analitikada to'g'ridan-to'g'ri ko'rsatiladi.")} icon={Radar} />
          <IntelligenceMetricCard eyebrow={t("student.analytics.readiness", "Tayyorlik")} title={t("student.analytics.readiness_score", "Tayyorlik darajasi")} numericValue={bundle.readiness.readiness_score} decimals={1} suffix="%" description={t("student.analytics.readiness_score_description", "Qoidaga asoslangan tayyorlik ko'rsatkichi ML yonida alohida ko'rinadi.")} icon={ShieldCheck} delay={0.04} />
          <IntelligenceMetricCard eyebrow={t("student.analytics.weak_topics_label", "Zaif mavzular")} title={t("student.analytics.weak_topics", "Zaif mavzular")} numericValue={bundle.readiness.weak_topics.length} description={t("student.analytics.weak_topics_description", "Tayyorlik va mavzu tahlilidan kelgan joriy tuzatish nuqtalari.")} icon={Flame} delay={0.08} />
          <IntelligenceMetricCard eyebrow={t("student.analytics.practice_load", "Mashq yuklamasi")} title={t("student.analytics.questions_today", "Bugungi savollar")} numericValue={bundle.coach.recommended_questions_today} description={t("student.analytics.questions_today_description", "AI coach tavsiya qilgan bugungi savollar hajmi.")} icon={Target} delay={0.12} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <IntelligencePanel eyebrow={t("student.analytics.trend", "Trend")} title={t("student.analytics.readiness_trend", "Tayyorlik trendlari")} description={t("student.analytics.readiness_trend_description", "So'nggi yakunlangan testlar bo'yicha urinish ballari o'sishi.")}>
            {scoreTrend.length > 0 ? (
              <IntelligenceTrendChart data={scoreTrend} color="#22d3ee" />
            ) : (
              <EmptyIntelligenceState title="Trend hali shakllanmagan" description="Yakunlangan urinishlar soni ko&apos;paygach trend grafigi shu yerda paydo bo&apos;ladi." />
            )}
          </IntelligencePanel>
          <IntelligencePanel eyebrow={t("student.analytics.weakness", "Zaifliklar")} title={t("student.analytics.weak_topics", "Zaif mavzular")} description={t("student.analytics.weak_panel_description", "Mavzu qiyinligi va so'nggi xatolar bosimi yonma-yon ko'rinadi.")} delay={0.06}>
            {weakTopicData.length > 0 ? (
              <IntelligenceTopicBarChart data={weakTopicData} />
            ) : (
              <EmptyIntelligenceState title="Zaif mavzu ma'lumoti hali yo'q" description="Xatolar soni ko&apos;paygach zaif mavzu xaritasi shu yerda ko&apos;rinadi." />
            )}
          </IntelligencePanel>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <IntelligencePanel eyebrow={t("student.analytics.difficulty", "Qiyinlik")} title={t("student.analytics.difficulty_progression", "Qiyinlik bo'yicha o'sish")} description={t("student.analytics.difficulty_progression_description", "So'nggi urinishlaringiz qiyinlik bo'yicha barqarorlashayotganini ko'ring.")} delay={0.12}>
            {difficultyTrend.length > 0 ? (
              <IntelligenceProgressChart data={difficultyTrend} color="#f97316" />
            ) : (
              <EmptyIntelligenceState title="Qiyinlik trendi hali tayyor emas" description="Qiyinlik bo'yicha o'sish chizig'i uchun yana bir nechta urinish kerak." />
            )}
          </IntelligencePanel>
          <IntelligencePanel eyebrow={t("student.analytics.timeline", "Faollik tarixi")} title={t("student.analytics.progress_timeline", "Mashq va progress tarixi")} description={t("student.analytics.progress_timeline_description", "So'nggi kunlar kesimida nechta urinish ishlanganini ko'ring.")} delay={0.16}>
            {bundle.analytics.testActivity.length > 0 ? (
              <IntelligenceProgressChart
                data={bundle.analytics.testActivity.map((point) => ({
                  label: point.label,
                  value: point.tests_count,
                }))}
                color="#34d399"
              />
            ) : (
              <EmptyIntelligenceState title="Faollik tarixi hali shakllanmagan" description="Yana bir nechta mashqdan keyin kunlik urinishlar shu yerda ko&apos;rinadi." />
            )}
          </IntelligencePanel>
        </div>
      </div>
    </div>
  );
}

export function AchievementsHub() {
  const { t } = useI18n();
  const { hydrated, token } = useEnsureUserHydrated();
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof getUserProfileBundle>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated || !token) {
      return;
    }
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const response = await getUserProfileBundle();
        if (active) {
          setBundle(response);
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
  }, [hydrated, token]);

  if (!hydrated || loading) {
    return <IntelligenceLoadingSkeleton />;
  }

  if (!bundle) {
    return <PracticeHub />;
  }

  return (
    <div className="intelligence-page">
      <div className="container-app space-y-6 py-8 sm:py-10">
        <SurfaceNav items={studentNav} />
        <IntelligenceHero
          eyebrow={t("student.achievements.eyebrow", "Yutuqlar tizimi")}
          title={t("student.achievements.title", "Progress yashirin emas, ko'rinib turadi.")}
          description={t("student.achievements.description", "XP, coinlar, badge'lar va reyting endi backend tizimlariga tegmasdan bitta engagement yuzasida jamlangan.")}
          badge={`${bundle.achievements.length} ${t("student.achievements.badges_earned", "ta badge olingan")}`}
          actions={(
            <>
              <IntelligenceActionButton href="/leaderboard" label={t("student.achievements.open_leaderboard", "Reytingni ochish")} />
              <IntelligenceActionButton href="/practice" label={t("student.achievements.earn_more_xp", "Ko'proq XP olish")} secondary />
            </>
          )}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <IntelligenceMetricCard eyebrow="XP" title={t("student.achievements.total_xp", "Jami XP")} numericValue={bundle.xp.xp_total} description={t("student.achievements.total_xp_description", "Mashq, o'rganish sessiyasi va qayta ko'rishlardan jamlangan.")} icon={Trophy} />
          <IntelligenceMetricCard eyebrow={t("student.achievements.coins", "Coinlar")} title={t("student.achievements.coin_balance", "Coin balansi")} numericValue={bundle.coins.coins_total} description={t("student.achievements.coin_balance_description", "Kelajakdagi xarajat mexanikalari uchun alohida engagement valyutasi.")} icon={Coins} delay={0.04} />
          <IntelligenceMetricCard eyebrow={t("student.achievements.badges", "Badge'lar")} title={t("student.achievements.achievements", "Yutuqlar")} numericValue={bundle.achievements.length} description={t("student.achievements.achievements_description", "Achievement engine bergan milestone badge'lar.")} icon={Award} delay={0.08} />
        </div>

        <IntelligencePanel eyebrow={t("student.achievements.badges", "Badge'lar")} title={t("student.achievements.cabinet_title", "Yutuqlar vitrinası")} description={t("student.achievements.cabinet_description", "Olingan barcha badge'lar ularni yaratgan engagement tizimlari bilan birga ko'rinadi.")}>
          {bundle.achievements.length === 0 ? (
            <EmptyIntelligenceState title={t("student.achievements.empty_title", "Hali badge yo'q")} description={t("student.achievements.empty_description", "Mashq testlari, qayta ko'rish sessiyalari va reytingdagi o'sish bu yerda yutuqlarni ochadi.")} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {bundle.achievements.map((achievement) => (
                <div key={`${achievement.code}-${achievement.awarded_at}`} className="intelligence-float-card rounded-[1.35rem] border border-white/10 bg-white/6 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/18 text-amber-300">
                      <Award className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{achievement.name}</p>
                      <p className="mt-1 text-xs text-white/54">{achievement.code}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-white/52">
                    {t("student.achievements.awarded_label", "Berilgan sana")} {new Date(achievement.awarded_at).toLocaleDateString("uz-UZ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </IntelligencePanel>

        <LeaderboardSurface preview />
      </div>
    </div>
  );
}

export function ProfileHub() {
  const { t } = useI18n();
  const { hydrated, token } = useEnsureUserHydrated();
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof getUserProfileBundle>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [certificateError, setCertificateError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!hydrated || !token) {
      return;
    }
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const response = await getUserProfileBundle();
        if (active) {
          setBundle(response);
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
  }, [hydrated, token]);

  async function handleDownloadCertificate() {
    setDownloading(true);
    setCertificateError(null);
    try {
      const blob = await downloadReadinessCertificate();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "readiness-certificate.pdf";
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setCertificateError(error instanceof Error ? error.message : t("student.profile.certificate_download_error", "Sertifikatni yuklab bo'lmadi."));
    } finally {
      setDownloading(false);
    }
  }

  if (!hydrated || loading) {
    return <IntelligenceLoadingSkeleton />;
  }

  if (!bundle) {
    return <PracticeHub />;
  }

  return (
    <div className="intelligence-page">
      <div className="container-app space-y-6 py-8 sm:py-10">
        <SurfaceNav items={studentNav} />
        <IntelligenceHero
          eyebrow={t("nav.profile", "Profil")}
          title={bundle.user.full_name || bundle.user.email}
          description={t("student.profile.description", "Profil, tayyorlik, bashorat va sertifikat holati foydalanuvchi hamda readiness API'larini o'zgartirmasdan shu yerda jamlangan.")}
          badge={bundle.user.is_premium ? t("student.profile.premium_plan", "Premium tarif") : t("student.profile.free_plan", "Bepul tarif")}
          actions={(
            <>
              <IntelligenceActionButton href="/billing" label={t("nav.billing", "To'lovlar")} />
              <IntelligenceActionButton href="/dashboard/settings" label={t("student.profile.settings", "Sozlamalar")} secondary />
            </>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <IntelligenceMetricCard eyebrow={t("student.profile.verification", "Tasdiqlash")} title={t("student.profile.verified", "Tasdiqlangan")} value={bundle.user.is_verified ? t("student.profile.yes", "Ha") : t("student.profile.no", "Yo'q")} description={t("student.profile.verified_description", "Hisobning joriy tasdiqlash holati.")} icon={ShieldCheck} />
          <IntelligenceMetricCard eyebrow={t("student.profile.readiness", "Tayyorlik")} title={t("student.profile.score", "Ball")} numericValue={bundle.readiness.readiness_score} decimals={1} suffix="%" description={t("student.profile.score_description", "Sertifikatni ochish chegarasi 80+ bo'lib qoladi.")} icon={GraduationCap} delay={0.04} />
          <IntelligenceMetricCard eyebrow={t("student.profile.prediction", "Bashorat")} title={t("student.profile.pass_signal", "O'tish signali")} numericValue={bundle.prediction.exam_pass_probability} decimals={1} suffix="%" description={t("student.profile.pass_signal_description", "Jonli prediction endpointidan olingan joriy ML ehtimoli.")} icon={Radar} delay={0.08} />
          <IntelligenceMetricCard eyebrow={t("student.profile.roles", "Rollar")} title={t("student.profile.school_access", "Maktab kirishi")} value={bundle.user.has_school_profile ? t("student.profile.school_admin", "Maktab admini") : bundle.user.has_instructor_profile ? t("student.profile.instructor", "Instruktor") : t("student.profile.student", "Talaba")} description={t("student.profile.school_access_description", "Rolga asoslangan panel kirishi frontendda saqlangan.")} icon={Sparkles} delay={0.12} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <IntelligencePanel eyebrow={t("student.profile.identity", "Shaxs")} title={t("student.profile.account_profile", "Hisob profili")}>
            <div className="space-y-3 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
              <p className="text-sm text-white"><span className="text-white/54">{t("student.profile.email", "Email")}:</span> {bundle.user.email}</p>
              <p className="text-sm text-white"><span className="text-white/54">{t("student.profile.created", "Yaratilgan")}:</span> {new Date(bundle.user.created_at).toLocaleDateString("uz-UZ")}</p>
              <p className="text-sm text-white"><span className="text-white/54">{t("student.profile.plan", "Tarif")}:</span> {bundle.user.is_premium ? t("student.profile.premium", "Premium") : t("student.profile.free", "Bepul")}</p>
            </div>
          </IntelligencePanel>
          <IntelligencePanel eyebrow={t("student.profile.certificate", "Sertifikat")} title={t("student.profile.readiness_certificate", "Tayyorlik sertifikati")} delay={0.06}>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
              <p className="text-base font-medium text-white">
                {bundle.readiness.certificate_unlocked ? t("student.profile.certificate_unlocked", "Sertifikat ochilgan") : t("student.profile.certificate_locked", "Sertifikat yopiq")}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/62">
                {t("student.profile.certificate_description", "Ochilish chegarasi: 80+ tayyorlik balli. Joriy ball")}: {formatPercent(bundle.readiness.readiness_score)}.
              </p>
              <Button
                className="mt-5 rounded-full bg-white text-slate-950 hover:bg-white/90"
                onClick={() => void handleDownloadCertificate()}
                disabled={!bundle.readiness.certificate_unlocked || downloading}
              >
                {downloading ? t("student.profile.downloading", "Yuklanmoqda...") : t("student.profile.download_certificate", "Sertifikatni yuklab olish")}
              </Button>
              {certificateError ? (
                <p className="mt-3 text-sm text-rose-200">{certificateError}</p>
              ) : null}
            </div>
          </IntelligencePanel>
        </div>
      </div>
    </div>
  );
}

export function BillingHub() {
  const { t } = useI18n();
  const { hydrated } = useEnsureUserHydrated();
  const { user } = useAuth();
  const [plans, setPlans] = useState<CheckoutPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const response = await getAvailableCheckoutPlans();
        if (active) {
          setPlans(response);
        }
      } catch {
        if (active) {
          setPlans([]);
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
  }, []);

  if (!hydrated || loading) {
    return <IntelligenceLoadingSkeleton />;
  }

  const activePlan = user?.plan === "premium" ? t("student.billing.premium", "Premium") : t("student.billing.free", "Bepul");

  return (
    <div className="intelligence-page">
      <div className="container-app space-y-6 py-8 sm:py-10">
        <SurfaceNav items={studentNav} />
        <IntelligenceHero
          eyebrow={t("nav.billing", "To'lovlar")}
          title={t("student.billing.title", "Obuna va to'lov oqimlari o'zgarmagan holda ishlaydi.")}
          description={t("student.billing.description", "Bu sahifa joriy narxlash qatlamini va checkout oqimini payment endpointlari yoki upgrade mexanizmini o'zgartirmasdan ko'rsatadi.")}
          badge={`${t("student.billing.current_plan", "Joriy tarif")}: ${activePlan}`}
          actions={(
            <>
              <IntelligenceActionButton href="/upgrade" label={t("student.billing.open_upgrade", "Upgrade oqimini ochish")} />
              <IntelligenceActionButton href="/dashboard" label={t("student.billing.back_dashboard", "Dashboardga qaytish")} secondary />
            </>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <IntelligenceMetricCard eyebrow={t("student.billing.plan", "Tarif")} title={t("student.billing.current_plan", "Joriy tarif")} value={activePlan} description={t("student.billing.current_plan_description", "Foydalanuvchi tarifi mavjud auth/session holatidan olinadi.")} icon={BadgeDollarSign} />
          <IntelligenceMetricCard eyebrow={t("student.billing.pricing", "Narxlash")} title={t("student.billing.available_plans", "Mavjud tariflar")} numericValue={plans.length} description={t("student.billing.available_plans_description", "Tariflar joriy payments API orqali yuklanadi.")} icon={Coins} delay={0.04} />
          <IntelligenceMetricCard eyebrow={t("student.billing.access", "Kirish")} title={t("student.billing.premium_features", "Premium imkoniyatlar")} value={user?.plan === "premium" ? t("student.billing.unlocked", "Ochiq") : t("student.billing.locked", "Yopiq")} description={t("student.billing.premium_features_description", "Cheksiz testlar, chuqur analitika va premium platforma kirishi.")} icon={Sparkles} delay={0.08} />
        </div>

        <IntelligencePanel eyebrow={t("student.billing.plans", "Tariflar")} title={t("student.billing.subscription_plans", "Obuna tariflari")} description={t("student.billing.subscription_plans_description", "Backend narxlash konfiguratsiyasidan kelgan joriy checkout tariflari.")}>
          {plans.length === 0 ? (
            <EmptyIntelligenceState title={t("student.billing.no_active_plans", "Faol tariflar yo'q")} description={t("student.billing.no_active_plans_description", "Narxlash tariflari topilmadi.")} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan.id} className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                    {plan.is_active ? (
                      <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-100">{t("student.billing.active", "Faol")}</Badge>
                    ) : (
                      <Badge className="border-white/10 bg-white/8 text-white/70">{t("student.billing.inactive", "Nofaol")}</Badge>
                    )}
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    <AnimatedNumber value={Math.round(plan.price_cents / 100)} /> {plan.currency}
                  </p>
                  <p className="mt-2 text-sm text-white/62">{plan.duration_days} {t("student.billing.days", "kun")}</p>
                  <Button asChild className="mt-5 rounded-full bg-white text-slate-950 hover:bg-white/90">
                    <Link href={`/upgrade?plan=${plan.id}`}>{t("student.billing.select_plan", "Tarifni tanlash")}</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </IntelligencePanel>
      </div>
    </div>
  );
}
