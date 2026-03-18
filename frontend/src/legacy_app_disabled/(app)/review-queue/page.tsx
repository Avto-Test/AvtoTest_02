"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, BrainCircuit, CalendarClock } from "lucide-react";
import api from "@/lib/axios";
import { DueTopic, ReviewQueueResponse } from "@/types/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getRiskLevel(topic: DueTopic): "high" | "medium" | "low" {
  if (topic.retention_score < 0.45 || topic.bkt_prob < 0.5) return "high";
  if (topic.retention_score < 0.7 || topic.bkt_prob < 0.7) return "medium";
  return "low";
}

export default function ReviewQueuePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dueTopics, setDueTopics] = useState<DueTopic[]>([]);

  useEffect(() => {
    async function loadQueue() {
      try {
        const res = await api.get<ReviewQueueResponse>("/analytics/me/review-queue");
        setDueTopics(res.data.due_topics || []);
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "response" in err
            ? ((err as { response?: { data?: { detail?: string } } }).response?.data?.detail ??
              "Failed to load review queue.")
            : "Failed to load review queue.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadQueue();
  }, []);

  const sortedTopics = useMemo(() => {
    return [...dueTopics].sort((a, b) => {
      const riskDiff =
        (getRiskLevel(a) === "high" ? 3 : getRiskLevel(a) === "medium" ? 2 : 1) -
        (getRiskLevel(b) === "high" ? 3 : getRiskLevel(b) === "medium" ? 2 : 1);
      if (riskDiff !== 0) return -riskDiff;
      return new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime();
    });
  }, [dueTopics]);

  const highRiskCount = useMemo(
    () => sortedTopics.filter((topic) => getRiskLevel(topic) === "high").length,
    [sortedTopics]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Review Queue</h1>
          <p className="text-slate-500">Spaced repetition bo&apos;yicha bugun qayta ko&apos;rish kerak bo&apos;lgan mavzular.</p>
        </div>
        <Button asChild className="bg-slate-900 text-white hover:bg-[#00B37E]">
          <Link href="/tests?mode=adaptive">
            Start Adaptive Session
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{error}</span>
          </CardContent>
        </Card>
      ) : null}

      {!error ? (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-amber-500" />
              Priority Overview
            </CardTitle>
            <CardDescription>High-risk mavzular birinchi navbatda takrorlanadi.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Badge variant="outline" className="border-slate-300">
              Total Due: {sortedTopics.length}
            </Badge>
            <Badge
              className={highRiskCount > 0 ? "bg-red-500 text-white" : "bg-emerald-500 text-white"}
            >
              High Risk: {highRiskCount}
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      {!error && sortedTopics.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="p-6 text-sm text-slate-600">
            Hozircha due topic yo&apos;q. Adaptive practice davom ettirish tavsiya qilinadi.
          </CardContent>
        </Card>
      ) : null}

      {!error && sortedTopics.length > 0 ? (
        <div className="grid gap-4">
          {sortedTopics.map((topic) => {
            const risk = getRiskLevel(topic);
            return (
              <Card key={`${topic.topic}-${topic.next_review_at}`} className="border-slate-200">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-slate-900">{topic.topic}</p>
                      <p className="flex items-center gap-2 text-sm text-slate-500">
                        <CalendarClock className="h-4 w-4" />
                        Next review: {formatDateTime(topic.next_review_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Retention: {Math.round(topic.retention_score * 100)}%</Badge>
                      <Badge variant="outline">Mastery: {Math.round(topic.bkt_prob * 100)}%</Badge>
                      <Badge
                        className={
                          risk === "high"
                            ? "bg-red-500 text-white"
                            : risk === "medium"
                              ? "bg-amber-500 text-white"
                              : "bg-emerald-500 text-white"
                        }
                      >
                        {risk.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
