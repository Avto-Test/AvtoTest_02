"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  GraduationCap,
  Layers3,
  ShieldCheck,
  Sparkles,
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
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n-provider";
import { schoolNav } from "@/config/navigation";
import {
  estimateReadinessFromStudentSignal,
  getSchoolDashboardBundle,
  type SchoolDashboardBundle,
} from "@/lib/intelligence";
import { useAuth } from "@/store/useAuth";

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

export default function SchoolDashboardSurface() {
  const { t } = useI18n();
  const { token, hydrated, user, fetchUser } = useAuth();
  const [bundle, setBundle] = useState<SchoolDashboardBundle | null>(null);
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
        const response = await getSchoolDashboardBundle();
        if (!active) {
          return;
        }
        setBundle(response);
      } catch (loadError) {
        if (!active) {
          return;
        }
        console.error("School dashboard load failed", loadError);
        setError("O'quv markaz statistikasi yuklanmadi.");
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

  const allStudents = useMemo(() => {
    if (!bundle) {
      return [];
    }
    return Object.values(bundle.students).flatMap((group) => group.students);
  }, [bundle]);

  const analyticsList = useMemo(() => {
    if (!bundle) {
      return [];
    }
    return Object.values(bundle.analytics);
  }, [bundle]);

  const schoolOverview = useMemo(() => {
    const averagePassProbability = average(allStudents.map((student) => student.pass_probability));
    const averageCompletionRate = average(allStudents.map((student) => student.completion_rate));
    const averageReadiness = average(
      allStudents.map((student) => estimateReadinessFromStudentSignal(student.pass_probability, student.completion_rate)),
    );
    const examReadyStudents = analyticsList.reduce((sum, item) => sum + item.exam_ready_students.length, 0);
    return {
      averagePassProbability,
      averageCompletionRate,
      averageReadiness,
      examReadyStudents,
    };
  }, [allStudents, analyticsList]);

  const groupReadinessData = useMemo(() => {
    return analyticsList
      .map((item) => ({
        topic: item.group_name,
        value: item.group_pass_probability,
      }))
      .sort((left, right) => right.value - left.value);
  }, [analyticsList]);

  const weakTopicDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of analyticsList) {
      for (const weak of item.weak_topics) {
        counts.set(weak.topic, (counts.get(weak.topic) ?? 0) + weak.incorrect_answers);
      }
    }
    return [...counts.entries()]
      .map(([topic, value]) => ({ topic, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);
  }, [analyticsList]);

  const completionTrend = useMemo(() => {
    return analyticsList.map((item) => ({
      label: item.group_name,
      value: item.completion_rate,
    }));
  }, [analyticsList]);

  const studentDistribution = useMemo(() => {
    return bundle?.groups.map((group) => ({
      topic: group.name,
      value: group.student_count,
    })) ?? [];
  }, [bundle]);

  const topGroups = useMemo(() => {
    return [...analyticsList]
      .sort((left, right) => right.group_pass_probability - left.group_pass_probability)
      .slice(0, 4);
  }, [analyticsList]);

  const instructorPerformance = useMemo(() => {
    if (!bundle) {
      return [];
    }

    const summary = new Map<string, {
      instructorId: string;
      groups: number;
      students: number;
      passSignals: number[];
      completionSignals: number[];
    }>();

    bundle.groups.forEach((group) => {
      const current = summary.get(group.instructor_id) ?? {
        instructorId: group.instructor_id,
        groups: 0,
        students: 0,
        passSignals: [],
        completionSignals: [],
      };
      current.groups += 1;
      current.students += group.student_count;
      current.passSignals.push(bundle.analytics[group.id]?.group_pass_probability ?? 0);
      current.completionSignals.push(bundle.analytics[group.id]?.completion_rate ?? 0);
      summary.set(group.instructor_id, current);
    });

    return [...summary.values()]
      .map((item) => ({
        ...item,
        label: `Instruktor ${item.instructorId.replaceAll("-", "").slice(0, 6).toUpperCase()}`,
        passAverage: average(item.passSignals),
        completionAverage: average(item.completionSignals),
      }))
      .sort((left, right) => right.passAverage - left.passAverage)
      .slice(0, 4);
  }, [bundle]);

  if (!hydrated || loading) {
    return <IntelligenceLoadingSkeleton />;
  }

  if (error || !bundle) {
    return (
      <div className="intelligence-page">
        <div className="container-app py-8 sm:py-10">
          <SurfaceNav items={schoolNav} className="mb-6" />
          <IntelligencePanel
            eyebrow={t("school.dashboard.eyebrow", "O'quv markaz statistikasi")}
            title={t("school.dashboard.unavailable_title", "Dashboard mavjud emas")}
            description={error ?? "O'quv markaz ma'lumotlari topilmadi."}
          >
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard" className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950">
                Asosiy dashboard
              </Link>
              <Link href="/school/profile-builder" className="rounded-full border border-white/12 px-5 py-3 text-sm font-medium text-white">
                Maktab profili
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
          <SurfaceNav items={schoolNav} />
          <IntelligenceHero
            eyebrow={t("school.dashboard.eyebrow", "O'quv markaz statistikasi")}
            title={t("school.dashboard.empty_title", "Maktab analitikasi guruhlar o'qishni boshlagach faollashadi.")}
            description={t("school.dashboard.empty_description", "Bu sahifa guruh tayyorligi, o'tish ehtimoli, zaif mavzu taqsimoti va instruktor natijalarini jamlaydi. Faollashishi uchun kamida bitta guruh kerak.")}
            badge={bundle.summary.school_name}
            badgeLabel={t("school.dashboard.badge_label", "Maktab")}
            actions={(
              <>
                <IntelligenceActionButton href="/school/profile-builder" label="Maktab profilini boshqarish" />
                <IntelligenceActionButton href="/dashboard" label={t("school.dashboard.user_dashboard", "Foydalanuvchi dashboardi")} secondary />
              </>
            )}
            accent={bundle.branding?.brand_color ?? undefined}
          >
            <div className="intelligence-float-card rounded-[1.75rem] border border-white/14 bg-white/6 p-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">{t("school.dashboard.brand_ready", "Brend tayyor")}</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{bundle.summary.school_name}</p>
              <p className="mt-2 text-sm leading-6 text-white/66">
                {t("school.dashboard.brand_ready_description", "Logo, banner va brand rang tayyor. O'quvchilar guruhlarda faollashgach bu yerda statistik ko'rinish paydo bo'ladi.")}
              </p>
            </div>
          </IntelligenceHero>

          <IntelligencePanel eyebrow="Bo'sh holat" title="Maktab statistikasi hali tayyor emas">
            <EmptyIntelligenceState
              title="Guruhlar hali ishga tushmagan"
              description="Birinchi guruhlar ochilib o'quvchilar mashq qila boshlagach bu yerda tayyorlik, taqsimot va instruktorga oid ko'rsatkichlar ko'rinadi."
            />
          </IntelligencePanel>
        </div>
      </div>
    );
  }

  return (
    <div className="intelligence-page">
      <div className="container-app space-y-6 py-8 sm:py-10">
        <SurfaceNav items={schoolNav} />
        <IntelligenceHero
          eyebrow={t("school.dashboard.eyebrow", "O'quv markaz statistikasi")}
          title={`${bundle.summary.school_name} ${t("school.dashboard.live_title", "bo'yicha joriy tayyorgarlik ko'rinishi")}`}
          description={t("school.dashboard.live_description", "Bu sahifada o'quvchilar soni, o'rtacha tayyorlik, instruktorga oid natijalar, guruh taqqoslovi va taqsimot signallari bir joyga yig'iladi.")}
          badge={bundle.branding?.slug ?? bundle.summary.active_role}
          badgeLabel={t("school.dashboard.badge_label", "Maktab")}
          actions={(
            <>
              <IntelligenceActionButton href="/school/profile-builder" label={t("school.dashboard.brand_profile", "Brend va profil")} />
              <IntelligenceActionButton href="/instructor/dashboard" label={t("school.dashboard.instructor_view", "Instruktor ko'rinishi")} secondary />
            </>
          )}
          accent={bundle.branding?.brand_color ?? undefined}
        >
          <div className="intelligence-float-card rounded-[1.75rem] border border-white/14 bg-white/6 p-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">{t("school.dashboard.branding", "Brending")}</p>
            <div className="mt-3 flex items-center gap-3">
              {bundle.branding?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bundle.branding.logo_url}
                  alt={bundle.summary.school_name}
                  className="h-12 w-12 rounded-2xl border border-white/12 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-white/8">
                  <Building2 className="h-5 w-5 text-white/76" />
                </div>
              )}
              <div>
                <p className="text-lg font-medium text-white">{bundle.summary.school_name}</p>
                <p className="text-sm text-white/60">{bundle.summary.active_role}</p>
              </div>
            </div>
          </div>
        </IntelligenceHero>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <IntelligenceMetricCard
            eyebrow={t("school.dashboard.footprint", "Maktab qamrovi")}
            title={t("school.dashboard.student_count", "O'quvchilar soni")}
            numericValue={bundle.summary.member_count}
            description={`${bundle.summary.group_count} ${t("school.dashboard.student_count_description", "ta guruh hozir platformada ko'rinmoqda.")}`}
            icon={Users}
          />
          <IntelligenceMetricCard
            eyebrow={t("school.dashboard.readiness", "Tayyorlik")}
            title={t("school.dashboard.average_readiness", "O'rtacha tayyorlik")}
            numericValue={schoolOverview.averageReadiness}
            decimals={1}
            suffix="%"
            description={t("school.dashboard.average_readiness_description", "O'quvchi o'tish ehtimoli va yakunlash darajasidan kelib chiqadigan umumiy tayyorlik bahosi.")}
            icon={GraduationCap}
            tone={schoolOverview.averageReadiness >= 80 ? "success" : schoolOverview.averageReadiness >= 60 ? "warning" : "danger"}
            delay={0.04}
          />
          <IntelligenceMetricCard
            eyebrow={t("school.dashboard.prediction_signal", "Bashorat signali")}
            title={t("school.dashboard.pass_probability", "Imtihondan o'tish ehtimoli")}
            numericValue={schoolOverview.averagePassProbability}
            decimals={1}
            suffix="%"
            description={t("school.dashboard.pass_probability_description", "Barcha guruhlar bo'yicha o'rtacha o'tish signali.")}
            icon={ShieldCheck}
            tone={schoolOverview.averagePassProbability >= 80 ? "success" : schoolOverview.averagePassProbability >= 60 ? "warning" : "danger"}
            delay={0.08}
          />
          <IntelligenceMetricCard
            eyebrow={t("school.dashboard.exam_readiness", "Imtihon tayyorligi")}
            title={t("school.dashboard.exam_ready_students", "Imtihonga tayyor o'quvchilar")}
            numericValue={schoolOverview.examReadyStudents}
            description={`${bundle.summary.lead_count} ${t("school.dashboard.exam_ready_description", "ta murojaat maktab profili bilan bog'langan.")}`}
            icon={Sparkles}
            tone={schoolOverview.examReadyStudents > 0 ? "success" : "neutral"}
            delay={0.12}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <IntelligencePanel
            eyebrow={t("school.dashboard.group_ranking", "Guruh taqqoslovi")}
            title={t("school.dashboard.readiness_by_group", "Guruhlar bo'yicha tayyorlik")}
            description={t("school.dashboard.readiness_by_group_description", "Qaysi guruhlar yuqori tayyorlik ko'rsatkichiga chiqayotganini ko'ring.")}
          >
            <IntelligenceTopicBarChart data={groupReadinessData} colorScale={["#38bdf8", "#34d399", "#a855f7", "#f59e0b"]} />
          </IntelligencePanel>

          <IntelligencePanel
            eyebrow={t("school.dashboard.weak_topic_map", "Zaif mavzu xaritasi")}
            title={t("school.dashboard.weak_topic_distribution", "Zaif mavzular taqsimoti")}
            description={t("school.dashboard.weak_topic_distribution_description", "Guruhlar bo'yicha jamlangan noto'g'ri javob bosimi.")}
            delay={0.06}
          >
            {weakTopicDistribution.length > 0 ? (
              <IntelligenceTopicBarChart data={weakTopicDistribution} colorScale={["#f97316", "#fb7185", "#38bdf8", "#eab308"]} />
            ) : (
              <EmptyIntelligenceState
                title={t("school.dashboard.no_weak_topic_spikes", "Zaif mavzu bosimi hali yo'q")}
                description={t("school.dashboard.no_weak_topic_spikes_description", "Ko'proq urinish yakunlangach zaif mavzular taqsimoti paydo bo'ladi.")}
              />
            )}
          </IntelligencePanel>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <IntelligencePanel
            eyebrow={t("school.dashboard.completion", "Yakunlash")}
            title={t("school.dashboard.group_completion_rate", "Guruh yakunlash darajasi")}
            description={t("school.dashboard.group_completion_rate_description", "Maktab bo'yicha guruhlar kesimidagi yakunlash momenti.")}
          >
            <IntelligenceProgressChart data={completionTrend} color="#34d399" />
          </IntelligencePanel>

          <IntelligencePanel
            eyebrow={t("school.dashboard.instructor_performance", "Instruktor samaradorligi")}
            title={t("school.dashboard.instructor_performance_title", "Instruktorlar kesimida natija")}
            description={t("school.dashboard.instructor_performance_description", "Guruh natijalaridan yig'ilgan agregat instruktor ko'rinishi.")}
            delay={0.08}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {instructorPerformance.map((instructor, index) => (
                <div key={instructor.instructorId} className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="intelligence-eyebrow">{t("school.dashboard.rank", "Reyting")} #{index + 1}</p>
                      <h3 className="mt-2 text-lg font-medium text-white">{instructor.label}</h3>
                    </div>
                    <Badge className="border-white/10 bg-white/8 text-white/84">
                      {instructor.students} {t("school.dashboard.students", "o'quvchi")}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="intelligence-float-card rounded-2xl border border-white/8 bg-black/14 p-3">
                      <p className="intelligence-eyebrow">{t("school.dashboard.pass", "O'tish")}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        <AnimatedNumber value={instructor.passAverage} decimals={1} suffix="%" />
                      </p>
                    </div>
                    <div className="intelligence-float-card rounded-2xl border border-white/8 bg-black/14 p-3">
                      <p className="intelligence-eyebrow">{t("school.dashboard.completion", "Yakunlash")}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        <AnimatedNumber value={instructor.completionAverage} decimals={1} suffix="%" />
                      </p>
                    </div>
                    <div className="intelligence-float-card rounded-2xl border border-white/8 bg-black/14 p-3">
                      <p className="intelligence-eyebrow">{t("school.dashboard.groups", "Guruhlar")}</p>
                      <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
                        <Layers3 className="h-4 w-4 text-orange-300" />
                        <AnimatedNumber value={instructor.groups} />
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </IntelligencePanel>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <IntelligencePanel
            eyebrow={t("school.dashboard.distribution", "Taqsimot")}
            title={t("school.dashboard.student_distribution", "Guruhlar bo'yicha o'quvchilar")}
            description={t("school.dashboard.student_distribution_description", "Qaysi guruhda nechta o'quvchi borligini tez ko'rish oynasi.")}
            delay={0.1}
          >
            <IntelligenceTopicBarChart data={studentDistribution} colorScale={["#34d399", "#38bdf8", "#a855f7", "#f59e0b"]} />
          </IntelligencePanel>

          <IntelligencePanel
            eyebrow={t("school.dashboard.top_cohorts", "Top guruhlar")}
            title={t("school.dashboard.high_performing_groups", "Yuqori natijali guruhlar")}
            description={t("school.dashboard.high_performing_groups_description", "O'quv markaz ichida qaysi guruhlar yuqori natija ko'rsatayotganini ko'ring.")}
            delay={0.12}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {topGroups.map((group, index) => (
                <div key={group.group_id} className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="intelligence-eyebrow">Top #{index + 1}</p>
                      <h3 className="mt-2 text-lg font-medium text-white">{group.group_name}</h3>
                    </div>
                    <Badge className="border-white/10 bg-white/8 text-white/84">
                      {group.student_count} {t("school.dashboard.students", "o'quvchi")}
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-white/66">
                    <p>{`O'tish signali: ${group.group_pass_probability.toFixed(1)}%`}</p>
                    <p>{`Yakunlash: ${group.completion_rate.toFixed(1)}%`}</p>
                    <p>{`Zaif mavzular: ${group.weak_topics.length}`}</p>
                  </div>
                </div>
              ))}
            </div>
          </IntelligencePanel>
        </div>

        <IntelligencePanel
          eyebrow={t("school.dashboard.operations", "Operatsiyalar")}
          title={t("school.dashboard.command_strip", "Maktab boshqaruv paneli")}
          description={t("school.dashboard.command_strip_description", "Mavjud platforma yuzalariga tez qaytish yo'llari.")}
          delay={0.14}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Link href="/school/profile-builder" className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4 transition hover:border-sky-300/40 hover:bg-white/10">
              <Building2 className="h-5 w-5 text-sky-300" />
              <h3 className="mt-3 text-base font-medium text-white">{t("school.dashboard.school_branding", "Maktab brendingi")}</h3>
              <p className="mt-2 text-sm leading-6 text-white/62">{t("school.dashboard.school_branding_description", "Logo, banner va brand rangni boshqaring.")}</p>
            </Link>
            <Link href="/school/instructors" className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4 transition hover:border-emerald-300/40 hover:bg-white/10">
              <Layers3 className="h-5 w-5 text-emerald-300" />
              <h3 className="mt-3 text-base font-medium text-white">{t("school.dashboard.instructor_analytics", "Instruktorlar")}</h3>
              <p className="mt-2 text-sm leading-6 text-white/62">{t("school.dashboard.instructor_analytics_description", "Instruktorlar kesimidagi agregat natijalarni ko'ring.")}</p>
            </Link>
            <Link href="/school/groups" className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4 transition hover:border-amber-300/40 hover:bg-white/10">
              <BarChart3 className="h-5 w-5 text-amber-300" />
              <h3 className="mt-3 text-base font-medium text-white">{t("school.dashboard.group_overview", "Guruhlar ko'rinishi")}</h3>
              <p className="mt-2 text-sm leading-6 text-white/62">{t("school.dashboard.group_overview_description", "Har bir guruhning tayyorligi va a'zolari bo'yicha tezkor ko'rinish.")}</p>
            </Link>
            <div className="intelligence-float-card rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
              <Sparkles className="h-5 w-5 text-fuchsia-300" />
              <h3 className="mt-3 text-base font-medium text-white">{t("school.dashboard.weak_topic_watch", "Zaif mavzu kuzatuvi")}</h3>
              <p className="mt-2 text-sm leading-6 text-white/62">
                {weakTopicDistribution[0]?.topic ?? t("school.dashboard.no_topic_pressure", "Hali bosim yo'q")} {t("school.dashboard.weak_topic_watch_description", "hozir eng ko'p uchrayotgan zaiflik sifatida ko'rinmoqda.")}
              </p>
            </div>
          </div>
        </IntelligencePanel>
      </div>
    </div>
  );
}
