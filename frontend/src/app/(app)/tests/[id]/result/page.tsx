"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTestStore } from "@/store/useTestStore";
import { BadgeV2, ButtonV2, CardV2 } from "@/components/ui-v2";
import { AnswerReviewAccordion } from "@/components/result/AnswerReviewAccordion";

interface ResultAnswer {
  question_id: string;
  selected_option_id: string;
  correct_option_id: string;
  is_correct: boolean;
  dynamic_difficulty_score?: number;
  difficulty_label?: string;
  reinforcement_message?: string;
}

interface StoredResult {
  score: number;
  total: number;
  correct_count?: number;
  mistakes_count?: number;
  passed: boolean;
  answers: ResultAnswer[];
  answers_unlocked?: boolean;
  unlock_reason?: string | null;
  pass_prediction_label?: string | null;
  cognitive_profile?: string | null;
}

interface TopicStat {
  topic: string;
  total: number;
  correct: number;
  accuracy: number;
}

function estimateProbability(result: StoredResult) {
  let estimated = (result.score / result.total) * 100;
  const label = result.pass_prediction_label;

  if (label === "Exam Ready") estimated = 98;
  else if (label === "Very Likely to Pass") estimated = 88;
  else if (label === "Likely to Pass") estimated = 75;
  else if (label === "Needs Improvement") estimated = 55;
  else if (label === "High Risk of Failing") estimated = 35;

  return Math.max(0, Math.min(100, Math.round(estimated)));
}

function getReadinessLabel(result: StoredResult) {
  if (result.pass_prediction_label && result.pass_prediction_label.trim().length > 0) {
    return result.pass_prediction_label;
  }

  if (result.passed) return "Likely to Pass";
  return "Needs Improvement";
}

export default function ResultPageV2() {
  const params = useParams();
  const router = useRouter();
  const { result, reset, questions } = useTestStore();

  const testId = String(params.id);
  const typedResult = (result as StoredResult | null) ?? null;

  useEffect(() => {
    if (!typedResult) {
      router.replace("/tests?mode=adaptive");
    }
  }, [typedResult, router, testId]);

  const report = useMemo(() => {
    if (!typedResult) return null;

    const topicMap: Record<string, { topic: string; total: number; correct: number }> = {};

    typedResult.answers.forEach((answer) => {
      const question = questions.find((q) => q.id === answer.question_id);
      const topic = question?.topic || "General";

      if (!topicMap[topic]) {
        topicMap[topic] = { topic, total: 0, correct: 0 };
      }

      topicMap[topic].total += 1;
      if (answer.is_correct) topicMap[topic].correct += 1;
    });

    const topicBreakdown: TopicStat[] = Object.values(topicMap).map((entry) => ({
      topic: entry.topic,
      total: entry.total,
      correct: entry.correct,
      accuracy: (entry.correct / entry.total) * 100,
    }));

    const sortedTopics = [...topicBreakdown].sort((a, b) => a.accuracy - b.accuracy);
    const weakestTopic = sortedTopics[0] || null;
    const passProbability = estimateProbability(typedResult);
    const readinessLabel = getReadinessLabel(typedResult);
    const stabilityLabel =
      typedResult.cognitive_profile && typedResult.cognitive_profile.trim().length > 0
        ? typedResult.cognitive_profile
        : "Unknown";

    return {
      topicBreakdown,
      sortedTopics,
      weakestTopic,
      passProbability,
      readinessLabel,
      stabilityLabel,
    };
  }, [typedResult, questions]);

  if (!typedResult || !report) return null;

  const finalScore = Math.round((typedResult.score / typedResult.total) * 100);
  const passProbability = report.passProbability;
  const correctCount = typedResult.correct_count ?? typedResult.score;
  const mistakesCount = typedResult.mistakes_count ?? Math.max(0, typedResult.total - correctCount);
  const answersUnlocked = typedResult.answers_unlocked !== false;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 pb-12 pt-10 md:px-0">
      <div className="flex items-center">
        <ButtonV2
          variant="ghost"
          className="px-0"
          onClick={() => {
            reset();
            router.push("/dashboard");
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </ButtonV2>
      </div>

      <CardV2 className="p-6 md:p-8">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-wide text-[var(--v2-text-tertiary)]">Executive Summary</p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl bg-[var(--v2-surface-subtle)] p-6">
              <div className="space-y-2">
                <p className="text-sm text-[var(--v2-text-tertiary)]">Final Score</p>
                <div className="flex items-center gap-3">
                  <p className="text-6xl font-semibold font-mono leading-none text-[var(--v2-text-primary)]">
                    {finalScore}%
                  </p>
                  <BadgeV2 variant={typedResult.passed ? "success" : "warning"}>
                    {typedResult.passed ? "Passed" : "Not Passed"}
                  </BadgeV2>
                </div>
                <p className="text-sm text-[var(--v2-text-secondary)]">
                  {correctCount} / {typedResult.total} correct
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-[var(--v2-text-tertiary)]">Pass Probability</p>
                <p className="text-3xl font-mono font-semibold text-[var(--v2-text-primary)]">
                  {passProbability}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-[var(--v2-text-tertiary)]">Readiness</p>
                <p className="text-lg font-semibold text-[var(--v2-text-primary)]">{report.readinessLabel}</p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-sm text-[var(--v2-text-tertiary)]">Stability</p>
                <p className="text-lg font-semibold text-[var(--v2-text-primary)]">{report.stabilityLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </CardV2>

      <CardV2 className="p-6 md:p-8">
        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--v2-text-tertiary)]">
              Performance Breakdown
            </p>
          </div>

          {!answersUnlocked ? (
            <div className="mb-2 rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface-subtle)] px-4 py-3">
              <p className="text-sm text-[var(--v2-text-tertiary)]">Detailed Review</p>
              <p className="mt-1 text-base font-semibold text-[var(--v2-text-primary)]">
                {mistakesCount} ta xato aniqlandi
              </p>
              <p className="text-sm text-[var(--v2-text-tertiary)]">
                Togri javoblar va xato savollar royxati Premium tarifda ochiladi.
              </p>
            </div>
          ) : null}

          {answersUnlocked && report.weakestTopic && (
            <div className="mb-2 rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface-subtle)] px-4 py-3">
              <p className="text-sm text-[var(--v2-text-tertiary)]">Weakest Topic</p>
              <p className="mt-1 text-base font-semibold text-[var(--v2-text-primary)]">
                {report.weakestTopic.topic} ({Math.round(report.weakestTopic.accuracy)}%)
              </p>
            </div>
          )}

          <div className="space-y-3">
            {report.sortedTopics.map((topic) => {
              const isWeakest = report.weakestTopic?.topic === topic.topic;
              return (
                <div
                  key={topic.topic}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${isWeakest
                      ? "border-[var(--v2-border)] bg-[var(--v2-surface-subtle)] ring-1 ring-[var(--v2-border-strong)]"
                      : "border-[var(--v2-border)] bg-[var(--v2-surface)]"
                    }`}
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--v2-text-primary)]">{topic.topic}</p>
                    <p className="text-xs text-[var(--v2-text-tertiary)]">
                      {topic.correct}/{topic.total} correct
                    </p>
                  </div>
                  <p className="text-xl font-mono font-semibold text-[var(--v2-text-primary)]">
                    {Math.round(topic.accuracy)}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardV2>

      {answersUnlocked && typedResult.answers.length > 0 ? (
        <CardV2 className="p-6 md:p-8">
          <AnswerReviewAccordion answers={typedResult.answers} questions={questions} />
        </CardV2>
      ) : null}

      <CardV2 className="p-6 md:p-8">
        <div className="space-y-5">
          <p className="text-xs uppercase tracking-wide text-[var(--v2-text-tertiary)]">
            Action Recommendation
          </p>

          <div className="space-y-2">
            <p className="text-base font-medium text-[var(--v2-text-primary)]">
              {report.weakestTopic
                ? `Prioritize ${report.weakestTopic.topic} to improve pass likelihood.`
                : "Continue with adaptive practice to reinforce weak areas."}
            </p>
            <p className="text-sm text-[var(--v2-text-tertiary)]">
              Use adaptive mode for targeted reinforcement and review due topics for retention stability.
            </p>
            <p className="text-sm text-[var(--v2-text-tertiary)]">
              {passProbability < 70
                ? "Small consistent sessions outperform long cramming."
                : "You're close to mastery. Reinforce weak areas to stabilize performance."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonV2
              variant="primary"
              className="flex-1 sm:flex-none"
              onClick={() => {
                reset();
                router.push("/tests?mode=adaptive");
              }}
            >
              Start Adaptive Practice
            </ButtonV2>
            <ButtonV2 variant="outline" className="flex-1 sm:flex-none" asChild>
              <Link href="/review-queue">Review Due Topics</Link>
            </ButtonV2>
          </div>
        </div>
      </CardV2>
    </div>
  );
}
