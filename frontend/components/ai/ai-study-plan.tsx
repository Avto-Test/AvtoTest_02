"use client";

import { ArrowRight, BookOpen, BrainCircuit, RefreshCcw, Target } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonStyles } from "@/shared/ui/button";

type AIStudyPlanProps = {
  recommendationTopic?: string | null;
  guidanceText: string;
  readinessScore: number;
  dueReviews: number;
  lessonRecommendationsCount: number;
  selectedTopics?: string[];
  practiceQuestionCount?: number;
  lessonCount?: number;
  reviewCount?: number;
  onStart: () => void;
  loading?: boolean;
  className?: string;
};

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
      <p className="text-sm text-white/72">{label}</p>
      <p className="text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function PlanItem({
  icon: Icon,
  label,
}: {
  icon: typeof Target;
  label: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/9 px-4 py-3 text-white/92 backdrop-blur-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-white">
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-sm font-medium sm:text-[0.95rem]">{label}</span>
    </li>
  );
}

export function AIStudyPlan({
  recommendationTopic,
  guidanceText,
  readinessScore,
  dueReviews,
  lessonRecommendationsCount,
  selectedTopics = [],
  practiceQuestionCount = 12,
  lessonCount = 1,
  reviewCount = 1,
  onStart,
  loading = false,
  className,
}: AIStudyPlanProps) {
  const visibleTopics = selectedTopics.slice(0, 3);
  const recommendationMessage = recommendationTopic
    ? `Siz uchun eng muhim mavzu: ${recommendationTopic}.`
    : "Siz uchun eng muhim fokus: bugungi mashq ritmini ushlab qolish.";

  return (
    <div className={cn("space-y-4", className)}>
      <section
        className={cn(
          "relative overflow-hidden rounded-[2rem] border border-[color-mix(in_oklab,var(--primary)_18%,white)]",
          "bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_38%,#312e81_100%)] px-6 py-7 shadow-[0_24px_60px_-28px_rgba(37,99,235,0.55)]",
          "surface-hover-lift sm:px-8 sm:py-9 lg:px-12 lg:py-11",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(134,239,172,0.16),transparent_28%)]" />
        <div className="pointer-events-none absolute -left-12 top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 translate-x-1/4 translate-y-1/4 rounded-full bg-cyan-300/12 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)] lg:items-start">
          <div className="space-y-6">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
                <BrainCircuit className="h-3.5 w-3.5" />
                AI Study Coach
              </span>

              <div className="space-y-2">
                <h1 className="text-display text-[2rem] font-semibold tracking-tight text-white sm:text-[2.4rem]">
                  Bugungi reja
                </h1>
                <p className="max-w-2xl text-base text-white/78 sm:text-lg">
                  Bugun quyidagilar tavsiya etiladi:
                </p>
              </div>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <PlanItem icon={Target} label={`${practiceQuestionCount} ta savol mashq`} />
              <PlanItem icon={BookOpen} label={`${lessonCount} dars ko'rish`} />
              <PlanItem icon={RefreshCcw} label={`${reviewCount} mavzu qayta ko'rib chiqish`} />
            </ul>

            <div className="rounded-[1.5rem] border border-white/14 bg-white/12 px-5 py-4 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/66">
                Tavsiya etilgan fokus
              </p>
              <p className="mt-2 text-lg font-medium text-white sm:text-xl">{recommendationMessage}</p>
              {visibleTopics.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {visibleTopics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full border border-white/16 bg-white/10 px-3 py-1 text-sm font-medium text-white/86"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={onStart}
                disabled={loading}
                className={buttonStyles({
                  size: "lg",
                  className:
                    "btn-primary-press h-14 rounded-2xl bg-white px-7 text-base font-semibold text-slate-950 shadow-[0_16px_40px_-20px_rgba(255,255,255,0.9)] hover:bg-white/96 hover:text-slate-950 hover:shadow-[0_16px_48px_-16px_rgba(255,255,255,0.95)]",
                })}
              >
                {loading ? "Yuklanmoqda..." : "Mashqni boshlash"}
                <ArrowRight className="h-5 w-5" />
              </button>

              <p className="max-w-md text-sm leading-6 text-white/72">
                Tizim siz uchun eng foydali mashqni avtomatik tanlaydi va zaif mavzularni birinchi o'ringa qo'yadi.
              </p>
            </div>
          </div>

          <aside className="rounded-[1.75rem] border border-white/12 bg-[color-mix(in_oklab,#0f172a_72%,transparent)] p-5 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/64">
              Bugungi signal
            </p>
            <div className="mt-4 space-y-3">
              <StatRow label="Tayyorlik" value={`${Math.round(readinessScore)}%`} />
              <StatRow label="Review navbati" value={`${dueReviews} ta`} />
              <StatRow
                label="Dars tavsiyasi"
                value={lessonRecommendationsCount > 0 ? `${lessonRecommendationsCount} ta` : "Tayyor"}
              />
            </div>
          </aside>
        </div>
      </section>

      <div className="rounded-[1.5rem] border border-[var(--border)]/60 bg-[color-mix(in_oklab,var(--card)_92%,transparent)] px-5 py-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              AI tavsiyasi
            </p>
            <p className="text-body max-w-3xl leading-7 text-[var(--foreground)]/88">{guidanceText}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
