"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, Database, ShieldAlert, Users } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  EmptyIntelligenceState,
  IntelligenceMetricCard,
  IntelligenceMiniMetric,
  IntelligencePanel,
  IntelligenceSectionHeader,
} from "@/components/intelligence/IntelligencePrimitives";
import { SurfaceNav } from "@/components/intelligence/SurfaceNav";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { adminNav } from "@/config/navigation";
import {
  getAdminMlStatus,
  getAdminSystemStats,
  getQuestionCategories,
  getQuestions,
} from "@/lib/admin";
import type {
  AdminMlStatus,
  AdminQuestion,
  AdminQuestionCategory,
  AdminSystemStats,
} from "@/schemas/admin.schema";

export default function AdminDashboardPage() {
  const { t } = useI18n();
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [categories, setCategories] = useState<AdminQuestionCategory[]>([]);
  const [stats, setStats] = useState<AdminSystemStats | null>(null);
  const [mlStatus, setMlStatus] = useState<AdminMlStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [questionsData, categoriesData, systemStats, ml] = await Promise.all([
          getQuestions(),
          getQuestionCategories(),
          getAdminSystemStats(),
          getAdminMlStatus(),
        ]);
        if (!active) {
          return;
        }
        setQuestions(questionsData);
        setCategories(categoriesData);
        setStats(systemStats);
        setMlStatus(ml);
      } catch (error) {
        console.error("Failed to load admin dashboard data:", error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    void loadData();
    return () => {
      active = false;
    };
  }, []);

  const activeCategories = categories.filter((category) => category.is_active).length;
  const uncategorizedQuestions = questions.filter((question) => !question.category_id).length;

  return (
    <AdminLayout
      title={t("admin.dashboard.title", "Platforma boshqaruvi")}
      description={t("admin.dashboard.description", "Foydalanuvchilar, savollar banki, to'lovlar va ML holatini bitta admin yuzada kuzating.")}
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
        <div className="intelligence-panel p-6">
          <SurfaceNav items={adminNav} />
          <div className="mt-6">
            <IntelligenceSectionHeader
              eyebrow={t("admin.dashboard.header_eyebrow", "Admin nazorati")}
              title={t("admin.dashboard.header_title", "Tizim holati va tezkor boshqaruv")}
              description={t("admin.dashboard.header_description", "Joriy endpointlar asosida platformaning eng muhim ko'rsatkichlari va tezkor kirish amallari shu yerda jamlangan.")}
              badge={mlStatus?.current_model_version ?? t("admin.dashboard.no_model", "Model topilmadi")}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <IntelligenceMetricCard
            eyebrow={t("admin.dashboard.users", "Foydalanuvchilar")}
            title={t("admin.dashboard.users_total", "Jami foydalanuvchilar")}
            numericValue={stats?.users_total ?? 0}
            description={t("admin.dashboard.users_total_description", "Platforma bo'yicha ro'yxatdan o'tgan foydalanuvchilar soni.")}
            icon={Users}
          />
          <IntelligenceMetricCard
            eyebrow={t("admin.dashboard.questions", "Savollar banki")}
            title={t("admin.dashboard.total_questions", "Jami savollar")}
            numericValue={questions.length}
            description={t("admin.dashboard.total_questions_description", "Amaldagi adaptiv test bankida ko'rinayotgan savollar soni.")}
            icon={Database}
            delay={0.04}
          />
          <IntelligenceMetricCard
            eyebrow={t("admin.dashboard.ml", "ML")}
            title={t("admin.dashboard.drift_status", "Drift holati")}
            value={isLoading ? "..." : (mlStatus?.drift_status ?? "noma'lum")}
            description={t("admin.dashboard.drift_status_description", "Ansambl model monitoring qatlamidagi joriy drift holati.")}
            icon={ShieldAlert}
            tone={mlStatus?.drift_status === "stable" || mlStatus?.drift_status === "barqaror" ? "success" : "warning"}
            delay={0.08}
          />
          <IntelligenceMetricCard
            eyebrow={t("admin.dashboard.activity", "Faollik")}
            title={t("admin.dashboard.tests_completed_today", "Bugun yakunlangan testlar")}
            numericValue={stats?.tests_completed_today ?? 0}
            description={t("admin.dashboard.tests_completed_today_description", "Kun davomida yakunlangan urinishlar soni.")}
            icon={Activity}
            delay={0.12}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <IntelligencePanel
            eyebrow={t("admin.dashboard.quick_health", "Tezkor holat")}
            title={t("admin.dashboard.quick_health_title", "Operatsion signal oynasi")}
            description={t("admin.dashboard.quick_health_description", "Asosiy platforma, to'lov va ML signallarini bir qarashda kuzating.")}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <IntelligenceMiniMetric
                label={t("admin.dashboard.active_subscriptions", "Faol obunalar")}
                value={stats?.active_subscriptions ?? 0}
                description={t("admin.dashboard.active_subscriptions_description", "Hozirda faol premium obunalar soni.")}
                tone="success"
              />
              <IntelligenceMiniMetric
                label={t("admin.dashboard.payments_successful", "Muvaffaqiyatli to'lovlar")}
                value={stats?.payments_successful ?? 0}
                description={t("admin.dashboard.payments_successful_description", "Qayd etilgan muvaffaqiyatli to'lovlar.")}
                tone="neutral"
              />
              <IntelligenceMiniMetric
                label={t("admin.dashboard.rate_limit_events", "Rate-limit hodisalari")}
                value={stats?.rate_limit_events ?? 0}
                description={t("admin.dashboard.rate_limit_events_description", "Himoya qatlami qayd etgan limit oshishlari.")}
                tone="warning"
              />
              <IntelligenceMiniMetric
                label={t("admin.dashboard.dataset_size", "ML dataset hajmi")}
                value={mlStatus?.training_dataset_size ?? 0}
                description={t("admin.dashboard.dataset_size_description", "Joriy model versiyasi uchun qayd etilgan trening dataset hajmi.")}
                tone="neutral"
              />
            </div>
          </IntelligencePanel>

          <IntelligencePanel
            eyebrow={t("admin.dashboard.question_bank", "Savollar banki")}
            title={t("admin.dashboard.question_bank_title", "Kategoriya va tozalash holati")}
            description={t("admin.dashboard.question_bank_description", "Savollar banki sifati va mapping holatini tez tekshiring.")}
            delay={0.06}
          >
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="surface-card-soft h-28 animate-pulse" />
                <div className="surface-card-soft h-28 animate-pulse" />
                <div className="surface-card-soft h-28 animate-pulse" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <IntelligenceMiniMetric
                  label={t("admin.dashboard.categories_total", "Kategoriyalar")}
                  value={categories.length}
                  description={`${activeCategories} ${t("admin.dashboard.categories_active", "tasi faol")}`}
                />
                <IntelligenceMiniMetric
                  label={t("admin.dashboard.uncategorized_questions", "Kategoriyasiz savollar")}
                  value={uncategorizedQuestions}
                  description={t("admin.dashboard.uncategorized_questions_description", "Mapping talab qiladigan savollar.")}
                  tone={uncategorizedQuestions > 0 ? "warning" : "success"}
                />
                <IntelligenceMiniMetric
                  label={t("admin.dashboard.weekly_xp", "Haftalik top XP")}
                  value={stats?.top_user_xp_weekly ?? 0}
                  description={t("admin.dashboard.weekly_xp_description", "Eng faol foydalanuvchi tomonidan shu hafta yig'ilgan XP.")}
                />
              </div>
            )}
          </IntelligencePanel>
        </div>

        <IntelligencePanel
          eyebrow={t("admin.dashboard.quick_actions", "Tezkor amallar")}
          title={t("admin.dashboard.quick_actions_title", "Muhim boshqaruv yo'llari")}
          description={t("admin.dashboard.quick_actions_description", "Asosiy admin bo'limlariga bir bosishda o'tish uchun yo'llar.")}
          delay={0.12}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Link href="/admin/users" className="surface-card-soft p-4 transition hover:-translate-y-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{t("admin.nav.users", "Foydalanuvchilar")}</p>
              <h3 className="mt-2 text-lg font-medium text-foreground">{t("admin.dashboard.manage_users", "Foydalanuvchilarni boshqarish")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t("admin.dashboard.manage_users_description", "Profil va obuna holatlarini yangilash.")}</p>
            </Link>
            <Link href="/admin/schools" className="surface-card-soft p-4 transition hover:-translate-y-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{t("admin.nav.driving_schools", "Maktablar")}</p>
              <h3 className="mt-2 text-lg font-medium text-foreground">{t("admin.dashboard.manage_schools", "Maktablarni ko'rish")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t("admin.dashboard.manage_schools_description", "Maktab profillari va platforma qamrovini kuzatish.")}</p>
            </Link>
            <Link href="/admin/promos" className="surface-card-soft p-4 transition hover:-translate-y-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{t("admin.nav.promos", "Promokodlar")}</p>
              <h3 className="mt-2 text-lg font-medium text-foreground">{t("admin.dashboard.manage_promos", "Promokodlarni boshqarish")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t("admin.dashboard.manage_promos_description", "Chegirma va maktab biriktirish oqimlarini nazorat qilish.")}</p>
            </Link>
            <Link href="/admin/ml" className="surface-card-soft p-4 transition hover:-translate-y-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{t("admin.nav.ml", "ML kuzatuv")}</p>
              <h3 className="mt-2 text-lg font-medium text-foreground">{t("admin.dashboard.monitor_ml", "ML monitoring")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t("admin.dashboard.monitor_ml_description", "Model versiyasi, drift va milliy o'quv insightlarini tekshirish.")}</p>
            </Link>
          </div>
        </IntelligencePanel>

        {!isLoading && !stats && !mlStatus ? (
          <IntelligencePanel eyebrow="Holat" title="Admin ma'lumotlari topilmadi">
            <EmptyIntelligenceState
              title="Ma'lumotlar vaqtincha yuklanmadi"
              description="Admin endpointlaridan qayta yuklash orqali hozirgi platforma ko'rsatkichlarini tiklash mumkin."
            />
          </IntelligencePanel>
        ) : null}
      </div>
    </AdminLayout>
  );
}
