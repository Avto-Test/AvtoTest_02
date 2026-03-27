import type { AdminAnalyticsCategoryPerformance, AdminAnalyticsSummary } from "@/types/admin";
import { calculateMetricTrend } from "@/features/admin/admin-dashboard-trends";

const MIN_QUESTION_BANK_SIZE = 300;
const LOW_ACCURACY_THRESHOLD = 60;
const LOW_CATEGORY_ACCURACY_THRESHOLD = 50;

export type AdminDashboardInsight = {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  variant: "danger" | "warning" | "success" | "muted";
  badgeLabel: string;
  priority: number;
  trend?: {
    direction: "increasing" | "decreasing" | "stable";
    current: number;
    previous: number;
    percentChange: number | null;
  };
};

function normalizePercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, value));
}

function pickWeakestCategory(
  categories: AdminAnalyticsCategoryPerformance[] | null | undefined,
): { name: string; accuracy: number } | null {
  if (!Array.isArray(categories) || categories.length === 0) {
    return null;
  }

  const ranked = categories
    .map((item) => ({
      name: item.category?.trim() || item.topic?.trim() || "Unnamed category",
      accuracy: normalizePercent(item.accuracy),
    }))
    .filter((item): item is { name: string; accuracy: number } => item.accuracy !== null)
    .sort((left, right) => left.accuracy - right.accuracy);

  return ranked[0] ?? null;
}

export function buildAdminDashboardInsights(
  analytics: AdminAnalyticsSummary | null,
): AdminDashboardInsight[] {
  if (!analytics) {
    return [
      {
        id: "no-analytics",
        title: "Tavsiyalar hali tayyor emas",
        description:
          "Hozir tavsiya chiqarish uchun yetarli statistika yo'q. Foydalanuvchi faolligi oshgach bu yerda aniq signal paydo bo'ladi.",
        actionLabel: "Statistikani ochish",
        href: "/admin/analytics",
        variant: "warning",
        badgeLabel: "Ma'lumot yo'q",
        priority: 100,
      },
    ];
  }

  const insights: AdminDashboardInsight[] = [];
  const averageAccuracy = normalizePercent(analytics.average_accuracy);
  const weakestCategory = pickWeakestCategory(analytics.category_performance);
  const accuracyTrend = calculateMetricTrend(analytics.accuracy_trend, { minimumSampleSize: 5 });
  const activeUsersTrend = calculateMetricTrend(analytics.active_users_trend, { minimumSampleSize: 3 });
  const applicationsTrend = calculateMetricTrend(analytics.applications_trend, { minimumSampleSize: 1 });

  if (
    accuracyTrend &&
    accuracyTrend.direction === "decreasing" &&
    analytics.accuracy_trend
  ) {
    insights.push({
      id: "accuracy-dropping",
      title: "Natija pasaymoqda",
      description: `O'rtacha natija ${Math.round(analytics.accuracy_trend.previous)}% dan ${Math.round(analytics.accuracy_trend.current)}% ga tushdi.`,
      actionLabel: "Savollarni tekshirish",
      href: "/admin/content",
      variant: "danger",
      badgeLabel: "Kritik",
      priority: 120,
      trend: {
        direction: "decreasing",
        current: analytics.accuracy_trend.current,
        previous: analytics.accuracy_trend.previous,
        percentChange: accuracyTrend.percentChange,
      },
    });
  }

  if (
    activeUsersTrend &&
    activeUsersTrend.direction === "decreasing" &&
    analytics.active_users_trend
  ) {
    insights.push({
      id: "user-drop",
      title: "Faol foydalanuvchilar kamaydi",
      description: `Faol foydalanuvchi oqimi ${Math.round(analytics.active_users_trend.previous)} dan ${Math.round(analytics.active_users_trend.current)} ga pasaydi.`,
      actionLabel: "Faollikni tekshirish",
      href: "/admin/users",
      variant: "warning",
      badgeLabel: "Ogohlantirish",
      priority: 105,
      trend: {
        direction: "decreasing",
        current: analytics.active_users_trend.current,
        previous: analytics.active_users_trend.previous,
        percentChange: activeUsersTrend.percentChange,
      },
    });
  }

  if (analytics.pending_applications > 0) {
    insights.push({
      id: "pending-applications",
      title: "Ko'rib chiqiladigan arizalar bor",
      description: `${analytics.pending_applications} ta ariza hali navbatda turibdi. Kechikish onboarding oqimini sekinlashtiradi.`,
      actionLabel: "Arizalarni ko'rish",
      href: "/admin/marketplace",
      variant: "danger",
      badgeLabel: "Kritik",
      priority: 100,
    });
  }

  if (weakestCategory && weakestCategory.accuracy < LOW_CATEGORY_ACCURACY_THRESHOLD) {
    insights.push({
      id: "weak-category",
      title: `${weakestCategory.name} bo'limida xatolar ko'p`,
      description: `${Math.round(weakestCategory.accuracy)}% natija qayd etilgan. Shu bo'limdagi savollarni ko'rib chiqish kerak.`,
      actionLabel: "Savollarni ko'rish",
      href: "/admin/content",
      variant: "danger",
      badgeLabel: "Muammo",
      priority: 95,
    });
  }

  if (averageAccuracy !== null && averageAccuracy < LOW_ACCURACY_THRESHOLD) {
    insights.push({
      id: "low-accuracy",
      title: "Umumiy natija past",
      description: `O'rtacha natija ${Math.round(averageAccuracy)}%. Savollar qiyinligi va javob variantlarini ko'rib chiqish kerak.`,
      actionLabel: "Savollarni tekshirish",
      href: "/admin/content",
      variant: "warning",
      badgeLabel: "Ogohlantirish",
      priority: 90,
    });
  }

  if (
    accuracyTrend &&
    accuracyTrend.direction === "increasing" &&
    analytics.accuracy_trend
  ) {
    insights.push({
      id: "accuracy-improving",
      title: "Natija yaxshilanmoqda",
      description: `O'rtacha natija ${Math.round(analytics.accuracy_trend.previous)}% dan ${Math.round(analytics.accuracy_trend.current)}% ga ko'tarildi.`,
      actionLabel: "Statistikani ochish",
      href: "/admin/analytics",
      variant: "success",
      badgeLabel: "Yaxshi",
      priority: 50,
      trend: {
        direction: "increasing",
        current: analytics.accuracy_trend.current,
        previous: analytics.accuracy_trend.previous,
        percentChange: accuracyTrend.percentChange,
      },
    });
  }

  if (analytics.total_questions < MIN_QUESTION_BANK_SIZE) {
    insights.push({
      id: "low-content",
      title: "Savollar bazasi kichik",
      description: `${analytics.total_questions} ta savol hozircha kam bo'lishi mumkin. Qamrovni kengaytirish tavsiya etiladi.`,
      actionLabel: "Savol qo'shish",
      href: "/admin/content",
      variant: "warning",
      badgeLabel: "Kontent",
      priority: 80,
    });
  }

  if (
    applicationsTrend &&
    applicationsTrend.direction === "increasing" &&
    applicationsTrend.ratio !== null &&
    applicationsTrend.ratio > 0.2 &&
    analytics.applications_trend
  ) {
    insights.push({
      id: "application-spike",
      title: "Arizalar oqimi oshdi",
      description: `Arizalar soni ${Math.round(analytics.applications_trend.previous)} tadan ${Math.round(analytics.applications_trend.current)} taga ko'tarildi.`,
      actionLabel: "Arizalarni ko'rish",
      href: "/admin/marketplace",
      variant: "warning",
      badgeLabel: "O'sish",
      priority: 70,
      trend: {
        direction: "increasing",
        current: analytics.applications_trend.current,
        previous: analytics.applications_trend.previous,
        percentChange: applicationsTrend.percentChange,
      },
    });
  }

  if (averageAccuracy === null) {
    insights.push({
      id: "no-learning-signal",
      title: "Hali yetarli o'quv ma'lumoti yo'q",
      description:
        analytics.active_users > 0
          ? "Faol foydalanuvchilar bor, lekin natija signali hali yetarli emas. Yana biroz foydalanilgach bu yerda tavsiya paydo bo'ladi."
          : "Hali foydalanuvchi faolligi kam. Natija va bo'lim signalini ko'rish uchun ko'proq foydalanish kerak.",
      actionLabel: analytics.active_users > 0 ? "Statistikani ochish" : "Faollikni kuzatish",
      href: analytics.active_users > 0 ? "/admin/analytics" : "/admin/users",
      variant: "muted",
      badgeLabel: "Kutilmoqda",
      priority: 60,
    });
  }

  if (insights.length === 0) {
    return [
      {
        id: "healthy-system",
        title: "Tizim barqaror ishlayapti",
        description:
          "Hozircha keskin muammo ko'rinmayapti. Savollar bazasi, natija va arizalar oqimi boshqariladigan holatda.",
        actionLabel: "Statistikani ochish",
        href: "/admin/analytics",
        variant: "success",
        badgeLabel: "Barqaror",
        priority: 0,
      },
    ];
  }

  return insights.sort((left, right) => right.priority - left.priority).slice(0, 2);
}

export function getWeakestAdminCategory(
  categories: AdminAnalyticsCategoryPerformance[] | null | undefined,
) {
  return pickWeakestCategory(categories);
}
