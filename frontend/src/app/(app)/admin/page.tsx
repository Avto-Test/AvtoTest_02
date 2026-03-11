"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, BrainCircuit, Database, ShieldAlert, Users } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  EmptyIntelligenceState,
  IntelligenceMetricCard,
  IntelligenceMiniMetric,
  IntelligencePanel,
} from "@/components/intelligence/IntelligencePrimitives";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { getAdminMlStatus, getAdminSystemStats, getQuestions } from "@/lib/admin";
import type { AdminMlStatus, AdminQuestion, AdminSystemStats } from "@/schemas/admin.schema";

export default function AdminDashboardPage() {
  const { t } = useI18n();
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [stats, setStats] = useState<AdminSystemStats | null>(null);
  const [mlStatus, setMlStatus] = useState<AdminMlStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [questionsData, statsData, mlData] = await Promise.all([
          getQuestions(),
          getAdminSystemStats(),
          getAdminMlStatus(),
        ]);
        if (active) {
          setQuestions(questionsData);
          setStats(statsData);
          setMlStatus(mlData);
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

  return (
    <AdminLayout
      title={t("admin.dashboard.title", "Platforma nazorati")}
      description={t("admin.dashboard.description", "Asosiy tizim ko'rsatkichlari va admin bo'limlariga tezkor kirish shu yerda jamlangan.")}
      actions={(
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/users">{t("admin.nav.users", "Foydalanuvchilar")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/ml">{t("admin.nav.ml", "ML kuzatuv")}</Link>
          </Button>
        </div>
      )}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <IntelligenceMetricCard
            eyebrow={t("admin.dashboard.users", "Foydalanuvchilar")}
            title={t("admin.dashboard.users_total", "Jami foydalanuvchilar")}
            numericValue={stats?.users_total ?? 0}
            description={t("admin.dashboard.users_total_description", "Platforma bo'yicha ro'yxatdan o'tgan barcha foydalanuvchilar soni.")}
            icon={Users}
          />
          <IntelligenceMetricCard
            eyebrow={t("admin.dashboard.questions", "Savollar")}
            title={t("admin.dashboard.questions_total", "Jami savollar")}
            numericValue={questions.length}
            description={t("admin.dashboard.questions_total_description", "Hozirgi savollar bankida mavjud savollar soni.")}
            icon={Database}
            delay={0.04}
          />
          <IntelligenceMetricCard
            eyebrow="ML"
            title={t("admin.dashboard.ml_drift", "ML drift holati")}
            value={loading ? "..." : (mlStatus?.drift_status ?? "noma'lum")}
            description={t("admin.dashboard.ml_drift_description", "Joriy model monitoring holati.")}
            icon={ShieldAlert}
            tone={mlStatus?.drift_status === "stable" || mlStatus?.drift_status === "barqaror" ? "success" : "warning"}
            delay={0.08}
          />
          <IntelligenceMetricCard
            eyebrow={t("admin.dashboard.activity", "Faollik")}
            title={t("admin.dashboard.tests_completed_today", "Bugun yakunlangan testlar")}
            numericValue={stats?.tests_completed_today ?? 0}
            description={t("admin.dashboard.tests_completed_today_description", "Bugun yakunlangan testlar soni.")}
            icon={Activity}
            delay={0.12}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
          <IntelligencePanel
            eyebrow={t("admin.dashboard.operations", "Operatsion ko'rsatkichlar")}
            title={t("admin.dashboard.operations_title", "Asosiy platforma signallari")}
            description={t("admin.dashboard.operations_description", "Obunalar, to'lovlar, rate-limit va ML dataset bo'yicha asosiy signal oynasi.")}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <IntelligenceMiniMetric label={t("admin.dashboard.active_subscriptions", "Faol obunalar")} value={stats?.active_subscriptions ?? 0} tone="success" />
              <IntelligenceMiniMetric label={t("admin.dashboard.payments_successful", "Muvaffaqiyatli to'lovlar")} value={stats?.payments_successful ?? 0} />
              <IntelligenceMiniMetric label={t("admin.dashboard.rate_limit_events", "Rate-limit hodisalari")} value={stats?.rate_limit_events ?? 0} tone="warning" />
              <IntelligenceMiniMetric label={t("admin.dashboard.dataset_size", "ML dataset hajmi")} value={mlStatus?.training_dataset_size ?? 0} />
            </div>
          </IntelligencePanel>

          <IntelligencePanel
            eyebrow={t("admin.dashboard.quick_actions", "Tezkor kirish")}
            title={t("admin.dashboard.quick_actions_title", "Asosiy admin bo'limlari")}
            description={t("admin.dashboard.quick_actions_description", "Kunlik boshqaruv uchun eng ko'p ishlatiladigan bo'limlar.")}
            delay={0.06}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Link href="/admin/users" className="surface-card-soft p-4">
                <Users className="h-5 w-5 text-cyan-300" />
                <p className="mt-3 text-base font-medium text-white">{t("admin.nav.users", "Foydalanuvchilar")}</p>
              </Link>
              <Link href="/admin/schools" className="surface-card-soft p-4">
                <Database className="h-5 w-5 text-emerald-300" />
                <p className="mt-3 text-base font-medium text-white">{t("admin.nav.driving_schools", "Maktablar")}</p>
              </Link>
              <Link href="/admin/promos" className="surface-card-soft p-4">
                <Activity className="h-5 w-5 text-amber-300" />
                <p className="mt-3 text-base font-medium text-white">{t("admin.nav.promos", "Promokodlar")}</p>
              </Link>
              <Link href="/admin/ml" className="surface-card-soft p-4">
                <BrainCircuit className="h-5 w-5 text-fuchsia-300" />
                <p className="mt-3 text-base font-medium text-white">{t("admin.nav.ml", "ML kuzatuv")}</p>
              </Link>
            </div>
          </IntelligencePanel>
        </div>

        {!loading && !stats && !mlStatus ? (
          <IntelligencePanel eyebrow={t("admin.dashboard.status", "Holat")} title={t("admin.dashboard.no_data_title", "Ma'lumot topilmadi")}>
            <EmptyIntelligenceState
              title={t("admin.dashboard.no_data_title", "Ma'lumot topilmadi")}
              description={t("admin.dashboard.no_data_description", "Qayta urinib ko'ring yoki admin endpointlarni tekshiring.")}
            />
          </IntelligencePanel>
        ) : null}
      </div>
    </AdminLayout>
  );
}
