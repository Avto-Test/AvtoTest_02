"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  GraduationCap,
  Layers3,
} from "lucide-react";

import {
  IntelligenceProgressChart,
  IntelligenceTopicBarChart,
} from "@/components/intelligence/IntelligenceCharts";
import { useI18n } from "@/components/i18n-provider";
import {
  ChartCard,
  PageContainer,
  PrimaryButton,
  ProductCard,
  ProductEmptyState,
  ProductErrorState,
  ProductSkeletonCard,
  SecondaryButton,
  SectionHeader,
  StatCard,
} from "@/components/ui/product-primitives";
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

function SurfaceSkeleton() {
  return (
    <PageContainer className="product-page-stack">
      <ProductSkeletonCard className="min-h-[140px]" lines={3} />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <ProductSkeletonCard key={index} className="min-h-[240px]" lines={4} />
        ))}
      </div>
    </PageContainer>
  );
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
        if (active) {
          setBundle(response);
        }
      } catch {
        if (active) {
          setBundle(null);
          setError(t("school.dashboard.load_error", "Ma'lumot topilmadi."));
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

  const overview = useMemo(() => {
    return {
      averageReadiness: average(
        allStudents.map((student) => estimateReadinessFromStudentSignal(student.pass_probability, student.completion_rate)),
      ),
      averagePassProbability: average(allStudents.map((student) => student.pass_probability)),
      examReadyStudents: analyticsList.reduce((sum, item) => sum + item.exam_ready_students.length, 0),
    };
  }, [allStudents, analyticsList]);

  const groupComparison = useMemo(() => {
    return analyticsList
      .map((item) => ({
        topic: item.group_name,
        value: item.group_pass_probability,
      }))
      .sort((left, right) => right.value - left.value);
  }, [analyticsList]);

  const studentDistribution = useMemo(() => {
    return bundle?.groups.map((group) => ({
      topic: group.name,
      value: group.student_count,
    })) ?? [];
  }, [bundle]);

  const instructorPerformance = useMemo(() => {
    if (!bundle) {
      return [];
    }

    const stats = new Map<string, { groups: number; students: number; readiness: number[] }>();
    bundle.groups.forEach((group) => {
      const current = stats.get(group.instructor_id) ?? { groups: 0, students: 0, readiness: [] };
      current.groups += 1;
      current.students += group.student_count;
      current.readiness.push(bundle.analytics[group.id]?.group_pass_probability ?? 0);
      stats.set(group.instructor_id, current);
    });

    return [...stats.entries()].map(([instructorId, item]) => ({
      instructorId,
      label: `Instruktor ${instructorId.replaceAll("-", "").slice(0, 6).toUpperCase()}`,
      groups: item.groups,
      students: item.students,
      readiness: average(item.readiness),
    }));
  }, [bundle]);

  if (!hydrated || loading) {
    return <SurfaceSkeleton />;
  }

  if (error || !bundle) {
    return (
      <PageContainer>
        <ProductCard className="product-card-shell">
          <SectionHeader
            eyebrow={t("school.dashboard.eyebrow", "O'quv markaz statistikasi")}
            title={t("school.dashboard.unavailable_title", "Ma'lumot topilmadi")}
            description={error ?? t("school.dashboard.unavailable_description", "Qayta urinib ko'ring.")}
          />
          <ProductErrorState
            description={t("school.dashboard.unavailable_body", "O'quv markaz statistikasi vaqtincha yuklanmadi. Birozdan keyin qayta urinib ko'ring.")}
            action={<PrimaryButton onClick={() => window.location.reload()}>{t("common.retry", "Qayta urinib ko'ring")}</PrimaryButton>}
          />
        </ProductCard>
      </PageContainer>
    );
  }

  if (bundle.groups.length === 0) {
    return (
      <PageContainer>
        <ProductCard className="product-card-shell">
          <SectionHeader
            eyebrow={t("school.dashboard.eyebrow", "O'quv markaz statistikasi")}
            title={t("school.dashboard.empty_title", "Hali faol guruhlar yo'q")}
            description={t("school.dashboard.empty_description", "Guruhlar ishga tushgach bu yerda markaz bo'yicha tayyorlik va progress ko'rinadi.")}
          />
        </ProductCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="product-page-stack">
      <ProductCard className="product-card-shell sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            {bundle.branding?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bundle.branding.logo_url} alt={bundle.summary.school_name} className="h-16 w-16 rounded-[var(--radius-card)] border border-slate-200 object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-card)] border border-slate-200 bg-slate-50 text-slate-600">
                <Building2 className="h-6 w-6" />
              </div>
            )}
            <div>
              <p className="product-meta-text">
                {t("school.dashboard.eyebrow", "O'quv markaz statistikasi")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                {bundle.summary.school_name} {t("school.dashboard.title_suffix", "bo'yicha umumiy holat")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {t("school.dashboard.description", "Maktab bo'yicha talabalar soni, o'rtacha tayyorgarlik va guruhlar taqqoslovi shu sahifada ko'rinadi.")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton asChild>
              <Link href="/school/groups">{t("nav.school.groups", "Guruhlar")}</Link>
            </PrimaryButton>
            <SecondaryButton asChild>
              <Link href="/school/instructors">{t("nav.school.instructors", "Instruktorlar")}</Link>
            </SecondaryButton>
          </div>
        </div>
      </ProductCard>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t("school.dashboard.students", "Talabalar")}
          title={t("school.dashboard.total_students", "Jami talabalar")}
          value={bundle.summary.member_count}
          description={t("school.dashboard.total_students_description", "Markaz bo'yicha ko'rinadigan jami talabalar soni.")}
          icon={GraduationCap}
        />
        <StatCard
          label={t("school.dashboard.readiness", "Tayyorgarlik")}
          title={t("school.dashboard.average_readiness", "O'rtacha tayyorgarlik")}
          value={`${overview.averageReadiness.toFixed(1)}%`}
          description={t("school.dashboard.average_readiness_description", "Talabalar natijalaridan kelib chiqadigan umumiy tayyorgarlik.")}
          icon={BarChart3}
        />
        <StatCard
          label={t("school.dashboard.exam_ready", "Imtihon")}
          title={t("school.dashboard.exam_ready_students", "Imtihonga tayyorlar")}
          value={overview.examReadyStudents}
          description={t("school.dashboard.exam_ready_description", "80+ tayyorgarlik chegarasidan o'tgan talabalar soni.")}
          icon={Layers3}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-6"
          eyebrow={t("school.dashboard.group_comparison", "Guruhlar taqqoslovi")}
          title={t("school.dashboard.group_comparison_title", "Qaysi guruh kuchliroq?")}
          description={t("school.dashboard.group_comparison_description", "Guruhlar bo'yicha o'tish signali taqqoslovi.")}
        >
          {groupComparison.length > 0 ? (
            <IntelligenceTopicBarChart
              data={groupComparison}
              colorScale={["#2563EB", "#22C55E", "#A855F7", "#F59E0B"]}
              theme="light"
            />
          ) : (
            <ProductEmptyState
              title="Guruhlar taqqoslovi hali yo'q"
              description="Faol guruh natijalari shakllangach taqqoslov shu yerda ko'rinadi."
            />
          )}
        </ChartCard>

        <ChartCard
          className="xl:col-span-6"
          eyebrow={t("school.dashboard.student_distribution", "Talabalar taqsimoti")}
          title={t("school.dashboard.student_distribution_title", "Guruhlar kesimida taqsimot")}
          description={t("school.dashboard.student_distribution_description", "Qaysi guruhda nechta talaba borligini ko'ring.")}
        >
          {studentDistribution.length > 0 ? (
            <IntelligenceTopicBarChart
              data={studentDistribution}
              colorScale={["#22C55E", "#2563EB", "#F59E0B", "#FB7185"]}
              theme="light"
            />
          ) : (
            <ProductEmptyState
              title="Talabalar taqsimoti hali tayyor emas"
              description="Guruhlar bo'yicha talabalar soni shu yerda ko'rinadi."
            />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-5"
          eyebrow={t("school.dashboard.pass_probability", "O'tish signali")}
          title={t("school.dashboard.pass_probability_title", "Maktab bo'yicha o'tish ehtimoli")}
          description={t("school.dashboard.pass_probability_description", "Talabalar bo'yicha umumiy o'tish signali.")}
        >
          <div className="product-subtle-card p-[var(--space-card)]">
            <p className="product-value-text">{overview.averagePassProbability.toFixed(1)}%</p>
          </div>
          <div className="mt-6">
            <IntelligenceProgressChart
              data={bundle.groups.map((group) => ({
                label: group.name,
                value: bundle.analytics[group.id]?.completion_rate ?? 0,
              }))}
              color="#22C55E"
              theme="light"
            />
          </div>
        </ChartCard>

        <ChartCard
          className="xl:col-span-7"
          eyebrow={t("school.dashboard.instructor_performance", "Instruktorlar")}
          title={t("school.dashboard.instructor_performance_title", "Instruktor natijalari")}
          description={t("school.dashboard.instructor_performance_description", "Instruktorlar kesimida guruh va tayyorgarlik natijalari.")}
        >
          <div className="space-y-3">
            {instructorPerformance.length > 0 ? instructorPerformance.map((instructor) => (
              <div key={instructor.instructorId} className="product-subtle-card-plain flex items-center justify-between px-4 py-3">
                <div className="sr-only">
                  <p className="text-sm font-medium text-slate-900">{instructor.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{instructor.groups} guruh • {instructor.students} talaba</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{instructor.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{instructor.groups} guruh • {instructor.students} talaba</p>
                </div>
                <span className="text-sm font-semibold text-slate-900">{instructor.readiness.toFixed(1)}%</span>
              </div>
            )) : (
              <ProductEmptyState
                title="Instruktor natijasi hali ko'rinmayapti"
                description="Instruktorlar faol bo'lgach ularning guruh va tayyorgarlik ko'rsatkichlari shu yerda chiqadi."
              />
            )}
          </div>
        </ChartCard>
      </div>
    </PageContainer>
  );
}
