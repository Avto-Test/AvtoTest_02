"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BellRing, Users } from "lucide-react";

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
  ProductErrorState,
  ProductEmptyState,
  ProductSkeletonCard,
  SecondaryButton,
  SectionHeader,
  StatCard,
} from "@/components/ui/product-primitives";
import {
  getInstructorDashboardBundle,
  sendInstructorGroupNudge,
  type InstructorDashboardBundle,
} from "@/lib/intelligence";
import { useAuth } from "@/store/useAuth";

function averageWeighted(values: Array<{ value: number; weight: number }>): number {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) {
    return 0;
  }
  const total = values.reduce((sum, item) => sum + (item.value * item.weight), 0);
  return Number((total / totalWeight).toFixed(1));
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

export default function InstructorDashboardSurface() {
  const { t } = useI18n();
  const { token, hydrated, user, fetchUser } = useAuth();
  const [bundle, setBundle] = useState<InstructorDashboardBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);

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
        if (active) {
          setBundle(response);
        }
      } catch {
        if (active) {
          setBundle(null);
          setError(t("instructor.dashboard.load_error", "Ma'lumot topilmadi."));
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

  const analyticsList = useMemo(() => {
    if (!bundle) {
      return [];
    }
    return bundle.groups.map((group) => bundle.analytics[group.id]).filter(Boolean);
  }, [bundle]);

  const overview = useMemo(() => {
    const totalStudents = analyticsList.reduce((sum, item) => sum + item.student_count, 0);
    const groupReadiness = averageWeighted(
      analyticsList.map((item) => ({
        value: item.group_pass_probability,
        weight: Math.max(1, item.student_count),
      })),
    );
    const atRiskStudents = analyticsList.flatMap((item) => item.at_risk_students).slice(0, 5);
    const weakTopics = new Map<string, number>();
    analyticsList.forEach((item) => {
      item.weak_topics.forEach((topic) => {
        weakTopics.set(topic.topic, (weakTopics.get(topic.topic) ?? 0) + topic.incorrect_answers);
      });
    });

    return {
      totalStudents,
      groupReadiness,
      atRiskStudents,
      weakTopics: [...weakTopics.entries()]
        .map(([topic, value]) => ({ topic, value }))
        .sort((left, right) => right.value - left.value)
        .slice(0, 6),
    };
  }, [analyticsList]);

  async function handleNudge(groupId: string, type: "inactive" | "weak_topic", topic?: string) {
    setSending(`${groupId}:${type}`);
    try {
      await sendInstructorGroupNudge(groupId, { type, topic });
    } finally {
      setSending(null);
    }
  }

  if (!hydrated || loading) {
    return <SurfaceSkeleton />;
  }

  if (error || !bundle) {
    return (
      <PageContainer>
        <ProductCard className="product-card-shell">
          <SectionHeader
            eyebrow={t("instructor.dashboard.eyebrow", "Instruktor nazorati")}
            title={t("instructor.dashboard.unavailable_title", "Ma'lumot topilmadi")}
            description={error ?? t("instructor.dashboard.unavailable_description", "Qayta urinib ko'ring.")}
          />
          <ProductErrorState
            description={t("instructor.dashboard.unavailable_body", "Instruktor paneli ma'lumotlari vaqtincha yuklanmadi. Birozdan keyin qayta urinib ko'ring.")}
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
            eyebrow={t("instructor.dashboard.eyebrow", "Instruktor nazorati")}
            title={t("instructor.dashboard.empty_title", "Hali guruhlar biriktirilmagan")}
            description={t("instructor.dashboard.empty_description", "Guruh biriktirilgach tayyorlik, xavf va zaif mavzular shu yerda ko'rinadi.")}
          />
        </ProductCard>
      </PageContainer>
    );
  }

  const readinessChart = bundle.groups.map((group) => ({
    label: group.name,
    value: bundle.analytics[group.id]?.group_pass_probability ?? 0,
  }));

  return (
    <PageContainer className="product-page-stack">
      <ProductCard className="product-card-shell sm:p-8">
        <SectionHeader
          eyebrow={t("instructor.dashboard.eyebrow", "Instruktor nazorati")}
          title={t("instructor.dashboard.title", "Guruh holatini bir qarashda ko'ring")}
          description={t("instructor.dashboard.description", "Qaysi guruh tayyor, qaysi talaba xavf ostida va qaysi mavzular ko'proq xato berayotganini kuzating.")}
          action={(
            <>
              <PrimaryButton asChild>
                <Link href="/instructor/groups">{t("nav.instructor.groups", "Guruhlar")}</Link>
              </PrimaryButton>
              <SecondaryButton asChild>
                <Link href="/instructor/analytics">{t("nav.instructor.analytics", "Analitika")}</Link>
              </SecondaryButton>
            </>
          )}
        />
      </ProductCard>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t("instructor.dashboard.groups", "Guruhlar")}
          title={t("instructor.dashboard.group_readiness", "Guruh tayyorligi")}
          value={`${overview.groupReadiness.toFixed(1)}%`}
          description={t("instructor.dashboard.group_readiness_description", "Barcha guruhlar bo'yicha og'irlikli tayyorlik signali.")}
          icon={Users}
        />
        <StatCard
          label={t("instructor.dashboard.risk", "Xavf")}
          title={t("instructor.dashboard.at_risk_students", "Xavf ostidagi talabalar")}
          value={overview.atRiskStudents.length}
          description={t("instructor.dashboard.at_risk_description", "Past tayyorlik yoki nofaollik sababli kuzatuv talab qiladigan talabalar.")}
          icon={AlertTriangle}
        />
        <StatCard
          label={t("instructor.dashboard.students", "Talabalar")}
          title={t("instructor.dashboard.total_students", "Jami talabalar")}
          value={overview.totalStudents}
          description={t("instructor.dashboard.total_students_description", "Instruktor ko'ra oladigan guruhlar bo'yicha jami talabalar soni.")}
          icon={BellRing}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-7"
          eyebrow={t("instructor.dashboard.readiness_chart", "Guruh tayyorligi")}
          title={t("instructor.dashboard.readiness_chart_title", "Guruhlar taqqoslovi")}
          description={t("instructor.dashboard.readiness_chart_description", "Qaysi guruh imtihonga yaqinroq ekanini ko'ring.")}
        >
          <IntelligenceProgressChart data={readinessChart} color="#2563EB" theme="light" />
        </ChartCard>

        <ChartCard
          className="xl:col-span-5"
          eyebrow={t("instructor.dashboard.weak_topics", "Zaif mavzular")}
          title={t("instructor.dashboard.weak_topics_title", "Ko'p xato berayotgan mavzular")}
          description={t("instructor.dashboard.weak_topics_description", "Barcha guruhlar bo'yicha ko'p takrorlangan xatolar.")}
        >
          {overview.weakTopics.length > 0 ? (
            <IntelligenceTopicBarChart
              data={overview.weakTopics}
              colorScale={["#fb7185", "#f97316", "#38bdf8", "#34d399"]}
              theme="light"
            />
          ) : (
            <ProductEmptyState
              title="Zaif mavzu topilmadi"
              description="Yangi javoblar kelgach qaysi mavzularda ko'proq xato qilinayotgani shu yerda ko'rinadi."
            />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-5"
          eyebrow={t("instructor.dashboard.at_risk", "Xavf ostida")}
          title={t("instructor.dashboard.at_risk_title", "Aralashuv talab qiladigan talabalar")}
          description={t("instructor.dashboard.at_risk_panel_description", "Eng yaqin e'tibor talab qiladigan talabalar ro'yxati.")}
        >
          {overview.atRiskStudents.length === 0 ? (
            <ProductEmptyState
              title="Xavf ostidagi talabalar yo'q"
              description="Hozircha barcha talabalar barqaror holatda. Yangi signal paydo bo'lsa shu yerda ko'rinadi."
            />
          ) : (
            <div className="space-y-3">
              {overview.atRiskStudents.map((student) => (
                <div key={`${student.user_id}-${student.risk_reason}`} className="product-subtle-card-plain px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">{student.email}</p>
                  <p className="mt-1 text-xs text-slate-500">{student.risk_reason.replaceAll("_", " ")}</p>
                  <p className="mt-2 text-sm font-semibold text-amber-600">{student.readiness_score.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard
          className="xl:col-span-7"
          eyebrow={t("instructor.dashboard.nudge", "Nudge tizimi")}
          title={t("instructor.dashboard.nudge_title", "Guruhga eslatma yuborish")}
          description={t("instructor.dashboard.nudge_description", "Nofaol yoki zaif mavzuda qiynalayotgan guruhga tezkor eslatma yuboring.")}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {bundle.groups.map((group) => {
              const analytics = bundle.analytics[group.id];
              const weakTopic = analytics.weak_topics[0]?.topic;
              return (
                <ProductCard key={group.id} className="product-subtle-card shadow-none">
                  <div className="p-[var(--space-stack)]">
                    <p className="text-base font-semibold text-slate-950">{group.name}</p>
                    <div className="sr-only">
                      <p className="sr-only">
                        {analytics.student_count} talaba • {analytics.group_pass_probability.toFixed(1)}%
                      </p>
                      <p className="text-sm text-slate-500">
                      {analytics.student_count} talaba • {analytics.group_pass_probability.toFixed(1)}%
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {analytics.student_count} talaba • {analytics.group_pass_probability.toFixed(1)}%
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <PrimaryButton
                        size="sm"
                        onClick={() => void handleNudge(group.id, "inactive")}
                        disabled={sending === `${group.id}:inactive`}
                      >
                        {sending === `${group.id}:inactive` ? "Yuborilmoqda..." : "Nofaol nudge"}
                      </PrimaryButton>
                      <SecondaryButton
                        size="sm"
                        onClick={() => void handleNudge(group.id, "weak_topic", weakTopic)}
                        disabled={!weakTopic || sending === `${group.id}:weak_topic`}
                      >
                        {weakTopic ? weakTopic : "Zaif mavzu yo'q"}
                      </SecondaryButton>
                    </div>
                  </div>
                </ProductCard>
              );
            })}
          </div>
        </ChartCard>
      </div>
    </PageContainer>
  );
}
