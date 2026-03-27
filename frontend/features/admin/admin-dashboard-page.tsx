"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Percent,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import { getAdminDashboardData, getAdminFinanceSummary, getAdminGrowthSummary } from "@/api/admin";
import { buildAdminGrowthInsights, type AdminGrowthInsight } from "@/features/admin/admin-growth-insights";
import {
  buildAdminDashboardInsights,
  getWeakestAdminCategory,
  type AdminDashboardInsight,
} from "@/features/admin/admin-dashboard-insights";
import { trendArrow } from "@/features/admin/admin-dashboard-trends";
import { AdminPrimaryLink, AdminStatCard, AdminSurface } from "@/features/admin/admin-ui";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { useUser } from "@/hooks/use-user";
import { isSuperAdmin } from "@/lib/rbac";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonStyles } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import type {
  AdminAnalyticsSummary,
  AdminDashboardData,
  AdminFinanceRange,
  AdminGrowthRange,
  AdminGrowthSummary,
  AdminPaymentSummary,
} from "@/types/admin";

type DashboardSection = "overview" | "applications" | "content" | "growth" | "financials";

type DashboardActionCard = {
  id: string;
  title: string;
  description: string;
  value: string;
  href?: string;
  actionLabel?: string;
  tone: "danger" | "warning" | "info" | "success";
  icon: typeof AlertTriangle;
};

type RankedCategory = {
  name: string;
  accuracy: number | null;
  attempts: number | null;
  questionCount: number | null;
};

function formatCount(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Ma'lumot yo'q";
  }

  return new Intl.NumberFormat("uz-UZ").format(value);
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Ma'lumot yo'q";
  }

  return `${value.toFixed(1)}%`;
}

function formatMoney(valueCents: number | null | undefined, currency: string | null | undefined) {
  if (typeof valueCents !== "number" || Number.isNaN(valueCents)) {
    return "Ma'lumot yo'q";
  }

  return new Intl.NumberFormat("uz-UZ", {
    style: "currency",
    currency: currency || "UZS",
    maximumFractionDigits: 0,
  }).format(valueCents / 100);
}

function formatTrendDelta(insight: AdminDashboardInsight) {
  const percentChange = insight.trend?.percentChange;
  if (typeof percentChange !== "number" || Number.isNaN(percentChange)) {
    return null;
  }

  const sign = percentChange > 0 ? "+" : "";
  return `${sign}${percentChange.toFixed(0)}%`;
}

function getAverageAccuracy(analytics: AdminDashboardData["analytics"]) {
  const value = analytics?.average_accuracy;
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function getCategoryRanking(analytics: AdminAnalyticsSummary | null): RankedCategory[] {
  if (!analytics?.category_performance?.length) {
    return [];
  }

  return analytics.category_performance
    .map((item) => {
      const accuracy = typeof item.accuracy === "number" && !Number.isNaN(item.accuracy) ? item.accuracy : null;
      const attempts = typeof item.attempts === "number" ? item.attempts : typeof item.attempts_count === "number" ? item.attempts_count : null;
      const questionCount =
        typeof item.question_count === "number"
          ? item.question_count
          : typeof item.total_questions === "number"
            ? item.total_questions
            : null;

      return {
        name: item.category?.trim() || item.topic?.trim() || "Nomsiz bo'lim",
        accuracy,
        attempts,
        questionCount,
      };
    })
    .sort((left, right) => {
      const leftValue = left.accuracy ?? Number.POSITIVE_INFINITY;
      const rightValue = right.accuracy ?? Number.POSITIVE_INFINITY;
      return leftValue - rightValue;
    })
    .slice(0, 4);
}

function buildActionCards(data: AdminDashboardData): DashboardActionCard[] {
  const analytics = data.analytics;
  const paymentSummary = data.paymentSummary;
  const newLeadsCount = analytics?.new_leads ?? 0;

  const actionCards: DashboardActionCard[] = [];

  if (data.unavailableSections.length > 0) {
    actionCards.push({
      id: "degraded",
      title: "Ba'zi bo'limlar ochilmadi",
      description: "Ayrim ma'lumotlar vaqtincha kelmadi. Qayta tekshirib ko'rish tavsiya etiladi.",
      value: `${data.unavailableSections.length} bo'lim`,
      tone: "warning",
      icon: AlertTriangle,
    });
  }

  if ((analytics?.pending_applications ?? 0) > 0) {
    actionCards.push({
      id: "pending-applications",
      title: "Ko'rib chiqiladigan arizalar bor",
      description: "Yangi maktab va instruktor arizalari kutmoqda.",
      value: formatCount(analytics?.pending_applications),
      href: "/admin/marketplace",
      actionLabel: "Arizalarni ochish",
      tone: "danger",
      icon: ClipboardList,
    });
  }

  if (newLeadsCount > 0) {
    actionCards.push({
      id: "new-leads",
      title: "Yangi leadlar keldi",
      description: "So'nggi kunlarda qiziqish bildirgan yangi murojaatlar paydo bo'ldi.",
      value: formatCount(newLeadsCount),
      href: "/admin/marketplace",
      actionLabel: "Leadlarni ko'rish",
      tone: "info",
      icon: Users,
    });
  }

  if ((paymentSummary?.failed_payments ?? 0) > 0) {
    actionCards.push({
      id: "failed-payments",
      title: "Xato to'lovlar bor",
      description: "Muvaffaqiyatsiz to'lovlar tushum yo'qotilishiga olib kelishi mumkin.",
      value: formatCount(paymentSummary?.failed_payments),
      href: "/admin/billing",
      actionLabel: "To'lovlarni tekshirish",
      tone: "warning",
      icon: CreditCard,
    });
  }

  return actionCards.slice(0, 3);
}

function ActionCard({
  title,
  description,
  value,
  href,
  actionLabel,
  tone,
  icon: Icon,
}: DashboardActionCard) {
  const toneClasses = {
    danger: "border-rose-500/30 bg-rose-500/10",
    warning: "border-amber-500/30 bg-amber-500/10",
    info: "border-sky-500/30 bg-sky-500/10",
    success: "border-emerald-500/30 bg-emerald-500/10",
  } satisfies Record<DashboardActionCard["tone"], string>;

  return (
    <Card className={`border ${toneClasses[tone]}`}>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="rounded-2xl bg-background/70 p-3">
            <Icon className="h-5 w-5 text-foreground" />
          </div>
          <Badge variant={tone === "danger" ? "danger" : tone === "warning" ? "warning" : "outline"}>
            {value}
          </Badge>
        </div>
        <div className="space-y-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      {href && actionLabel ? (
        <CardContent className="pt-0">
          <Link href={href} className={buttonStyles({ variant: "outline", size: "sm" })}>
            {actionLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </CardContent>
      ) : null}
    </Card>
  );
}

function AdviceCard({ insight }: { insight: AdminDashboardInsight }) {
  const badgeVariant =
    insight.variant === "danger"
      ? "danger"
      : insight.variant === "warning"
        ? "warning"
        : insight.variant === "success"
          ? "success"
          : "muted";
  const trendDelta = formatTrendDelta(insight);

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={badgeVariant}>{insight.badgeLabel}</Badge>
            {insight.trend ? (
              <Badge variant="outline">
                {trendArrow(insight.trend.direction)} {trendDelta ?? "Trend"}
              </Badge>
            ) : null}
          </div>
          <h3 className="text-lg font-semibold text-foreground">{insight.title}</h3>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{insight.description}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{insight.actionLabel}</p>
        <Link href={insight.href} className={buttonStyles({ variant: "outline", size: "sm" })}>
          Ochish
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function GrowthAdviceCard({ insight }: { insight: AdminGrowthInsight }) {
  const badgeVariant =
    insight.variant === "danger"
      ? "danger"
      : insight.variant === "warning"
        ? "warning"
        : insight.variant === "success"
          ? "success"
          : "muted";

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Badge variant={badgeVariant}>
            {insight.variant === "danger" ? "Muhim" : insight.variant === "warning" ? "Kuzatish" : insight.variant === "success" ? "Sog'lom" : "Ma'lumot"}
          </Badge>
          <h3 className="text-lg font-semibold text-foreground">{insight.title}</h3>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{insight.description}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{insight.actionLabel}</p>
        <Link href={insight.href} className={buttonStyles({ variant: "outline", size: "sm" })}>
          Ochish
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function OverviewPanel({
  actionCards,
  insights,
}: {
  actionCards: DashboardActionCard[];
  insights: AdminDashboardInsight[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <AdminSurface
        title="Harakat talab qilinadi"
        description="Admin avval shu 2-3 ishni ko'rsa, asosiy oqim sekinlashmaydi."
        action={<Badge variant="outline">Top 3</Badge>}
        contentClassName="p-5"
      >
        {actionCards.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {actionCards.map((card) => (
              <ActionCard key={card.id} {...card} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Shoshilinch ish yo'q"
            description="Hozir muhim navbatlar toza. Keyingi e'tibor kontent va statistikaga qaratilishi mumkin."
          />
        )}
      </AdminSurface>

      <AdminSurface
        title="Tavsiyalar"
        description="Statistikaga qarab qisqa va amaliy yo'l-yo'riq."
        action={<AdminPrimaryLink href="/admin/analytics">Statistika</AdminPrimaryLink>}
        contentClassName="p-5"
      >
        {insights.length > 0 ? (
          <div className="grid gap-4">
            {insights.map((insight) => (
              <AdviceCard key={insight.id} insight={insight} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Hammasi joyida"
            description="Hozircha alohida aralashuv talab qiladigan muammo yoki keskin o'zgarish aniqlanmadi."
          />
        )}
      </AdminSurface>
    </div>
  );
}

function ApplicationsPanel({ analytics }: { analytics: AdminAnalyticsSummary | null }) {
  return (
    <div className="space-y-6">
      <AdminSurface
        title="Arizalar holati"
        description="Ko'rib chiqish oqimini scrollsiz ko'rish uchun asosiy statuslar shu yerda jamlandi."
        action={<AdminPrimaryLink href="/admin/marketplace">Bo&apos;limni ochish</AdminPrimaryLink>}
        contentClassName="p-5"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            label="Kutilayotgan"
            value={formatCount(analytics?.pending_applications)}
            caption="Birinchi ko'rilishi kerak bo'lgan arizalar"
            icon={ClipboardList}
            tone="danger"
          />
          <AdminStatCard
            label="Tasdiqlangan"
            value="-"
            caption="Bu summary hozir alohida qaytmaydi"
            icon={CheckCircle2}
            tone="neutral"
          />
          <AdminStatCard
            label="Rad etilgan"
            value="-"
            caption="Bu summary hozir alohida qaytmaydi"
            icon={AlertTriangle}
            tone="neutral"
          />
          <AdminStatCard
            label="Yangi leadlar"
            value={formatCount(analytics?.new_leads)}
            caption="So'nggi kunlarda kelgan yangi qiziqishlar"
            icon={Users}
            tone="warning"
          />
        </div>
      </AdminSurface>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <AdminSurface
          title="Tezkor yo'nalish"
          description="Kerakli bo'limga bir bosishda o'tish uchun qisqa yo'l."
          contentClassName="p-5"
        >
          <div className="flex flex-wrap gap-3">
            <AdminPrimaryLink href="/admin/marketplace">Marketplace markazi</AdminPrimaryLink>
            <Link href="/admin/driving-schools" className={buttonStyles({ variant: "outline", size: "sm" })}>
              Maktablar
            </Link>
            <Link href="/admin/driving-instructors" className={buttonStyles({ variant: "outline", size: "sm" })}>
              Instruktorlar
            </Link>
          </div>
        </AdminSurface>

        <AdminSurface
          title="Hozirgi holat"
          description="Ko'rinayotgan asosiy ariza signallari."
          contentClassName="p-5"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/50 px-4 py-3">
              <span className="text-sm text-muted-foreground">Jami arizalar</span>
              <span className="text-sm font-semibold text-foreground">{formatCount(analytics?.total_applications)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/50 px-4 py-3">
              <span className="text-sm text-muted-foreground">Kutilayotgan arizalar</span>
              <span className="text-sm font-semibold text-foreground">{formatCount(analytics?.pending_applications)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/50 px-4 py-3">
              <span className="text-sm text-muted-foreground">Yangi leadlar</span>
              <span className="text-sm font-semibold text-foreground">{formatCount(analytics?.new_leads)}</span>
            </div>
          </div>
        </AdminSurface>
      </div>
    </div>
  );
}

function ContentPanel({
  analytics,
  averageAccuracy,
}: {
  analytics: AdminAnalyticsSummary | null;
  averageAccuracy: number | null;
}) {
  const weakestCategory = getWeakestAdminCategory(analytics?.category_performance);
  const rankedCategories = getCategoryRanking(analytics);

  return (
    <div className="space-y-6">
      <AdminSurface
        title="Kontent holati"
        description="Savollar bazasi qamrovi va o'quv natijasini bir joyda ko'rish uchun."
        action={<AdminPrimaryLink href="/admin/content">Kontentni ochish</AdminPrimaryLink>}
        contentClassName="p-5"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            label="Jami savollar"
            value={formatCount(analytics?.total_questions)}
            caption="Savollar bazasidagi barcha savollar"
            icon={BookOpen}
            tone="primary"
          />
          <AdminStatCard
            label="O'rtacha natija"
            value={formatPercent(averageAccuracy)}
            caption={
              averageAccuracy === null
                ? "Hali yetarli javob ma'lumoti yo'q"
                : "Foydalanuvchilarning umumiy to'g'ri javob ko'rsatkichi"
            }
            icon={Percent}
            tone="warning"
          />
          <AdminStatCard
            label="E'tibor talab qiladigan bo'lim"
            value={weakestCategory ? weakestCategory.name : "Ma'lumot yo'q"}
            caption={
              weakestCategory
                ? `${Math.round(weakestCategory.accuracy)}% natija bilan eng past bo'lim`
                : "Hali kategoriya bo'yicha signal mavjud emas"
            }
            icon={AlertTriangle}
            tone="danger"
          />
          <AdminStatCard
            label="Signal berayotgan bo'limlar"
            value={formatCount(analytics?.category_performance?.length)}
            caption="Statistikada ko'rinayotgan kategoriya soni"
            icon={Sparkles}
            tone="neutral"
          />
        </div>
      </AdminSurface>

      <AdminSurface
        title="Bo'limlar bo'yicha natija"
        description="Nima uchun muhim: qaysi bo'limga birinchi e'tibor berish kerakligini ko'rsatadi."
        contentClassName="p-5"
      >
        {rankedCategories.length > 0 ? (
          <div className="space-y-3">
            {rankedCategories.map((item) => (
              <div
                key={item.name}
                className="grid gap-3 rounded-2xl border border-border/60 bg-card/50 px-4 py-4 md:grid-cols-[1.5fr_0.7fr_0.7fr]"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Natija eng past tomondan saralangan</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="block text-xs uppercase tracking-wide">Natija</span>
                  <span className="mt-1 block font-semibold text-foreground">{formatPercent(item.accuracy)}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="block text-xs uppercase tracking-wide">Qamrov</span>
                  <span className="mt-1 block font-semibold text-foreground">
                    {formatCount(item.attempts)} urinish / {formatCount(item.questionCount)} savol
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Bo'lim statistikasi hali yo'q"
            description="Kategoriyalar bo'yicha natija paydo bo'lishi uchun ko'proq foydalanuvchi javoblari kerak."
          />
        )}
      </AdminSurface>
    </div>
  );
}

function GrowthPanel({ growthSummary }: { growthSummary: AdminGrowthSummary | null }) {
  const [range, setRange] = useState<AdminGrowthRange>("all");
  const growthResource = useAsyncResource(
    () => getAdminGrowthSummary(range),
    [range],
    range !== "all",
    {
      cacheKey: `admin-growth-${range}`,
      staleTimeMs: 60_000,
    },
  );
  const growth = range === "all" ? growthSummary : growthResource.data;
  const growthError = range !== "all" ? growthResource.error : null;
  const growthLoading = range !== "all" && growthResource.loading && !growth;
  const hasGrowthData =
    (growth?.registered_users ?? 0) > 0 ||
    (growth?.active_users ?? 0) > 0 ||
    (growth?.engaged_users ?? 0) > 0 ||
    (growth?.premium_clicks ?? 0) > 0 ||
    (growth?.successful_payments ?? 0) > 0;
  const insights = buildAdminGrowthInsights(growth);

  const stages = growth
    ? [
        {
          id: "registered",
          label: "Ro'yxatdan o'tganlar",
          value: growth.registered_users,
          detail: "Boshlang'ich foydalanuvchi oqimi",
        },
        {
          id: "active",
          label: "Birinchi sessiya",
          value: growth.active_users,
          detail: `${formatPercent(growth.conversion_rates.activation_rate)} aktivlashuv`,
        },
        {
          id: "engaged",
          label: "Davom ettirganlar",
          value: growth.engaged_users,
          detail: `${formatPercent(growth.conversion_rates.engagement_rate)} davom ettirish`,
        },
        {
          id: "premium-click",
          label: "Premium bosganlar",
          value: growth.premium_clicks,
          detail: `${formatCount(growth.drop_offs.engagement_to_premium_click)} ta yo'qotish`,
        },
        {
          id: "payment",
          label: "To'lov qilganlar",
          value: growth.successful_payments,
          detail: `${formatPercent(growth.conversion_rates.payment_rate)} to'lov konversiyasi`,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <AdminSurface
        title="Growth oqimi"
        description="Ro'yxatdan o'tishdan to'lovgacha bo'lgan foydalanuvchi yo'li."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-2">
              {([
                { value: "all", label: "Hammasi" },
                { value: "7d", label: "7 kun" },
                { value: "30d", label: "30 kun" },
              ] satisfies Array<{ value: AdminGrowthRange; label: string }>).map((item) => (
                <Button
                  key={item.value}
                  size="sm"
                  variant={range === item.value ? "default" : "outline"}
                  onClick={() => setRange(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <AdminPrimaryLink href="/admin/billing">Billing</AdminPrimaryLink>
          </div>
        }
        contentClassName="p-5"
      >
        {growthLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-36 rounded-[1.5rem]" />
            ))}
          </div>
        ) : growthError && !growth ? (
          <EmptyState
            title="Growth ma'lumoti yuklanmadi"
            description="Funnel signalini olishda muammo bo'ldi. Birozdan keyin qayta urinib ko'ring."
          />
        ) : !hasGrowthData ? (
          <EmptyState
            title="Growth ma'lumoti hali yo'q"
            description="Tanlangan davrda ro'yxatdan o'tish, sessiya yoki premium konversiya signali topilmadi."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <AdminStatCard
              label="Ro'yxatdan o'tganlar"
              value={formatCount(growth?.registered_users)}
              caption="Yangi foydalanuvchi bazasi"
              icon={Users}
              tone="primary"
            />
            <AdminStatCard
              label="Birinchi sessiya"
              value={formatCount(growth?.active_users)}
              caption="Kamida 1 ta sessiya boshlaganlar"
              icon={Sparkles}
              tone="success"
            />
            <AdminStatCard
              label="Davom ettirganlar"
              value={formatCount(growth?.engaged_users)}
              caption="2+ sessiyagacha yetib borganlar"
              icon={CheckCircle2}
              tone="warning"
            />
            <AdminStatCard
              label="Premium bosganlar"
              value={formatCount(growth?.premium_clicks)}
              caption="Upgrade tugmasini bosgan foydalanuvchilar"
              icon={CreditCard}
              tone="neutral"
            />
            <AdminStatCard
              label="To'lov qilganlar"
              value={formatCount(growth?.successful_payments)}
              caption="Kamida 1 marta muvaffaqiyatli to'laganlar"
              icon={Wallet}
              tone="success"
            />
          </div>
        )}
      </AdminSurface>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminSurface
          title="Funnel bosqichlari"
          description="Qayerda foydalanuvchi yo'qolayotganini tez ko'rsatadi."
          contentClassName="p-5"
        >
          {!hasGrowthData ? (
            <EmptyState
              title="Bosqichlar tayyor emas"
              description="Funnel bosqichlari ko'rinishi uchun kamida bitta growth signali kerak."
            />
          ) : (
            <div className="space-y-3">
              {stages.map((stage, index) => (
                <div key={stage.id} className="space-y-3">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/50 px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{stage.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{stage.detail}</p>
                    </div>
                    <span className="text-lg font-semibold text-foreground">{formatCount(stage.value)}</span>
                  </div>
                  {index < stages.length - 1 ? (
                    <div className="flex items-center gap-3 pl-4 text-xs text-muted-foreground">
                      <div className="h-6 w-px bg-border" />
                      <span>Keyingi bosqichga o&apos;tish oqimi</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </AdminSurface>

        <div className="space-y-6">
          <AdminSurface
            title="Konversiya"
            description="Har bosqichdagi asosiy foiz ko'rsatkichlari."
            contentClassName="p-5"
          >
            {!hasGrowthData ? (
              <EmptyState
                title="Konversiya signali yo'q"
                description="Ro'yxatdan o'tish va faollik paydo bo'lgach bu bo'lim real foizlarni ko'rsatadi."
              />
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
                  <p className="text-sm text-muted-foreground">Aktivlashuv</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{formatPercent(growth?.conversion_rates.activation_rate)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Yo&apos;qotish: {formatCount(growth?.drop_offs.registration_to_activity)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
                  <p className="text-sm text-muted-foreground">Engagement</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{formatPercent(growth?.conversion_rates.engagement_rate)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Yo&apos;qotish: {formatCount(growth?.drop_offs.activity_to_engagement)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
                  <p className="text-sm text-muted-foreground">To&apos;lov konversiyasi</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{formatPercent(growth?.conversion_rates.payment_rate)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Yo&apos;qotish: {formatCount(growth?.drop_offs.engagement_to_payment)}
                  </p>
                </div>
              </div>
            )}
          </AdminSurface>

          <AdminSurface
            title="Growth tavsiyalari"
            description="Funnel raqamlariga qarab qisqa amaliy tavsiya."
            contentClassName="p-5"
          >
            <div className="grid gap-4">
              {insights.map((insight) => (
                <GrowthAdviceCard key={insight.id} insight={insight} />
              ))}
            </div>
          </AdminSurface>
        </div>
      </div>
    </div>
  );
}

function FinancialPanel({ paymentSummary }: { paymentSummary: AdminPaymentSummary | null }) {
  const [range, setRange] = useState<AdminFinanceRange>("all");
  const financeResource = useAsyncResource(
    () => getAdminFinanceSummary(range),
    [range],
    range !== "all",
    {
      cacheKey: `admin-finance-${range}`,
      staleTimeMs: 60_000,
    },
  );
  const finance = range === "all" ? paymentSummary : financeResource.data;
  const financeError = range !== "all" ? financeResource.error : null;
  const financeLoading = range !== "all" && financeResource.loading && !finance;
  const hasPayments = (finance?.total_payments ?? 0) > 0;

  return (
    <div className="space-y-6">
      <AdminSurface
        title="Moliyaviy ko'rinish"
        description="Tushum va to'lov sifati bo'yicha eng kerakli raqamlar."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-2">
              {([
                { value: "all", label: "Hammasi" },
                { value: "7d", label: "7 kun" },
                { value: "30d", label: "30 kun" },
              ] satisfies Array<{ value: AdminFinanceRange; label: string }>).map((item) => (
                <Button
                  key={item.value}
                  size="sm"
                  variant={range === item.value ? "default" : "outline"}
                  onClick={() => setRange(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <AdminPrimaryLink href="/admin/billing">To&apos;lovlar bo&apos;limi</AdminPrimaryLink>
          </div>
        }
        contentClassName="p-5"
      >
        {financeLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-36 rounded-[1.5rem]" />
            ))}
          </div>
        ) : financeError && !finance ? (
          <EmptyState
            title="Moliyaviy ma'lumot yuklanmadi"
            description="To'lovlar bo'yicha ko'rsatkichlarni olishda muammo bo'ldi. Birozdan keyin qayta urinib ko'ring."
          />
        ) : !hasPayments ? (
          <EmptyState
            title="Hali to'lovlar mavjud emas"
            description="Tanlangan davrda hech qanday to'lov qayd etilmagan. To'lov paydo bo'lgach bu yerda real ko'rsatkichlar chiqadi."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard
              label="Jami tushum"
              value={formatMoney(finance?.total_revenue_cents, finance?.currency)}
              caption="Faqat muvaffaqiyatli to'lovlar hisoblangan"
              icon={Wallet}
              tone="success"
            />
            <AdminStatCard
              label="Muvaffaqiyatli to'lovlar"
              value={formatCount(finance?.successful_payments)}
              caption={`Jami urinishlar: ${formatCount(finance?.total_payments)}`}
              icon={CheckCircle2}
              tone="success"
            />
            <AdminStatCard
              label="Xato to'lovlar"
              value={formatCount(finance?.failed_payments)}
              caption="Daromad yo'qotilishiga olib kelishi mumkin"
              icon={AlertTriangle}
              tone="danger"
            />
            <AdminStatCard
              label="Konversiya"
              value={formatPercent(finance?.conversion_rate)}
              caption="Muvaffaqiyatli to'lovlarning barcha urinishlarga nisbati"
              icon={CreditCard}
              tone="warning"
            />
          </div>
        )}
      </AdminSurface>

      <AdminSurface
        title="To'lov sifati"
        description="Nima uchun muhim: xato yoki kutilayotgan to'lovlar savdoni sekinlashtiradi."
        contentClassName="p-5"
      >
        {!hasPayments ? (
          <EmptyState
            title="To'lov holati hali shakllanmagan"
            description="Muvaffaqiyatli, xato va kutilayotgan to'lovlar bu yerda alohida ko'rinadi."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
              <p className="text-sm text-muted-foreground">Jami urinishlar</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{formatCount(finance?.total_payments)}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
              <p className="text-sm text-muted-foreground">Muvaffaqiyatli</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{formatCount(finance?.successful_payments)}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
              <p className="text-sm text-muted-foreground">Xato</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{formatCount(finance?.failed_payments)}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
              <p className="text-sm text-muted-foreground">Kutilayotgan</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{formatCount(finance?.pending_payments)}</p>
            </div>
          </div>
        )}
      </AdminSurface>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-36 rounded-[1.5rem]" />
        ))}
      </div>
      <Skeleton className="h-14 rounded-2xl" />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Skeleton className="h-80 rounded-[1.5rem]" />
        <Skeleton className="h-80 rounded-[1.5rem]" />
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { user, loading: userLoading } = useUser();
  const isAdmin = isSuperAdmin(user);
  const dashboard = useAsyncResource(() => getAdminDashboardData(), [isAdmin], isAdmin);
  const [section, setSection] = useState<DashboardSection>("overview");

  if (userLoading || dashboard.loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Admin"
          title="Boshqaruv paneli"
          description="Asosiy ko'rsatkichlar, tavsiyalar va tushum bir joyda."
        />
        <LoadingState />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <EmptyState
        title="Admin huquqi talab qilinadi"
        description="Bu bo'limni ko'rish uchun administrator sifatida tizimga kiring."
      />
    );
  }

  if (dashboard.error || !dashboard.data) {
    return (
      <ErrorState
        title="Ma'lumot yuklanmadi"
        description="Dashboard ma'lumotlarini yuklashda muammo yuz berdi."
        action={
          <Button onClick={() => void dashboard.reload()} variant="outline">
            Qayta tekshirish
          </Button>
        }
      />
    );
  }

  const data = dashboard.data;
  const analytics = data.analytics;
  const growthSummary = data.growthSummary;
  const paymentSummary = data.paymentSummary;
  const averageAccuracy = getAverageAccuracy(analytics);
  const actionCards = buildActionCards(data);
  const insights = buildAdminDashboardInsights(analytics).slice(0, 2);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Boshqaruv paneli"
        description="Nima qilish kerakligi, tizim holati va tushum ko'rinishi shu yerda jamlandi."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/content" className={buttonStyles({ variant: "outline", size: "sm" })}>
              Kontent
            </Link>
            <Link href="/admin/marketplace" className={buttonStyles({ variant: "outline", size: "sm" })}>
              Arizalar
            </Link>
            <Link href="/admin/billing" className={buttonStyles({ variant: "outline", size: "sm" })}>
              To&apos;lovlar
            </Link>
            <Link href="/admin/analytics" className={buttonStyles({ variant: "outline", size: "sm" })}>
              Statistika
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Jami foydalanuvchilar"
          value={formatCount(analytics?.total_users)}
          caption="Platformadagi barcha foydalanuvchilar"
          icon={Users}
          tone="primary"
        />
        <AdminStatCard
          label="Faol foydalanuvchilar"
          value={formatCount(analytics?.active_users)}
          caption="Hozir faol hisoblangan foydalanuvchilar"
          icon={Sparkles}
          tone="success"
        />
        <AdminStatCard
          label="Jami savollar"
          value={formatCount(analytics?.total_questions)}
          caption="Savollar bazasi bo'yicha umumiy qamrov"
          icon={BookOpen}
          tone="neutral"
        />
        <AdminStatCard
          label="O'rtacha natija"
          value={formatPercent(averageAccuracy)}
          caption={averageAccuracy === null ? "Hali yetarli javob ma'lumoti yo'q" : "To'g'ri javoblarning o'rtacha ulushi"}
          icon={Percent}
          tone="warning"
        />
      </div>

      <Tabs value={section} onValueChange={(value) => setSection(value as DashboardSection)}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList>
            <TabsTrigger value="overview">Umumiy</TabsTrigger>
            <TabsTrigger value="applications">Arizalar</TabsTrigger>
            <TabsTrigger value="content">Kontent</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
            <TabsTrigger value="financials">Moliyaviy holat</TabsTrigger>
          </TabsList>
          <p className="text-sm text-muted-foreground">
            Har bo&apos;lim alohida ko&apos;rsatiladi, shu sabab keraksiz uzoq scroll kamayadi.
          </p>
        </div>

        <TabsContent value="overview">
          <OverviewPanel actionCards={actionCards} insights={insights} />
        </TabsContent>

        <TabsContent value="applications">
          <ApplicationsPanel analytics={analytics} />
        </TabsContent>

        <TabsContent value="content">
          <ContentPanel analytics={analytics} averageAccuracy={averageAccuracy} />
        </TabsContent>

        <TabsContent value="growth">
          <GrowthPanel growthSummary={growthSummary} />
        </TabsContent>

        <TabsContent value="financials">
          <FinancialPanel paymentSummary={paymentSummary} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
