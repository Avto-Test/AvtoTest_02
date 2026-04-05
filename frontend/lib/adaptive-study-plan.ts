import { buildLearningPathTopicProgress } from "@/lib/learning";
import type { AnalyticsSummary, DashboardAnalytics, ReviewQueueResponse } from "@/types/analytics";

export type AdaptivePlanItem = {
  key: "practice" | "lesson" | "review";
  label: string;
  hint: string;
  completed: boolean;
};

export type AdaptiveStudyPlan = {
  practiceQuestionCount: number;
  lessonCount: number;
  reviewCount: number;
  dailyItems: AdaptivePlanItem[];
  weeklyGoals: string[];
  weeklyTopicGoal: number;
  simulationGoalLabel: string;
  readinessPrediction: string | null;
  attemptsUntilSimulation: number | null;
  completionPercent: number;
  progressMessage: string | null;
  completedTaskCount: number;
  totalTaskCount: number;
};

type BuildAdaptiveStudyPlanOptions = {
  dashboard: DashboardAnalytics;
  summary?: AnalyticsSummary | null;
  reviewQueue?: ReviewQueueResponse | null;
  focusTopic?: string | null;
  lessonTitle?: string | null;
  lessonTopic?: string | null;
  completedOverrides?: Partial<Record<AdaptivePlanItem["key"], boolean>>;
};

function isSameLocalDay(timestamp?: string | null, target = new Date()) {
  if (!timestamp) return false;
  const parsed = new Date(timestamp);
  return (
    parsed.getFullYear() === target.getFullYear() &&
    parsed.getMonth() === target.getMonth() &&
    parsed.getDate() === target.getDate()
  );
}

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function classifyActivity(title: string): AdaptivePlanItem["key"] | "other" {
  const normalizedTitle = normalizeText(title);
  if (normalizedTitle.includes("lesson") || normalizedTitle.includes("learning") || normalizedTitle.includes("dars")) {
    return "lesson";
  }
  if (normalizedTitle.includes("review")) {
    return "review";
  }
  if (normalizedTitle.includes("random") || normalizedTitle.includes("practice") || normalizedTitle.includes("mashq")) {
    return "practice";
  }
  return "other";
}

function formatTaskCount(value: number, singular: string) {
  return `${value} ${singular}`;
}

export function buildAdaptiveStudyPlan({
  dashboard,
  summary,
  reviewQueue,
  focusTopic,
  lessonTitle,
  lessonTopic,
  completedOverrides,
}: BuildAdaptiveStudyPlanOptions): AdaptiveStudyPlan {
  const normalizedFocusTopic = focusTopic?.trim() || lessonTopic?.trim() || "Asosiy mavzu";
  const dueReviewCount = reviewQueue?.total_due ?? dashboard.overview.total_due ?? 0;
  const recommendedQuestionCount = Math.max(5, dashboard.recommendation.question_count ?? 12);
  const practiceQuestionCount =
    dashboard.recommendation.kind === "repeated_mistake"
      ? recommendedQuestionCount
      : dueReviewCount > 0
        ? Math.max(10, recommendedQuestionCount)
        : recommendedQuestionCount;
  const lessonCount = 1;
  const reviewCount = 1;

  const todayActivities = (summary?.last_attempts ?? []).filter((attempt) => isSameLocalDay(attempt.finished_at));
  const todayActivityKinds = new Set(
    todayActivities
      .map((attempt) => classifyActivity(attempt.test_title))
      .filter((kind): kind is AdaptivePlanItem["key"] => kind !== "other"),
  );

  const learningPath = buildLearningPathTopicProgress(dashboard);
  const activeTopics = learningPath.filter((topic) => topic.state === "weak" || topic.state === "improving");
  const weeklyTopicGoal = Math.max(1, Math.min(3, activeTopics.length || 1));

  const readinessValue = dashboard.simulation_status?.readiness_gate_score ?? dashboard.overview.readiness_score;
  const readinessThreshold = dashboard.simulation_status?.readiness_threshold ?? 70;
  const readinessGap = Math.max(0, readinessThreshold - readinessValue);
  const attemptsUntilSimulation =
    !dashboard.simulation_status?.launch_ready && readinessGap > 0 && readinessGap <= 18
      ? Math.max(1, Math.ceil(readinessGap / 8))
      : null;
  const readinessPrediction = dashboard.simulation_status?.launch_ready
    ? "Simulyatsiya hozir ochiq."
    : attemptsUntilSimulation
      ? `Yana ${attemptsUntilSimulation} ta mashqdan keyin simulyatsiya ochiladi.`
      : null;

  const simulationGoalLabel =
    dashboard.simulation_status?.launch_ready || attemptsUntilSimulation !== null || readinessValue >= 55
      ? "1 simulyatsiya topshirish"
      : "simulyatsiyaga tayyorlanish";

  const dailyItems: AdaptivePlanItem[] = [
    {
      key: "practice",
      label: `${formatTaskCount(practiceQuestionCount, "ta savol mashq")}`,
      hint: normalizedFocusTopic
        ? `${normalizedFocusTopic} mavzusiga e'tibor qaratilgan qisqa blok.`
        : "Bugungi ritmni ushlab turish uchun fokuslangan mashq.",
      completed: completedOverrides?.practice ?? todayActivityKinds.has("practice"),
    },
    {
      key: "lesson",
      label: `${lessonCount} dars`,
      hint: lessonTitle
        ? `${lessonTitle} tavsiya etiladi.`
        : `${lessonTopic ?? normalizedFocusTopic} bo'yicha qisqa dars ko'rish tavsiya etiladi.`,
      completed: completedOverrides?.lesson ?? todayActivityKinds.has("lesson"),
    },
    {
      key: "review",
      label: `${reviewCount} review mashqi`,
      hint:
        dueReviewCount > 0
          ? `${dueReviewCount} ta review savoli navbatda turibdi.`
          : `${normalizedFocusTopic} bo'yicha qisqa qayta ko'rish foydali bo'ladi.`,
      completed: completedOverrides?.review ?? todayActivityKinds.has("review"),
    },
  ];

  const completedTaskCount = dailyItems.filter((item) => item.completed).length;
  const totalTaskCount = dailyItems.length;
  const completionPercent = totalTaskCount > 0
    ? Math.round((completedTaskCount / totalTaskCount) * 100)
    : 0;
  const progressMessage = completionPercent > 0
    ? `Bugungi rejaning ${completionPercent}% bajarildi.`
    : null;

  return {
    practiceQuestionCount,
    lessonCount,
    reviewCount,
    dailyItems,
    weeklyGoals: [
      `${weeklyTopicGoal} mavzu mustahkamlash`,
      simulationGoalLabel,
    ],
    weeklyTopicGoal,
    simulationGoalLabel,
    readinessPrediction,
    attemptsUntilSimulation,
    completionPercent,
    progressMessage,
    completedTaskCount,
    totalTaskCount,
  };
}
