"use client";

export { default as SchoolDashboardSurface } from "@/components/intelligence/SchoolDashboardSurface";

import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Layers3, Users } from "lucide-react";

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
import { estimateReadinessFromStudentSignal, getSchoolDashboardBundle, type SchoolDashboardBundle } from "@/lib/intelligence";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n-provider";
import { useAuth } from "@/store/useAuth";

function useSchoolBundle() {
  const { hydrated, token, user, fetchUser } = useAuth();
  const [bundle, setBundle] = useState<SchoolDashboardBundle | null>(null);
  const [loading, setLoading] = useState(true);

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
      try {
        const response = await getSchoolDashboardBundle();
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

  return { bundle, loading, hydrated };
}

export function SchoolGroupsSurface() {
  const { t } = useI18n();
  const { bundle, loading, hydrated } = useSchoolBundle();

  if (!hydrated || loading) {
    return <IntelligenceLoadingSkeleton />;
  }

  if (!bundle || bundle.groups.length === 0) {
      return (
      <div className="intelligence-page">
        <div className="container-app space-y-6 py-8 sm:py-10">
          <IntelligencePanel eyebrow={t("school.groups.eyebrow", "Maktab guruhlari")} title={t("school.groups.empty_panel_title", "Hali guruh yo'q")}>
            <EmptyIntelligenceState title={t("school.groups.empty_title", "Maktab guruhlari yo'q")} description={t("school.groups.empty_description", "Maktab ierarxiyasi to'ldirilgach guruhlar shu yerda ko'rinadi.")} />
          </IntelligencePanel>
        </div>
      </div>
    );
  }

  return (
    <div className="intelligence-page">
      <div className="container-app space-y-6 py-8 sm:py-10">
        <IntelligenceHero
          eyebrow={t("school.groups.eyebrow", "Maktab guruhlari")}
          title={`${bundle.summary.school_name} ${t("school.groups.title_suffix", "guruhlari bir qarashda.")}`}
          description={t("school.groups.description", "Har bir guruh bo'yicha tayyorlik, yakunlash va imtihonga tayyor o'quvchilar ko'rsatiladi.")}
          actions={(
            <>
              <IntelligenceActionButton href="/school/dashboard" label={t("nav.dashboard", "Boshqaruv")} />
              <IntelligenceActionButton href="/school/instructors" label={t("nav.school.instructors", "Instruktorlar")} secondary />
            </>
          )}
          accent={bundle.branding?.brand_color ?? undefined}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bundle.groups.map((group) => {
            const analytics = bundle.analytics[group.id];
            return (
              <div key={group.id} className="intelligence-float-card rounded-[1.75rem] border border-white/10 bg-white/6 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="intelligence-eyebrow">{t("school.groups.group", "Guruh")}</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">{group.name}</h2>
                  </div>
                  <Badge className="border-white/10 bg-white/8 text-white/80">
                    <AnimatedNumber value={group.student_count} /> {t("school.groups.students", "o'quvchi")}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white/68">
                  <div>{t("school.groups.readiness", "Tayyorlik")}: {analytics.group_pass_probability.toFixed(1)}%</div>
                  <div>{t("school.groups.completion", "Yakunlash")}: {analytics.completion_rate.toFixed(1)}%</div>
                  <div>{t("school.groups.weak_topics", "Zaif mavzular")}: {analytics.weak_topics.length}</div>
                  <div>{t("school.groups.exam_ready", "Imtihonga tayyor")}: {analytics.exam_ready_students.length}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SchoolInstructorsSurface() {
  const { t } = useI18n();
  const { bundle, loading, hydrated } = useSchoolBundle();

  const instructors = useMemo(() => {
    if (!bundle) {
      return [];
    }
    const map = new Map<string, {
      instructor_id: string;
      groups: number;
      students: number;
      average_pass: number[];
      average_completion: number[];
    }>();

    bundle.groups.forEach((group) => {
      const entry = map.get(group.instructor_id) ?? {
        instructor_id: group.instructor_id,
        groups: 0,
        students: 0,
        average_pass: [],
        average_completion: [],
      };
      entry.groups += 1;
      entry.students += group.student_count;
      entry.average_pass.push(bundle.analytics[group.id]?.group_pass_probability ?? 0);
      entry.average_completion.push(bundle.analytics[group.id]?.completion_rate ?? 0);
      map.set(group.instructor_id, entry);
    });

    return [...map.values()].map((item) => ({
      ...item,
      average_pass: item.average_pass.reduce((sum, value) => sum + value, 0) / Math.max(1, item.average_pass.length),
      average_completion: item.average_completion.reduce((sum, value) => sum + value, 0) / Math.max(1, item.average_completion.length),
      label: `Instruktor ${item.instructor_id.replaceAll("-", "").slice(0, 6).toUpperCase()}`,
    }));
  }, [bundle]);

  if (!hydrated || loading) {
    return <IntelligenceLoadingSkeleton />;
  }

  return (
    <div className="intelligence-page">
      <div className="container-app space-y-6 py-8 sm:py-10">
        <IntelligenceHero
          eyebrow={t("school.instructors.eyebrow", "Maktab instruktorlari")}
          title={t("school.instructors.title", "Instruktorlar natijasini umumiy ko'rinishda baholang.")}
          description={t("school.instructors.description", "Bu bo'lim har bir instruktorga biriktirilgan guruhlar natijasini jamlangan holda ko'rsatadi.")}
          actions={(
            <>
              <IntelligenceActionButton href="/school/groups" label={t("nav.school.groups", "Guruhlar")} />
              <IntelligenceActionButton href="/school/analytics" label={t("nav.school.analytics", "Maktab analitikasi")} secondary />
            </>
          )}
          accent={bundle?.branding?.brand_color ?? undefined}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <IntelligenceMetricCard eyebrow={t("school.instructors.instructors", "Instruktorlar")} title={t("school.instructors.visible_instructors", "Ko'rinadigan instruktorlar")} numericValue={instructors.length} description={t("school.instructors.visible_instructors_description", "Joriy maktab guruhlaridan hosil qilinadi.")} icon={Users} />
          <IntelligenceMetricCard eyebrow={t("school.instructors.groups", "Guruhlar")} title={t("school.instructors.managed_groups", "Boshqarilayotgan guruhlar")} numericValue={bundle?.groups.length ?? 0} description={t("school.instructors.managed_groups_description", "Maktab doirasidagi faol guruhlar soni.")} icon={Layers3} delay={0.04} />
          <IntelligenceMetricCard eyebrow={t("school.instructors.students", "O'quvchilar")} title={t("school.instructors.tracked_students", "Kuzatilayotgan o'quvchilar")} numericValue={bundle?.summary.member_count ?? 0} description={t("school.instructors.tracked_students_description", "Maktab a'zoligi qamrovi.")} icon={GraduationCap} delay={0.08} />
        </div>

        <IntelligencePanel eyebrow={t("school.instructors.performance", "Instruktor natijalari")} title={t("school.instructors.aggregated_view", "Agregat instruktor ko'rinishi")}>
          {instructors.length === 0 ? (
            <EmptyIntelligenceState title={t("school.instructors.no_instructors", "Instruktorlar ko'rinmayapti")} description={t("school.instructors.no_instructors_description", "Guruhlar biriktirilgach instruktor natijalari shu yerda paydo bo'ladi.")} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {instructors.map((instructor) => (
                <div key={instructor.instructor_id} className="intelligence-float-card rounded-[1.35rem] border border-white/10 bg-white/6 p-4">
                  <p className="text-sm font-semibold text-white">{instructor.label}</p>
                  <div className="mt-4 space-y-2 text-sm text-white/66">
                    <p>{t("school.instructors.groups", "Guruhlar")}: {instructor.groups}</p>
                    <p>{t("school.instructors.students", "O'quvchilar")}: {instructor.students}</p>
                    <p>{t("school.instructors.pass_signal", "O'tish signali")}: {instructor.average_pass.toFixed(1)}%</p>
                    <p>{t("school.instructors.completion", "Yakunlash")}: {instructor.average_completion.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </IntelligencePanel>
      </div>
    </div>
  );
}

export function SchoolAnalyticsSurface() {
  const { t } = useI18n();
  const { bundle, loading, hydrated } = useSchoolBundle();

  const readinessByGroup = useMemo(() => {
    if (!bundle) {
      return [];
    }
    return bundle.groups.map((group) => ({
      label: group.name,
      value: bundle.analytics[group.id]?.group_pass_probability ?? 0,
    }));
  }, [bundle]);

  const enrollmentDistribution = useMemo(() => {
    if (!bundle) {
      return [];
    }
    return bundle.groups.map((group) => ({
      topic: group.name,
      value: group.student_count,
    }));
  }, [bundle]);

  const schoolReadiness = useMemo(() => {
    if (!bundle) {
      return 0;
    }
    const allStudents = Object.values(bundle.students).flatMap((group) => group.students);
    if (allStudents.length === 0) {
      return 0;
    }
    const total = allStudents.reduce(
      (sum, student) => sum + estimateReadinessFromStudentSignal(student.pass_probability, student.completion_rate),
      0,
    );
    return total / allStudents.length;
  }, [bundle]);

  if (!hydrated || loading) {
    return <IntelligenceLoadingSkeleton />;
  }

  return (
    <div className="intelligence-page">
      <div className="container-app space-y-6 py-8 sm:py-10">
        <IntelligenceHero
          eyebrow={t("school.analytics.eyebrow", "Maktab analitikasi")}
          title={t("school.analytics.title", "Maktab natijalari umumiy ko'rinishda.")} 
          description={t("school.analytics.description", "Guruh tayyorligi, o'quvchilar taqsimoti va instruktorga bog'langan natijalar soddalashtirilgan holda ko'rsatiladi.")}
          actions={(
            <>
              <IntelligenceActionButton href="/school/dashboard" label={t("nav.dashboard", "Boshqaruv")} />
              <IntelligenceActionButton href="/school/groups" label={t("nav.school.groups", "Guruhlar")} secondary />
            </>
          )}
          accent={bundle?.branding?.brand_color ?? undefined}
        >
          <div className="intelligence-float-card rounded-[1.75rem] border border-white/14 bg-white/6 p-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">{t("school.analytics.average_readiness", "O'rtacha tayyorlik")}</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
              <AnimatedNumber value={schoolReadiness} decimals={1} suffix="%" />
            </p>
          </div>
        </IntelligenceHero>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <IntelligencePanel eyebrow={t("school.analytics.readiness", "Tayyorlik")} title={t("school.analytics.group_readiness_metrics", "Guruh tayyorligi ko'rsatkichlari")}>
            {readinessByGroup.length > 0 ? (
              <IntelligenceProgressChart data={readinessByGroup} color="#38bdf8" />
            ) : (
              <EmptyIntelligenceState title="Tayyorlik ma'lumoti hali yo'q" description="Guruh tayyorligi ko'rsatkichlari hali shakllanmagan." />
            )}
          </IntelligencePanel>
          <IntelligencePanel eyebrow={t("school.analytics.enrollment", "Qamrov")} title={t("school.analytics.student_distribution", "O'quvchi progress taqsimoti")}>
            {enrollmentDistribution.length > 0 ? (
              <IntelligenceTopicBarChart data={enrollmentDistribution} colorScale={["#34d399", "#38bdf8", "#a855f7", "#f59e0b"]} />
            ) : (
              <EmptyIntelligenceState title="O'quvchilar taqsimoti hali yo'q" description="O'quvchilar taqsimoti keyinroq shakllanadi." />
            )}
          </IntelligencePanel>
        </div>
      </div>
    </div>
  );
}
