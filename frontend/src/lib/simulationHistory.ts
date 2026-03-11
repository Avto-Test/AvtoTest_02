"use client";

export type SimulationHistoryEntry = {
  completed_at: string;
  score: number;
  total: number;
  pass_probability: number;
  weak_topics: string[];
};

export const EXAM_SIMULATION_HISTORY_KEY = "autotest.exam-simulation-history.v1";

export function isSimulationAttemptTitle(title: string): boolean {
  const normalized = title.toLowerCase();
  return normalized.includes("simulation") || normalized.includes("simulyatsiya");
}

export function readSimulationHistory(): SimulationHistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(EXAM_SIMULATION_HISTORY_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue) as SimulationHistoryEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => typeof item?.completed_at === "string").slice(0, 6);
  } catch {
    return [];
  }
}

export function writeSimulationHistory(entries: SimulationHistoryEntry[]): SimulationHistoryEntry[] {
  const normalizedEntries = entries
    .filter((item) => Boolean(item.completed_at))
    .sort((left, right) => new Date(right.completed_at).getTime() - new Date(left.completed_at).getTime())
    .slice(0, 6);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(EXAM_SIMULATION_HISTORY_KEY, JSON.stringify(normalizedEntries));
    } catch {
      return normalizedEntries;
    }
  }

  return normalizedEntries;
}

export function mergeSimulationHistory(
  savedEntries: SimulationHistoryEntry[],
  seededEntries: SimulationHistoryEntry[],
): SimulationHistoryEntry[] {
  const uniqueEntries = new Map<string, SimulationHistoryEntry>();

  for (const entry of [...savedEntries, ...seededEntries]) {
    const key = `${entry.completed_at}-${entry.score}-${entry.total}`;
    if (!uniqueEntries.has(key)) {
      uniqueEntries.set(key, entry);
    }
  }

  return writeSimulationHistory([...uniqueEntries.values()]);
}

export function getDaysUntilNextSimulation(completedAt: string): number {
  const completedDate = new Date(completedAt);
  if (Number.isNaN(completedDate.getTime())) {
    return 0;
  }

  const nextAvailableAt = completedDate.getTime() + (14 * 24 * 60 * 60 * 1000);
  const diffMs = nextAvailableAt - Date.now();
  if (diffMs <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

export function formatSimulationDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function buildWeakTopicInsight(history: SimulationHistoryEntry[]): {
  topic: string | null;
  count: number;
  message: string;
} {
  const counts = new Map<string, number>();

  for (const entry of history) {
    for (const topic of entry.weak_topics) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
  }

  if (counts.size === 0) {
    return {
      topic: null,
      count: 0,
      message: "Simulyatsiyalarda umumiy zaif mavzu hali shakllanmagan.",
    };
  }

  const [topic, count] = [...counts.entries()].sort((left, right) => right[1] - left[1])[0];
  return {
    topic,
    count,
    message: `${topic} ${count} ta zaif urinishda takrorlangan.`,
  };
}

export function buildSeededSimulationHistory(
  attempts: Array<{
    test_title: string;
    finished_at: string | null;
    score: number;
  }>,
): SimulationHistoryEntry[] {
  return attempts
    .filter((attempt) => attempt.finished_at && isSimulationAttemptTitle(attempt.test_title))
    .map((attempt) => ({
      completed_at: attempt.finished_at as string,
      score: attempt.score,
      total: 20,
      pass_probability: Number(((attempt.score / 20) * 100).toFixed(1)),
      weak_topics: [],
    }));
}
