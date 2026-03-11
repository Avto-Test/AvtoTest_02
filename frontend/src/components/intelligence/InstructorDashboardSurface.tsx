"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  GraduationCap,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
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
} from "@/components/intelligence/IntelligenceCharts";
import { SurfaceNav } from "@/components/intelligence/SurfaceNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { instructorNav } from "@/config/navigation";
import {
  getInstructorDashboardBundle,
  sendInstructorGroupNudge,
  type InstructorDashboardBundle,
} from "@/lib/intelligence";
import { useAuth } from "@/store/useAuth";

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function averageWeighted(values: Array<{ value: number; weight: number }>): number {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) {
    return 0;
  }
  const total = values.reduce((sum, item) => sum + (item.value * item.weight), 0);
  return Number((total / totalWeight).toFixed(1));
}

export default function InstructorDashboardSurface() {
  const { t } = useI18n();
  const { token, hydrated, user, fetchUser } = useAuth();
  const [bundle, setBundle] = useState<InstructorDashboardBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string>("");
  const [sendingNudge, setSendingNudge] = useState<string | null>(null);
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
        const response = await getInstructorDashboardBundle();
        if (!active) {
          return;
        }
        setBundle(response);
        setActiveGroupId((current) => current || response.groups[0]?.id || "");
      } catch (loadError) {
        if (!active) {
          return;
        }
        console.error("Instructor dashboard load failed", loadError);
        setError("Instruktor nazorati sahifasi yuklanmadi.");
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

  const analyticsList = useMemo(() => {
    return bundle
      ? bundle.groups
          .map((group) => bundle.analytics[group.id])
          .filter(Boolean)
      : [];
  }, [bundle]);

  const overview = useMemo(() => {
    const totalStudents = analyticsList.reduce((sum, item) => sum + item.student_count, 0);
    const avgPass = averageWeighted(
      analyticsList.map((item) => ({
        value: item.group_pass_probability,
        weight: Math.max(1, item.student_count),
      })),
    );
    const avgCompletion = averageWeighted(
      analyticsList.map((item) => ({
        value: item.completion_rate,
        weight: Math.max(1, item.student_count),
      })),
    );
    const examReadyStudents = analyticsList.reduce((sum, item) => sum + item.exam_ready_students.length, 0);
    const atRiskStudents = analyticsList.reduce((sum, item) => sum + item.at_risk_students.length, 0);
    return {
      totalStudents,
      avgPass,
      avgCompletion,
      examReadyStudents,
      atRiskStudents,
    };
  }, [analyticsList]);

  const groupComparison = useMemo(() => {
    return analyticsList
      .map((item) => ({
        topic: item.group_name,
        value: item.group_pass_probability,
      }))
      .sort((left, right) => right.value - left.value);
  }, [analyticsList]);

  const dominantWeakTopic = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of analyticsList) {
      for (const weak of item.weak_topics) {
        counts.set(weak.topic, (counts.get(weak.topic) ?? 0) + weak.incorrect_answers);
      }
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? "Zaif mavzu signali yo'q";
  }, [analyticsList]);

  if (!hydrated || loading) {
    return <IntelligenceLoadingSkeleton />;
  }

  if (error || !bundle) {
    return (
      <div className="intelligence-page">
        <div className="container-app py-8 sm:py-10">
          <SurfaceNav items={instructorNav} className="mb-6" />
          <IntelligencePanel
            eyebrow={t("instructor.dashboard.eyebrow", "Instruktor nazorati")}
            title={t("instructor.dashboard.unavailable_title", "Dashboard mavjud emas")}
            description={error ?? "Instruktor ma'lumotlari topilmadi."}
          >
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard" className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950">
                Asosiy dashboard
              </Link>
              <Link href="/instructor/profile-builder" className="rounded-full border border-white/12 px-5 py-3 text-sm font-medium text-white">
                Profil builder
              </Link>
            </div>
          </IntelligencePanel>
        </div>
      </div>
    );
  }

  if (bundle.groups.length === 0) {
    return (
      <div className="intelligence-page">
        <div className="container-app space-y-6 py-8 sm:py-10">
          <SurfaceNav items={instructorNav} />
          <IntelligenceHero
            eyebrow={t("instructor.dashboard.eyebrow", "Instruktor nazorati")}
            title={t("instructor.dashboard.empty_title", "Guruh intellekti birinchi cohortdan keyin boshlanadi.")}
            description={t("instructor.dashboard.empty_description", "Guruh analitikasi, reyting, zaif mavzu bosimi va aralashuv signallari kamida bitta maktab guruhi mavjud bo'lganda yoqiladi.")}
            badge={t("instructor.dashboard.no_groups", "Hali guruh yo'q")}
            badgeLabel={t("instructor.dashboard.badge_label", "Holat")}
            actions={(
              <>
                <IntelligenceActionButton href="/instructor/profile-builder" label="Profilni yakunlash" />
                <IntelligenceActionButton href="/dashboard" label={t("instructor.dashboard.user_dashboard", "Foydalanuvchi dashboardi")} secondary />
              </>
            )}
          >
            <div className="rounded-[1.75rem] border border-white/14 bg-white/6 p-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">{t("instructor.dashboard.activation_path", "Faollashish yo'li")}</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{t("instructor.dashboard.activation_value", "Maktab guruhini yarating yoki qabul qiling")}</p>
              <p className="mt-2 text-sm leading-6 text-white/66">
                {t("instructor.dashboard.activation_description", "Guruhlar paydo bo'lgach, bu yuzada tayyorlik signallari, mavzu zaifligi, yakunlash bosimi va xavf belgilari avtomatik to'ladi.")}
              </p>
            </div>
          </IntelligenceHero>

          <IntelligencePanel eyebrow="Bo'sh holat" title="Guruh analitikasi hali tayyor emas">
            <EmptyIntelligenceState
              title="Guruh analitikasi tayyor emas"
              description="School admin tomonidan guruh yaratilgandan yoki sizga biriktirilgandan keyin instruktorga oid kuzatuv sahifasi shu yerda avtomatik jonlanadi."
            />
          </IntelligencePanel>
        </div>
      </div>
    );
  }

  return (
    <div className="intelligence-page">
      <div className="container-app space-y-6 py-8 sm:py-10">
        <SurfaceNav items={instructorNav} />
        <IntelligenceHero
          eyebrow={t("instructor.dashboard.eyebrow", "Instruktor nazorati")}
          title={t("instructor.dashboard.title", "Guruh holatini kuzatish va tezkor aralashuv yuborish.")}
          description={t("instructor.dashboard.description", "Bu yuzada guruh tayyorligi, xavf ostidagi o'quvchilar, zaif mavzu bosimi, nudge amallari va imtihonga tayyorlar bir joyga yig'iladi.")}
          badge={`${t("instructor.dashboard.dominant_weak_topic", "Asosiy zaif mavzu")}: ${dominantWeakTopic}`}
          badgeLabel={t("instructor.dashboard.badge_label", "Asosiy signal")}
          actions={(
            <>
              <IntelligenceActionButton href="/instructor/profile-builder" label={t("instructor.dashboard.profile_settings", "Profil va sozlamalar")} />
              <IntelligenceActionButton href="/dashboard" label={t("instructor.dashboard.my_learner_dashboard", "Mening dashboardim")} secondary />
            </>
          )}
        >
            <div className="intelligence-float-card rounded-[1.75rem] border border-white/14 bg-white/6 p-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">{t("instructor.dashboard.live_oversight", "Jonli nazorat")}</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                <AnimatedNumber value={bundle.groups.length} /> {t("instructor.dashboard.groups", "guruh")}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/66">
                {overview.totalStudents} {t("instructor.dashboard.live_oversight_description", "o'quvchi qo'shimcha tayyorlik va aralashuv signallari bilan kuzatilmoqda.")}
              </p>
          </div>
        </IntelligenceHero>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <IntelligenceMetricCard
            eyebrow={t("instructor.dashboard.groups", "Guruhlar")}
            title={t("instructor.dashboard.student_footprint", "O'quvchi qamrovi")}
            numericValue={overview.totalStudents}
            description={t("instructor.dashboard.student_footprint_description", "Ko'rinadigan barcha guruhlardagi jami o'quvchilar soni.")}
            icon={Users}
          />
          <IntelligenceMetricCard
            eyebrow={t("instructor.dashboard.readiness", "Tayyorlik")}
            title={t("instructor.dashboard.group_readiness", "Guruh tayyorligi")}
            numericValue={overview.avgPass}
            decimals={1}
            suffix="%"
            description={t("instructor.dashboard.group_readiness_description", "Faol cohortlar bo'yicha og'irlikli o'tish ehtimoli signali.")}
            icon={GraduationCap}
            tone={overview.avgPass >= 80 ? "success" : overview.avgPass >= 60 ? "warning" : "danger"}
            delay={0.04}
          />
          <IntelligenceMetricCard
            eyebrow={t("instructor.dashboard.completion", "Yakunlash")}
            title={t("instructor.dashboard.completion_rate", "Yakunlash darajasi")}
            numericValue={overview.avgCompletion}
            decimals={1}
            suffix="%"
            description={t("instructor.dashboard.completion_rate_description", "Guruhlar bo'yicha og'irlikli urinish yakunlash signali.")}
            icon={TrendingUp}
            tone={overview.avgCompletion >= 75 ? "success" : overview.avgCompletion >= 50 ? "warning" : "danger"}
            delay={0.08}
          />
          <IntelligenceMetricCard
            eyebrow={t("instructor.dashboard.intervention", "Aralashuv")}
            title={t("instructor.dashboard.at_risk_students", "Xavf ostidagi o'quvchilar")}
            numericValue={overview.atRiskStudents}
            description={`${overview.examReadyStudents} ${t("instructor.dashboard.exam_ready_description", "o'quvchi allaqachon imtihon tayyorligi chegarasiga yetgan.")}`}
            icon={ShieldAlert}
            tone={overview.atRiskStudents === 0 ? "success" : "warning"}
            delay={0.12}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <IntelligencePanel
            eyebrow={t("instructor.dashboard.group_comparison", "Guruh taqqoslovi")}
            title={t("instructor.dashboard.cohort_ranking", "Cohort tayyorligi reytingi")}
            description={t("instructor.dashboard.cohort_ranking_description", "Instruktor ko'ra oladigan barcha guruhlar bo'yicha tezkor taqqoslash.")} 
          >
            <IntelligenceTopicBarChart data={groupComparison} colorScale={["#38bdf8", "#34d399", "#f59e0b", "#f97316"]} />
          </IntelligencePanel>

          <IntelligencePanel
            eyebrow={t("instructor.dashboard.student_signals", "O'quvchi signallari")}
            title={t("instructor.dashboard.intervention_focus", "Aralashuv fokusi")}
            description={t("instructor.dashboard.intervention_focus_description", "Avval nimaga e'tibor kerak: nofaollik, zaif mavzular yoki past tayyorlik.")} 
            delay={0.06}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <p className="intelligence-eyebrow">{t("instructor.dashboard.at_risk", "Xavf ostida")}</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  <AnimatedNumber value={overview.atRiskStudents} />
                </p>
                  <p className="mt-2 text-sm text-white/62">{t("instructor.dashboard.at_risk_note", "Tayyorlik yoki so'nggi aniqlik chegarasidan past o'quvchilar.")}</p>
              </div>
              <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <p className="intelligence-eyebrow">{t("instructor.dashboard.exam_ready", "Imtihonga tayyor")}</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  <AnimatedNumber value={overview.examReadyStudents} />
                </p>
                  <p className="mt-2 text-sm text-white/62">{t("instructor.dashboard.exam_ready_note", "Guruh analitikasida 80+ tayyorlikka yetgan o'quvchilar.")}</p>
              </div>
              <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <p className="intelligence-eyebrow">{t("instructor.dashboard.weak_topic", "Zaif mavzu")}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{dominantWeakTopic}</p>
                  <p className="mt-2 text-sm text-white/62">{t("instructor.dashboard.weak_topic_note", "Ko'rinadigan guruhlar bo'yicha eng ko'p takrorlangan xato mavzu.")}</p>
              </div>
            </div>
          </IntelligencePanel>
        </div>

        <IntelligencePanel
          eyebrow={t("instructor.dashboard.group_detail", "Guruh tafsiloti")}
          title={t("instructor.dashboard.group_detail_title", "Guruhlar bo'yicha nazorat oynasi")}
          description={t("instructor.dashboard.group_detail_description", "Analitika yuzasidan chiqmasdan guruhlar, risklar va nudge amallarini boshqaring.")}
          delay={0.12}
        >
          <Tabs value={activeGroupId} onValueChange={setActiveGroupId}>
            <TabsList className="mb-4 h-auto max-w-full flex-wrap justify-start rounded-[1.25rem] bg-white/8 p-1">
              {bundle.groups.map((group) => (
                <TabsTrigger
                  key={group.id}
                  value={group.id}
                  className="rounded-[1rem] data-[state=active]:bg-white data-[state=active]:text-slate-950"
                >
                  {group.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {bundle.groups.map((group) => {
              const analytics = bundle.analytics[group.id];
              const topicData = analytics.topic_performance.map((item) => ({
                topic: item.topic,
                value: item.success_rate,
              }));
              const weakTopicData = analytics.weak_topics.map((item) => ({
                label: item.topic,
                value: item.incorrect_answers,
              }));
              const primaryWeakTopic = analytics.weak_topics[0]?.topic;

              return (
                <TabsContent key={group.id} value={group.id} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                      <p className="intelligence-eyebrow">{"O'quvchilar"}</p>
                      <p className="mt-2 text-3xl font-semibold text-white">
                        <AnimatedNumber value={analytics.student_count} />
                      </p>
                    </div>
                    <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                      <p className="intelligence-eyebrow">Guruh tayyorligi</p>
                      <p className="mt-2 text-3xl font-semibold text-white">
                        <AnimatedNumber value={analytics.group_pass_probability} decimals={1} suffix="%" />
                      </p>
                    </div>
                    <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                      <p className="intelligence-eyebrow">Yakunlash</p>
                      <p className="mt-2 text-3xl font-semibold text-white">
                        <AnimatedNumber value={analytics.completion_rate} decimals={1} suffix="%" />
                      </p>
                    </div>
                    <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                      <p className="intelligence-eyebrow">Xavf ostida</p>
                      <p className="mt-2 text-3xl font-semibold text-white">
                        <AnimatedNumber value={analytics.at_risk_students.length} />
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                    <div className="intelligence-float-card rounded-[1.75rem] border border-white/10 bg-white/4 p-4">
                      <p className="intelligence-eyebrow">Mavzu natijalari</p>
                      <IntelligenceTopicBarChart
                        data={topicData}
                        colorScale={["#f97316", "#fb7185", "#38bdf8", "#22c55e", "#a855f7"]}
                      />
                    </div>
                    <div className="intelligence-float-card rounded-[1.75rem] border border-white/10 bg-white/4 p-4">
                      <p className="intelligence-eyebrow">Zaif mavzu bosimi</p>
                      {weakTopicData.length > 0 ? (
                        <IntelligenceProgressChart
                          data={weakTopicData}
                          color="#f59e0b"
                        />
                      ) : (
                        <EmptyIntelligenceState
                          title={t("instructor.dashboard.no_weak_topic_spikes", "Zaif mavzu sakrashlari yo'q")}
                          description={t("instructor.dashboard.no_weak_topic_spikes_description", "Joriy guruhda hozircha ajratilgan zaif mavzu bosimi yo'q.")}
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="intelligence-float-card rounded-[1.75rem] border border-white/10 bg-white/6 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="intelligence-eyebrow">{t("instructor.dashboard.nudge_panel", "Nudge tizimi")}</p>
                          <h3 className="mt-2 text-lg font-medium text-white">{t("instructor.dashboard.nudge_panel_title", "Guruhga tezkor eslatma yuborish")}</h3>
                        </div>
                        <Users className="h-5 w-5 text-cyan-300" />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/62">
                        {t("instructor.dashboard.nudge_panel_description", "Nofaol o'quvchilarni qayta jalb qiling yoki eng zaif mavzu bo'yicha guruhga nudge yuboring.")}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="rounded-full bg-white text-slate-950 hover:bg-white/90"
                          onClick={async () => {
                            setSendingNudge(`${group.id}:inactive`);
                            try {
                              await sendInstructorGroupNudge(group.id, { type: "inactive" });
                            } finally {
                              setSendingNudge(null);
                            }
                          }}
                          disabled={sendingNudge === `${group.id}:inactive`}
                        >
                          {sendingNudge === `${group.id}:inactive` ? "Yuborilmoqda..." : "Nofaol o'quvchilarga nudge"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/10"
                          onClick={async () => {
                            if (!primaryWeakTopic) {
                              return;
                            }
                            setSendingNudge(`${group.id}:weak_topic`);
                            try {
                              await sendInstructorGroupNudge(group.id, {
                                type: "weak_topic",
                                topic: primaryWeakTopic,
                              });
                            } finally {
                              setSendingNudge(null);
                            }
                          }}
                          disabled={!primaryWeakTopic || sendingNudge === `${group.id}:weak_topic`}
                        >
                          {sendingNudge === `${group.id}:weak_topic`
                            ? "Yuborilmoqda..."
                            : primaryWeakTopic
                              ? `${primaryWeakTopic} bo'yicha nudge`
                              : "Zaif mavzu topilmadi"}
                        </Button>
                      </div>
                    </div>

                    <div className="intelligence-float-card rounded-[1.75rem] border border-white/10 bg-white/6 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="intelligence-eyebrow">{t("instructor.dashboard.exam_ready", "Imtihonga tayyor")}</p>
                          <h3 className="mt-2 text-lg font-medium text-white">{t("instructor.dashboard.exam_ready_watch", "Tayyor o'quvchilar nazorati")}</h3>
                        </div>
                        <GraduationCap className="h-5 w-5 text-emerald-300" />
                      </div>
                      <div className="mt-4 space-y-3">
                        {analytics.exam_ready_students.length === 0 ? (
                          <p className="text-sm text-white/62">{"Hozircha 80+ tayyorlikka chiqqan o'quvchi yo'q."}</p>
                        ) : (
                          analytics.exam_ready_students.slice(0, 4).map((student) => (
                            <div key={`${student.user_id}-ready`} className="intelligence-float-card rounded-2xl border border-white/8 bg-black/14 px-3 py-3">
                              <p className="text-sm font-medium text-white">{student.email}</p>
                              <p className="mt-1 text-xs text-emerald-200">{formatPercent(student.readiness_score)} tayyorlik</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
                    <div className="intelligence-float-card rounded-[1.75rem] border border-white/10 bg-white/4 p-4 xl:col-span-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="intelligence-eyebrow">{t("instructor.dashboard.top_students", "Top o'quvchilar")}</p>
                          <h3 className="mt-2 text-lg font-medium text-white">{t("instructor.dashboard.highest_performing_learners", "Eng yaxshi natija ko'rsatayotgan o'quvchilar")}</h3>
                        </div>
                        <Sparkles className="h-5 w-5 text-emerald-300" />
                      </div>
                      <div className="mt-4 space-y-3">
                        {analytics.top_students.map((student, index) => (
                          <div key={`${student.user_id}-top`} className="intelligence-float-card flex items-center justify-between rounded-2xl border border-white/8 bg-black/14 px-3 py-3">
                            <div>
                              <p className="text-sm font-medium text-white">{student.full_name || student.email}</p>
                              <p className="mt-1 text-xs text-white/54">{student.email}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-white">#{index + 1}</p>
                              <p className="mt-1 text-xs text-emerald-200">{formatPercent(student.pass_probability)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="intelligence-float-card rounded-[1.75rem] border border-white/10 bg-white/4 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="intelligence-eyebrow">{t("instructor.dashboard.at_risk_students", "Xavf ostidagi o'quvchilar")}</p>
                          <h3 className="mt-2 text-lg font-medium text-white">{t("instructor.dashboard.needs_intervention", "Aralashuv talab etiladi")}</h3>
                        </div>
                        <AlertTriangle className="h-5 w-5 text-amber-300" />
                      </div>
                      <div className="mt-4 space-y-3">
                        {analytics.at_risk_students.length === 0 ? (
                          <p className="text-sm text-white/62">{t("instructor.dashboard.no_intervention_targets", "Faol aralashuv maqsadlari yo'q.")}</p>
                        ) : (
                          analytics.at_risk_students.map((student) => (
                            <div key={`${student.user_id}-risk`} className="intelligence-float-card rounded-2xl border border-white/8 bg-black/14 px-3 py-3">
                              <p className="text-sm font-medium text-white">{student.email}</p>
                              <p className="mt-1 text-xs text-white/54">{student.risk_reason.replaceAll("_", " ")}</p>
                              <p className="mt-2 text-xs text-amber-200">{formatPercent(student.readiness_score)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="intelligence-float-card rounded-[1.75rem] border border-white/10 bg-white/4 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="intelligence-eyebrow">{t("instructor.dashboard.inactive_students", "Nofaol o'quvchilar")}</p>
                          <h3 className="mt-2 text-lg font-medium text-white">{t("instructor.dashboard.follow_up_queue", "Kuzatuv navbati")}</h3>
                        </div>
                        <BookOpenCheck className="h-5 w-5 text-sky-300" />
                      </div>
                      <div className="mt-4 space-y-3">
                        {analytics.inactive_students.length === 0 ? (
                          <p className="text-sm text-white/62">{t("instructor.dashboard.no_inactive_students", "Bu guruhda nofaol o'quvchilar yo'q.")}</p>
                        ) : (
                          analytics.inactive_students.map((student) => (
                            <div key={`${student.user_id}-inactive`} className="intelligence-float-card rounded-2xl border border-white/8 bg-black/14 px-3 py-3">
                              <p className="text-sm font-medium text-white">{student.email}</p>
                              <p className="mt-1 text-xs text-white/54">{student.days_since_last_activity} kundan beri mashq qilmagan</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/instructor/profile-builder"
                      className="intelligence-float-card inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/8"
                    >
                      Instruktor sozlamalarini ochish
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-100">
                      {`${analytics.exam_ready_students.length} imtihonga tayyor o'quvchi`}
                    </Badge>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </IntelligencePanel>
      </div>
    </div>
  );
}
