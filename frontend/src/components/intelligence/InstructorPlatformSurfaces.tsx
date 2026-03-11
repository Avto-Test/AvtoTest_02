"use client";

export { default as InstructorDashboardSurface } from "@/components/intelligence/InstructorDashboardSurface";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpenCheck, Send, Users } from "lucide-react";

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
import {
  getInstructorOperationsBundle,
  sendInstructorGroupNudge,
  type InstructorOperationsBundle,
} from "@/lib/intelligence";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n-provider";
import { useAuth } from "@/store/useAuth";

function useInstructorBundle() {
  const { hydrated, token, user, fetchUser } = useAuth();
  const [bundle, setBundle] = useState<InstructorOperationsBundle | null>(null);
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
        const response = await getInstructorOperationsBundle();
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

export function InstructorGroupsSurface() {
  const { t } = useI18n();
  const { bundle, loading, hydrated } = useInstructorBundle();
  const [sending, setSending] = useState<string | null>(null);

  async function handleNudge(groupId: string, type: "inactive" | "weak_topic", topic?: string) {
    setSending(`${groupId}:${type}`);
    try {
      await sendInstructorGroupNudge(groupId, { type, topic });
    } finally {
      setSending(null);
    }
  }

  if (!hydrated || loading) {
    return <IntelligenceLoadingSkeleton />;
  }

  if (!bundle || bundle.groups.length === 0) {
      return (
      <div className="intelligence-page">
        <div className="container-app space-y-6 py-8 sm:py-10">
          <IntelligencePanel eyebrow={t("instructor.groups.eyebrow", "Instruktor guruhlari")} title={t("instructor.groups.empty_panel_title", "Hali guruh yo'q")}>
            <EmptyIntelligenceState
              title={t("instructor.groups.empty_title", "Guruhlar hali yo'q")}
              description={t("instructor.groups.empty_description", "Instruktor platformasini yoqish uchun maktab guruhini yarating yoki qabul qiling.")}
            />
          </IntelligencePanel>
        </div>
      </div>
    );
  }

  return (
    <div className="intelligence-page">
      <div className="container-app space-y-6 py-8 sm:py-10">
        <IntelligenceHero
          eyebrow={t("instructor.groups.eyebrow", "Instruktor guruhlari")}
          title={t("instructor.groups.title", "Guruhlarni bir joydan kuzating va boshqaring.")}
          description={t("instructor.groups.description", "Har bir guruh bo'yicha tayyorlik, zaif mavzular va eslatma yuborish amallari shu yerda jamlanadi.")}
          actions={(
            <>
              <IntelligenceActionButton href="/instructor/dashboard" label={t("nav.dashboard", "Boshqaruv")} />
              <IntelligenceActionButton href="/instructor/students" label={t("nav.instructor.students", "O'quvchilar")} secondary />
            </>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bundle.groups.map((group) => {
            const analytics = bundle.analytics[group.id];
            const weakTopic = analytics?.weak_topics[0]?.topic;
            return (
              <div key={group.id} className="intelligence-float-card rounded-[1.75rem] border border-white/10 bg-white/6 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="intelligence-eyebrow">{t("instructor.groups.group", "Guruh")}</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">{group.name}</h2>
                  </div>
                  <Badge className="border-white/10 bg-white/8 text-white/80">
                    <AnimatedNumber value={group.student_count} /> {t("instructor.groups.students", "o'quvchi")}
                  </Badge>
                </div>
                <div className="mt-4 space-y-2 text-sm text-white/62">
                  <p>{t("instructor.groups.readiness", "Tayyorlik")}: {analytics ? `${analytics.group_pass_probability.toFixed(1)}%` : "--"}</p>
                  <p>{t("instructor.groups.completion", "Yakunlash")}: {analytics ? `${analytics.completion_rate.toFixed(1)}%` : "--"}</p>
                  <p>{t("instructor.groups.invite_code", "Taklif kodi")}: {group.invite_code}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="rounded-full bg-white text-slate-950 hover:bg-white/90"
                    onClick={() => void handleNudge(group.id, "inactive")}
                    disabled={sending === `${group.id}:inactive`}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {t("instructor.groups.inactive_nudge", "Nofaol nudge")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/10"
                    onClick={() => void handleNudge(group.id, "weak_topic", weakTopic)}
                    disabled={!weakTopic || sending === `${group.id}:weak_topic`}
                  >
                    {t("instructor.groups.weak_topic_nudge", "Zaif mavzu nudge")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function InstructorStudentsSurface() {
  const { t } = useI18n();
  const { bundle, loading, hydrated } = useInstructorBundle();

  const students = useMemo(() => {
    if (!bundle) {
      return [];
    }
    return Object.values(bundle.students)
      .flatMap((group) => group.students.map((student) => ({ ...student, group_name: group.group_name })))
      .sort((left, right) => right.pass_probability - left.pass_probability);
  }, [bundle]);

  if (!hydrated || loading) {
    return <IntelligenceLoadingSkeleton />;
  }

  return (
    <div className="intelligence-page">
      <div className="container-app space-y-6 py-8 sm:py-10">
        <IntelligenceHero
          eyebrow={t("instructor.students.eyebrow", "Instruktor o'quvchilari")}
          title={t("instructor.students.title", "Har bir o'quvchining holati aniq ko'rinadi.")}
          description={t("instructor.students.description", "Bu ro'yxat guruhlar bo'yicha o'quvchi progressi, xavf holati va tayyorlik signalini ko'rsatadi.")}
          actions={(
            <>
              <IntelligenceActionButton href="/instructor/groups" label={t("nav.instructor.groups", "Guruhlar")} />
              <IntelligenceActionButton href="/instructor/analytics" label={t("nav.instructor.analytics", "Instruktor analitikasi")} secondary />
            </>
          )}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <IntelligenceMetricCard eyebrow={t("instructor.students.students", "O'quvchilar")} title={t("instructor.students.visible_students", "Ko'rinadigan o'quvchilar")} numericValue={students.length} description={t("instructor.students.visible_students_description", "Instruktor ko'ra oladigan barcha guruhlardan yig'ilgan.")} icon={Users} />
          <IntelligenceMetricCard eyebrow={t("instructor.students.risk", "Xavf")} title={t("instructor.students.at_risk", "Xavf ostida")} numericValue={Object.values(bundle?.analytics ?? {}).reduce((sum, item) => sum + item.at_risk_students.length, 0)} description={t("instructor.students.at_risk_description", "Guruhlar bo'yicha joriy aralashuv maqsadlari.")} icon={AlertTriangle} delay={0.04} />
          <IntelligenceMetricCard eyebrow={t("instructor.students.exam_ready", "Imtihonga tayyor")} title={t("instructor.students.ready_students", "Tayyor o'quvchilar")} numericValue={Object.values(bundle?.analytics ?? {}).reduce((sum, item) => sum + item.exam_ready_students.length, 0)} description={t("instructor.students.ready_students_description", "Tayyorlik chegarasidan o'tgan o'quvchilar.")} icon={BookOpenCheck} delay={0.08} />
        </div>

        <IntelligencePanel eyebrow={t("instructor.students.roster", "Roster")} title={t("instructor.students.progress_table", "O'quvchi progress jadvali")} description={t("instructor.students.progress_table_description", "Har bir o'quvchi uchun XP, coinlar, o'tish ehtimoli va yakunlash ko'rinib turadi.")}>
          {students.length === 0 ? (
            <EmptyIntelligenceState title={t("instructor.students.no_students", "O'quvchilar yo'q")} description={t("instructor.students.no_students_description", "O'quvchilar guruhlarga qo'shilgach roster ko'rinadi.")} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {students.map((student) => (
                <div key={`${student.group_name}-${student.user_id}`} className="intelligence-float-card rounded-[1.35rem] border border-white/10 bg-white/6 p-4">
                  <p className="text-sm font-semibold text-white">{student.full_name || student.email}</p>
                  <p className="mt-1 text-xs text-white/52">{student.group_name}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white/70">
                    <div>XP: {student.xp_total}</div>
                    <div>{t("instructor.students.coins", "Coinlar")}: {student.coins_total}</div>
                    <div>{t("instructor.students.pass", "O'tish")}: {student.pass_probability.toFixed(1)}%</div>
                    <div>{t("instructor.students.completion", "Yakunlash")}: {student.completion_rate.toFixed(1)}%</div>
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

export function InstructorAnalyticsSurface() {
  const { t } = useI18n();
  const { bundle, loading, hydrated } = useInstructorBundle();

  const trendData = useMemo(() => {
    if (!bundle) {
      return [];
    }
    return bundle.groups.map((group) => ({
      label: group.name,
      value: bundle.analytics[group.id]?.group_pass_probability ?? 0,
    }));
  }, [bundle]);

  const weakTopics = useMemo(() => {
    if (!bundle) {
      return [];
    }
    const topicTotals = new Map<string, number>();
    Object.values(bundle.analytics).forEach((item) => {
      item.weak_topics.forEach((topic) => {
        topicTotals.set(topic.topic, (topicTotals.get(topic.topic) ?? 0) + topic.incorrect_answers);
      });
    });
    return [...topicTotals.entries()]
      .map(([topic, value]) => ({ topic, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);
  }, [bundle]);

  if (!hydrated || loading) {
    return <IntelligenceLoadingSkeleton />;
  }

  return (
    <div className="intelligence-page">
      <div className="container-app space-y-6 py-8 sm:py-10">
        <IntelligenceHero
          eyebrow={t("instructor.analytics.eyebrow", "Instruktor analitikasi")}
          title={t("instructor.analytics.title", "Guruh tayyorligi va zaif mavzularni solishtiring.")}
          description={t("instructor.analytics.description", "Bu bo'lim instruktor uchun eng muhim signal: qaysi guruh ortda qolmoqda va qaysi mavzular ko'proq xato qilinmoqda.")} 
          actions={(
            <>
              <IntelligenceActionButton href="/instructor/dashboard" label={t("nav.dashboard", "Boshqaruv")} />
              <IntelligenceActionButton href="/instructor/groups" label={t("nav.instructor.groups", "Guruhlar")} secondary />
            </>
          )}
        />

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <IntelligencePanel eyebrow={t("instructor.analytics.readiness", "Tayyorlik")} title={t("instructor.analytics.readiness_by_group", "Guruhlar bo'yicha tayyorlik")}>
            {trendData.length > 0 ? (
              <IntelligenceProgressChart data={trendData} color="#38bdf8" />
            ) : (
              <EmptyIntelligenceState title={t("instructor.analytics.no_group_trend", "Guruh trendi yo'q")} description={t("instructor.analytics.no_group_trend_description", "Guruh analitikasi hali tayyor emas.")} />
            )}
          </IntelligencePanel>
          <IntelligencePanel eyebrow={t("instructor.analytics.weak_topics", "Zaif mavzular")} title={t("instructor.analytics.weak_topic_heat", "Zaif mavzu bosimi")}>
            {weakTopics.length > 0 ? (
              <IntelligenceTopicBarChart data={weakTopics} />
            ) : (
              <EmptyIntelligenceState title={t("instructor.analytics.no_weak_topic_heat", "Zaif mavzu bosimi yo'q")} description={t("instructor.analytics.no_weak_topic_heat_description", "Zaif mavzu sakrashlari aniqlanmadi.")} />
            )}
          </IntelligencePanel>
        </div>
      </div>
    </div>
  );
}
