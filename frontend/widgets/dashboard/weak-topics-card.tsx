"use client";

import Link from "next/link";
import { BookOpen, Check } from "lucide-react";

import { masteryStateMeta, type TopicMasteryState } from "@/lib/learning";
import { cn } from "@/lib/utils";
import { buttonStyles } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Surface } from "@/shared/ui/surface";

type WeakTopicCardItem = {
  topic: string;
  state: TopicMasteryState;
  lessonHref: string;
  selected: boolean;
  improved: boolean;
};

type WeakTopicsCardProps = {
  items: WeakTopicCardItem[];
  onToggleTopic: (topic: string) => void;
  onLessonOpen: (topic: string) => void;
};

function progressSegments(state: TopicMasteryState) {
  if (state === "mastered") return 4;
  if (state === "stable") return 3;
  if (state === "improving") return 2;
  return 1;
}

export function WeakTopicsCard({
  items,
  onToggleTopic,
  onLessonOpen,
}: WeakTopicsCardProps) {
  return (
    <Surface
      variant="secondary"
      padding="md"
      className="h-full rounded-[1.45rem] border-[color:color-mix(in_srgb,var(--border)_24%,transparent)]"
    >
      <div className="mb-4">
        <h3 className="text-section font-semibold">Zaif mavzular</h3>
        <p className="text-caption mt-1">
          Mashqdan oldin qaysi mavzularga e&apos;tibor berishni tanlang.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Zaif mavzu yo'q"
          description="Mavzular yaxshilangach bu ro'yxat qisqaradi."
        />
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => {
            const masteryMeta = masteryStateMeta(item.state);
            const activeSegments = progressSegments(item.state);

            return (
              <div
                key={item.topic}
                className={cn(
                  "rounded-[1rem] border bg-[var(--muted)]/36 p-3.5 transition-all",
                  item.selected
                    ? "border-[var(--primary)]/40 bg-[var(--primary-soft)]"
                    : "border-[var(--border)]/60",
                )}
              >
                <label className="flex cursor-pointer gap-3.5">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={item.selected}
                    onChange={() => onToggleTopic(item.topic)}
                  />
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
                      item.selected
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                        : "border-[var(--border)] bg-transparent",
                    )}
                    aria-hidden
                  >
                    <Check className="h-3 w-3" />
                  </span>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-[0.95rem] font-semibold">{item.topic}</h4>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.25 py-0.5 text-[0.68rem] font-medium",
                          item.state === "mastered" || item.state === "stable"
                            ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                            : item.state === "improving"
                              ? "bg-sky-500/12 text-sky-600 dark:text-sky-400"
                              : "bg-[var(--accent-soft)] text-[var(--accent)]",
                        )}
                      >
                        {masteryMeta.label}
                      </span>
                    </div>

                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-all duration-500",
                            i < activeSegments
                              ? item.state === "mastered"
                                ? "bg-[var(--primary)]"
                                : item.state === "stable"
                                  ? "bg-[var(--primary)]/80"
                                  : item.state === "improving"
                                    ? "bg-sky-500"
                                    : "bg-[var(--accent)]"
                              : "bg-[var(--muted)]",
                          )}
                        />
                      ))}
                    </div>

                    <Link
                      href={item.lessonHref}
                      onClick={() => onLessonOpen(item.topic)}
                      className={buttonStyles({
                        variant: "outline",
                        size: "sm",
                        className: "mt-1.5 rounded-lg",
                      })}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Darsni ko&apos;rish
                    </Link>
                  </div>
                </label>
              </div>
            );
          })}

          <p className="text-caption rounded-lg bg-[var(--muted)]/60 px-4 py-2.5 text-center">
            Tanlangan mavzular bugungi mashqda hisobga olinadi.
          </p>
        </div>
      )}
    </Surface>
  );
}
