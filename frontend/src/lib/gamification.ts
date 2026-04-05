export type AttemptActivityLike = {
  finished_at: string | null;
};

export type XpTierId = "bronze" | "silver" | "gold" | "diamond";

export type XpTier = {
  id: XpTierId;
  label: string;
  minXp: number;
  accentClassName: string;
  mutedClassName: string;
};

export const XP_TIERS: XpTier[] = [
  {
    id: "bronze",
    label: "Bronza",
    minXp: 0,
    accentClassName: "border-amber-200 bg-amber-50 text-amber-700",
    mutedClassName: "border-amber-100 bg-amber-50/70 text-amber-600",
  },
  {
    id: "silver",
    label: "Silver",
    minXp: 1000,
    accentClassName: "border-slate-300 bg-slate-100 text-slate-700",
    mutedClassName: "border-slate-200 bg-slate-100/70 text-slate-600",
  },
  {
    id: "gold",
    label: "Gold",
    minXp: 3000,
    accentClassName: "border-yellow-200 bg-yellow-50 text-yellow-700",
    mutedClassName: "border-yellow-100 bg-yellow-50/70 text-yellow-600",
  },
  {
    id: "diamond",
    label: "Diamond",
    minXp: 7000,
    accentClassName: "border-sky-200 bg-sky-50 text-sky-700",
    mutedClassName: "border-sky-100 bg-sky-50/70 text-sky-600",
  },
];

export type XpTierProgress = {
  tier: XpTier;
  nextTier: XpTier | null;
  remainingXp: number;
  progressPercent: number;
};

export type WeeklyActivityDay = {
  label: string;
  dateKey: string;
  active: boolean;
  isToday: boolean;
};

type TestXpSnapshot = {
  xpTotal: number;
  createdAt: string;
};

export const TEST_XP_SNAPSHOT_KEY = "autotest.test-xp-snapshot.v1";

const WEEKDAY_LABELS = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];

function normalizeDateKey(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

export function getXpTier(xpTotal: number): XpTier {
  const safeXp = Math.max(0, Number.isFinite(xpTotal) ? xpTotal : 0);
  return [...XP_TIERS].reverse().find((tier) => safeXp >= tier.minXp) ?? XP_TIERS[0];
}

export function getXpTierProgress(xpTotal: number): XpTierProgress {
  const safeXp = Math.max(0, Number.isFinite(xpTotal) ? xpTotal : 0);
  const tier = getXpTier(safeXp);
  const tierIndex = XP_TIERS.findIndex((item) => item.id === tier.id);
  const nextTier = XP_TIERS[tierIndex + 1] ?? null;

  if (!nextTier) {
    return {
      tier,
      nextTier: null,
      remainingXp: 0,
      progressPercent: 100,
    };
  }

  const span = Math.max(1, nextTier.minXp - tier.minXp);
  const progressPercent = Math.max(0, Math.min(100, ((safeXp - tier.minXp) / span) * 100));

  return {
    tier,
    nextTier,
    remainingXp: Math.max(0, nextTier.minXp - safeXp),
    progressPercent,
  };
}

export function computePracticeStreak(attempts: AttemptActivityLike[]): number {
  const dates = [...new Set(
    attempts
      .map((attempt) => normalizeDateKey(attempt.finished_at))
      .filter((value): value is string => Boolean(value)),
  )].sort((left, right) => right.localeCompare(left));

  if (dates.length === 0) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDate = new Date(dates[0]);
  firstDate.setHours(0, 0, 0, 0);

  const dayDiff = Math.floor((today.getTime() - firstDate.getTime()) / 86_400_000);
  if (dayDiff > 1) {
    return 0;
  }

  let streak = 1;
  for (let index = 1; index < dates.length; index += 1) {
    const previous = new Date(dates[index - 1]);
    const current = new Date(dates[index]);
    previous.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);

    const diff = Math.floor((previous.getTime() - current.getTime()) / 86_400_000);
    if (diff !== 1) {
      break;
    }
    streak += 1;
  }

  return streak;
}

export function buildWeeklyActivity(attempts: AttemptActivityLike[]): WeeklyActivityDay[] {
  const activeDates = new Set(
    attempts
      .map((attempt) => normalizeDateKey(attempt.finished_at))
      .filter((value): value is string => Boolean(value)),
  );

  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + mondayOffset);

  return WEEKDAY_LABELS.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dateKey = date.toISOString().slice(0, 10);
    return {
      label,
      dateKey,
      active: activeDates.has(dateKey),
      isToday: dateKey === now.toISOString().slice(0, 10),
    };
  });
}

export function writeTestXpSnapshot(xpTotal: number): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const snapshot: TestXpSnapshot = {
      xpTotal: Math.max(0, Number.isFinite(xpTotal) ? xpTotal : 0),
      createdAt: new Date().toISOString(),
    };
    window.sessionStorage.setItem(TEST_XP_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore client storage failures.
  }
}

export function readTestXpSnapshot(): TestXpSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(TEST_XP_SNAPSHOT_KEY);
    if (!rawValue) {
      return null;
    }
    const parsed = JSON.parse(rawValue) as TestXpSnapshot;
    if (typeof parsed?.xpTotal !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearTestXpSnapshot(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(TEST_XP_SNAPSHOT_KEY);
  } catch {
    // Ignore client storage failures.
  }
}
