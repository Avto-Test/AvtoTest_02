"use client";

import { useEffect, useState } from "react";
import { Activity, BrainCircuit, Globe2, ShieldAlert } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  IntelligenceMetricCard,
  IntelligenceMiniMetric,
  IntelligencePanel,
  IntelligenceSectionHeader,
} from "@/components/intelligence/IntelligencePrimitives";
import {
  IntelligenceProgressChart,
  IntelligenceTopicBarChart,
} from "@/components/intelligence/IntelligenceCharts";
import { SurfaceNav } from "@/components/intelligence/SurfaceNav";
import { useI18n } from "@/components/i18n-provider";
import { adminNav } from "@/config/navigation";
import { getAdminMlStatus, getAdminNationalLearningInsights, getAdminSystemStats } from "@/lib/admin";
import type {
  AdminMlStatus,
  AdminNationalLearningInsights,
  AdminSystemStats,
} from "@/schemas/admin.schema";

export default function AdminMlSurface() {
  const { t } = useI18n();
  const [mlStatus, setMlStatus] = useState<AdminMlStatus | null>(null);
  const [systemStats, setSystemStats] = useState<AdminSystemStats | null>(null);
  const [nationalInsights, setNationalInsights] = useState<AdminNationalLearningInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [ml, stats, national] = await Promise.all([
          getAdminMlStatus(),
          getAdminSystemStats(),
          getAdminNationalLearningInsights(),
        ]);
        if (!active) {
          return;
        }
        setMlStatus(ml);
        setSystemStats(stats);
        setNationalInsights(national);
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

  const regionalTrend = nationalInsights?.regional_benchmarks.slice(0, 6).map((item) => ({
    label: `${item.region}/${item.city}`,
    value: item.average_readiness,
  })) ?? [];

  const failedTopics = nationalInsights?.top_failed_topics.slice(0, 8).map((item) => ({
    topic: item.topic,
    value: item.failure_rate,
  })) ?? [];

  return (
    <AdminLayout
      title={t("admin.ml.title", "ML va intellekt")}
      description={t("admin.ml.description", "Joriy backend admin endpointlari orqali model holati, drift va milliy o'quv intellekti ko'rinishi.")}
    >
      <div className="space-y-6">
        <div className="intelligence-panel p-6">
          <SurfaceNav items={adminNav} />
          <div className="mt-6">
            <IntelligenceSectionHeader
              eyebrow={t("admin.ml.section_eyebrow", "ML kuzatuv")}
              title={t("admin.ml.section_title", "Model holati va milliy o'quv signali")}
              description={t("admin.ml.section_description", "Joriy model versiyasi, trening metama'lumoti, drift ogohlantirishlari va milliy mavzu bosimi shu yerda ko'rinadi.")}
              badge={mlStatus?.current_model_version ?? t("admin.ml.no_model", "Model topilmadi")}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <IntelligenceMetricCard
            eyebrow={t("admin.ml.model_version", "Model versiyasi")}
            title={t("admin.ml.current_model", "Joriy model")}
            value={loading ? "..." : (mlStatus?.current_model_version ?? "noma'lum")}
            description={t("admin.ml.current_model_description", "Backend tomonidan yuklangan joriy ansambl model versiyasi.")}
            icon={BrainCircuit}
          />
          <IntelligenceMetricCard
            eyebrow={t("admin.ml.training", "Trening")}
            title={t("admin.ml.dataset_size", "Dataset hajmi")}
            numericValue={mlStatus?.training_dataset_size ?? 0}
            description={t("admin.ml.dataset_size_description", "Model registry metadata'sida qayd etilgan trening dataset hajmi.")}
            icon={Activity}
            delay={0.04}
          />
          <IntelligenceMetricCard
            eyebrow={t("admin.ml.drift", "Drift")}
            title={t("admin.ml.drift_status", "Drift holati")}
            value={loading ? "..." : (mlStatus?.drift_status ?? "noma'lum")}
            description={t("admin.ml.drift_status_description", "Admin ML endpointidan olingan joriy drift kuzatuv holati.")}
            icon={ShieldAlert}
            tone={mlStatus?.drift_status === "stable" || mlStatus?.drift_status === "barqaror" ? "success" : "warning"}
            delay={0.08}
          />
          <IntelligenceMetricCard
            eyebrow={t("admin.ml.national", "Milliy")}
            title={t("admin.ml.average_readiness", "Tayyorlik o'rtachasi")}
            numericValue={nationalInsights?.national_readiness_average ?? 0}
            decimals={1}
            suffix="%"
            description={t("admin.ml.average_readiness_description", "Milliy intellekt xizmatidan kelgan jamlangan tayyorlik ko'rsatkichi.")}
            icon={Globe2}
            delay={0.12}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <IntelligencePanel
            eyebrow={t("admin.ml.training_status", "Trening holati")}
            title={t("admin.ml.training_status_title", "Model tayyorlash va artefakt holati")}
            description={t("admin.ml.training_status_description", "Ensemble pipeline uchun oxirgi trening metama'lumotlari.")}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <IntelligenceMiniMetric
                label={t("admin.ml.training_timestamp", "Trening vaqti")}
                value={mlStatus?.training_timestamp ? new Date(mlStatus.training_timestamp).toLocaleString("uz-UZ") : "Noma'lum"}
                description={t("admin.ml.training_timestamp_description", "Model registry'da qayd etilgan artefakt yaratish vaqti.")}
              />
              <IntelligenceMiniMetric
                label={t("admin.ml.last_training_time", "Oxirgi trening")}
                value={mlStatus?.last_training_time ? new Date(mlStatus.last_training_time).toLocaleString("uz-UZ") : "Noma'lum"}
                description={t("admin.ml.last_training_time_description", "Admin endpoint qaytargan so'nggi trening vaqti.")}
              />
            </div>
          </IntelligencePanel>

          <IntelligencePanel
            eyebrow={t("admin.ml.drift_overview", "Drift ogohlantirishlari")}
            title={t("admin.ml.drift_overview_title", "Drift va kuzatuv xulosasi")}
            description={t("admin.ml.drift_overview_description", "Model monitoring qatlamidagi eng muhim signal shu yerda jamlanadi.")}
            delay={0.06}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <IntelligenceMiniMetric
                label={t("admin.ml.drift_status", "Drift holati")}
                value={mlStatus?.drift_status ?? "Noma'lum"}
                tone={mlStatus?.drift_status === "stable" || mlStatus?.drift_status === "barqaror" ? "success" : "warning"}
              />
              <IntelligenceMiniMetric
                label={t("admin.ml.dataset_size", "Dataset hajmi")}
                value={mlStatus?.training_dataset_size ?? 0}
              />
              <IntelligenceMiniMetric
                label={t("admin.ml.top_weekly_xp", "Haftalik top XP")}
                value={systemStats?.top_user_xp_weekly ?? 0}
              />
            </div>
          </IntelligencePanel>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <IntelligencePanel
            eyebrow={t("admin.ml.regional_benchmark", "Hududiy benchmark")}
            title={t("admin.ml.regional_readiness", "Hududlar bo'yicha tayyorlik")}
            description={t("admin.ml.regional_readiness_description", "Faqat jamlangan benchmarklar, individual o'quvchi ma'lumoti yo'q.")}
          >
            <IntelligenceProgressChart data={regionalTrend} color="#38bdf8" />
          </IntelligencePanel>

          <IntelligencePanel
            eyebrow={t("admin.ml.failed_topics", "Xato mavzular")}
            title={t("admin.ml.failed_topics_heatmap", "Milliy zaif mavzular xaritasi")}
            description={t("admin.ml.failed_topics_heatmap_description", "Jamlangan attempt-answer xatolariga asoslangan eng qiyin mavzular.")}
            delay={0.06}
          >
            <IntelligenceTopicBarChart data={failedTopics} colorScale={["#f97316", "#fb7185", "#38bdf8", "#eab308"]} />
          </IntelligencePanel>
        </div>

        <IntelligencePanel
          eyebrow={t("admin.ml.operational_stats", "Operatsion statistika")}
          title={t("admin.ml.system_signals", "Tizim darajasidagi ML va engagement signallari")}
          description={t("admin.ml.system_signals_description", "Backend kontraktlarini o'zgartirmagan holda adminlar uchun monitoring oynasi.")}
          delay={0.12}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[1.5rem] border border-border bg-card/80 p-4">
              <p className="text-sm text-muted-foreground">{t("admin.ml.users_total", "Foydalanuvchilar jami")}</p>
              <p className="mt-2 text-2xl font-semibold">{systemStats?.users_total ?? 0}</p>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-card/80 p-4">
              <p className="text-sm text-muted-foreground">{t("admin.ml.rate_limit_events", "Rate-limit hodisalari")}</p>
              <p className="mt-2 text-2xl font-semibold">{systemStats?.rate_limit_events ?? 0}</p>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-card/80 p-4">
              <p className="text-sm text-muted-foreground">{t("admin.ml.top_weekly_xp", "Haftalik eng yuqori XP")}</p>
              <p className="mt-2 text-2xl font-semibold">{systemStats?.top_user_xp_weekly ?? 0}</p>
            </div>
          </div>
        </IntelligencePanel>
      </div>
    </AdminLayout>
  );
}
