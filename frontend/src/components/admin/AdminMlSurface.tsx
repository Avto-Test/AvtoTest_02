"use client";

import { useEffect, useState } from "react";
import { Activity, BrainCircuit, Globe2, ShieldAlert } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  EmptyIntelligenceState,
  IntelligenceMetricCard,
  IntelligenceMiniMetric,
  IntelligencePanel,
} from "@/components/intelligence/IntelligencePrimitives";
import {
  IntelligenceProgressChart,
  IntelligenceTopicBarChart,
} from "@/components/intelligence/IntelligenceCharts";
import { useI18n } from "@/components/i18n-provider";
import {
  getAdminMlStatus,
  getAdminNationalLearningInsights,
  getAdminSystemStats,
} from "@/lib/admin";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [ml, stats, national] = await Promise.all([
          getAdminMlStatus(),
          getAdminSystemStats(),
          getAdminNationalLearningInsights(),
        ]);
        if (active) {
          setMlStatus(ml);
          setSystemStats(stats);
          setNationalInsights(national);
        }
      } catch {
        if (active) {
          setMlStatus(null);
          setSystemStats(null);
          setNationalInsights(null);
          setError(t("admin.ml.load_error", "Ma'lumot topilmadi."));
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
  }, [t]);

  const regionalTrend = nationalInsights?.regional_benchmarks.slice(0, 6).map((item) => ({
    label: `${item.region}/${item.city}`,
    value: item.average_readiness,
  })) ?? [];

  const failedTopics = nationalInsights?.top_failed_topics.slice(0, 8).map((item) => ({
    topic: item.topic,
    value: item.failure_rate,
  })) ?? [];

  if (!loading && error) {
    return (
      <AdminLayout
        title={t("admin.ml.title", "ML kuzatuv")}
        description={t("admin.ml.description", "Model versiyasi, trening holati, drift va milliy signal shu sahifada ko'rinadi.")}
      >
        <IntelligencePanel eyebrow={t("admin.ml.status", "Holat")} title={t("admin.ml.unavailable_title", "Ma'lumot topilmadi")}>
          <EmptyIntelligenceState
            title={t("admin.ml.unavailable_title", "Ma'lumot topilmadi")}
            description={error ?? t("admin.ml.unavailable_description", "Qayta urinib ko'ring.")}
          />
        </IntelligencePanel>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={t("admin.ml.title", "ML kuzatuv")}
      description={t("admin.ml.description", "Model versiyasi, trening holati, drift va milliy signal shu sahifada ko'rinadi.")}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <IntelligenceMetricCard
            eyebrow={t("admin.ml.model_version", "Model")}
            title={t("admin.ml.current_model", "Joriy model")}
            value={loading ? "..." : (mlStatus?.current_model_version ?? "noma'lum")}
            description={t("admin.ml.current_model_description", "Hozir ishlayotgan model versiyasi.")}
            icon={BrainCircuit}
          />
          <IntelligenceMetricCard
            eyebrow={t("admin.ml.training", "Trening")}
            title={t("admin.ml.dataset_size", "Dataset hajmi")}
            numericValue={mlStatus?.training_dataset_size ?? 0}
            description={t("admin.ml.dataset_size_description", "Oxirgi treningda ishlatilgan dataset hajmi.")}
            icon={Activity}
            delay={0.04}
          />
          <IntelligenceMetricCard
            eyebrow={t("admin.ml.drift", "Drift")}
            title={t("admin.ml.drift_status", "Drift holati")}
            value={loading ? "..." : (mlStatus?.drift_status ?? "noma'lum")}
            description={t("admin.ml.drift_status_description", "Model monitoring tizimidan olingan joriy holat.")}
            icon={ShieldAlert}
            tone={mlStatus?.drift_status === "stable" || mlStatus?.drift_status === "barqaror" ? "success" : "warning"}
            delay={0.08}
          />
          <IntelligenceMetricCard
            eyebrow={t("admin.ml.national", "Milliy signal")}
            title={t("admin.ml.average_readiness", "Milliy tayyorgarlik")}
            numericValue={nationalInsights?.national_readiness_average ?? 0}
            decimals={1}
            suffix="%"
            description={t("admin.ml.average_readiness_description", "Jamlangan tayyorgarlik o'rtachasi.")}
            icon={Globe2}
            delay={0.12}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
          <IntelligencePanel
            eyebrow={t("admin.ml.training_status", "Trening holati")}
            title={t("admin.ml.training_status_title", "Model kuzatuv xulosasi")}
            description={t("admin.ml.training_status_description", "Versiya, vaqt va tizim bo'yicha asosiy xulosalar.")}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <IntelligenceMiniMetric
                label={t("admin.ml.training_timestamp", "Trening vaqti")}
                value={mlStatus?.training_timestamp ? new Date(mlStatus.training_timestamp).toLocaleString("uz-UZ") : "Noma'lum"}
              />
              <IntelligenceMiniMetric
                label={t("admin.ml.last_training_time", "Oxirgi trening")}
                value={mlStatus?.last_training_time ? new Date(mlStatus.last_training_time).toLocaleString("uz-UZ") : "Noma'lum"}
              />
              <IntelligenceMiniMetric
                label={t("admin.ml.rate_limit_events", "Rate-limit hodisalari")}
                value={systemStats?.rate_limit_events ?? 0}
                tone="warning"
              />
              <IntelligenceMiniMetric
                label={t("admin.ml.top_weekly_xp", "Haftalik top XP")}
                value={systemStats?.top_user_xp_weekly ?? 0}
              />
            </div>
          </IntelligencePanel>

          <IntelligencePanel
            eyebrow={t("admin.ml.regional_benchmark", "Hududiy benchmark")}
            title={t("admin.ml.regional_readiness", "Hududlar bo'yicha tayyorgarlik")}
            description={t("admin.ml.regional_readiness_description", "PII ko'rsatmasdan jamlangan ko'rinishda.")}
            delay={0.06}
          >
            {regionalTrend.length > 0 ? (
              <IntelligenceProgressChart data={regionalTrend} color="#38bdf8" />
            ) : (
              <EmptyIntelligenceState
                title={t("admin.ml.no_regional_data", "Hududiy ma'lumot topilmadi")}
                description={t("admin.ml.no_regional_data_description", "Keyinroq qayta urinib ko'ring.")}
              />
            )}
          </IntelligencePanel>
        </div>

        <IntelligencePanel
          eyebrow={t("admin.ml.failed_topics", "Milliy zaif mavzular")}
          title={t("admin.ml.failed_topics_heatmap", "Eng qiyin mavzular")}
          description={t("admin.ml.failed_topics_heatmap_description", "Xato ko'p uchrayotgan mavzularning milliy ko'rinishi.")}
        >
          {failedTopics.length > 0 ? (
            <IntelligenceTopicBarChart data={failedTopics} colorScale={["#fb7185", "#f97316", "#38bdf8", "#eab308"]} />
          ) : (
            <EmptyIntelligenceState
              title={t("admin.ml.no_failed_topics", "Mavzu ma'lumoti topilmadi")}
              description={t("admin.ml.no_failed_topics_description", "Milliy heatmap keyinroq ko'rinadi.")}
            />
          )}
        </IntelligencePanel>
      </div>
    </AdminLayout>
  );
}
