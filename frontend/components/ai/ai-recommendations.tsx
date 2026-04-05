"use client";

import type { AdaptiveStudyPlan } from "@/lib/adaptive-study-plan";
import { cn } from "@/lib/utils";
import {
  PracticeLaunchPanel,
  type PracticeLaunchMetric,
  type PracticeLaunchPreviewItem,
  type PracticeLaunchTag,
} from "@/components/practice-launch-panel";

type AIRecommendationsProps = {
  focusTopic?: string | null;
  lessonTopic?: string | null;
  plan: AdaptiveStudyPlan;
  onStart: () => void;
  loading?: boolean;
  className?: string;
};

export function AIRecommendations({
  focusTopic,
  lessonTopic,
  plan,
  onStart,
  loading = false,
  className,
}: AIRecommendationsProps) {
  const recommendedTopic = focusTopic ?? lessonTopic ?? "Asosiy mavzu";
  const tags = [
    { label: `${recommendedTopic} fokusi`, tone: "primary" },
    plan.progressMessage ? { label: plan.progressMessage, tone: "neutral" } : null,
    plan.readinessPrediction
      ? {
          label: plan.readinessPrediction,
          tone: plan.attemptsUntilSimulation ? "warning" : "success",
        }
      : null,
  ].filter(Boolean) as PracticeLaunchTag[];
  const metrics: PracticeLaunchMetric[] = [
    { label: "Savollar", value: `${plan.practiceQuestionCount}`, tone: "primary" },
    {
      label: "Kunlik reja",
      value: `${plan.completedTaskCount}/${plan.totalTaskCount}`,
      tone: plan.completedTaskCount > 0 ? "success" : "neutral",
    },
    { label: "Haftalik fokus", value: `${plan.weeklyTopicGoal} mavzu`, tone: "neutral" },
  ];
  const previewItems: PracticeLaunchPreviewItem[] = plan.dailyItems.map((item) => ({
    label: item.label,
    hint: item.hint,
    status: item.completed ? "complete" : item.key === "practice" ? "active" : "queued",
  }));

  return (
    <PracticeLaunchPanel
      eyebrow="Bugungi mashq"
      title={`${plan.practiceQuestionCount} ta savol`}
      subtitle={`${recommendedTopic} mavzusi`}
      description="Tizim sizning hozirgi tayyorgarligingizga qarab fokuslangan mashq blokini yig'di."
      tags={tags}
      metrics={metrics}
      previewBadge="AI Coach preview"
      previewTitle={`${recommendedTopic} bo'yicha adaptiv oqim`}
      previewDescription={
        plan.readinessPrediction ??
        "Savol, darhol feedback va real haydovchilik tavsiyasi bilan yuqori fokusli sessiya."
      }
      previewItems={previewItems}
      ctaLabel="Mashqni boshlash"
      helperText={plan.progressMessage ?? "Bugungi fokus shu blokdan boshlanadi."}
      onStart={onStart}
      loading={loading}
      className={cn("animate-fade-in", className)}
    />
  );
}
