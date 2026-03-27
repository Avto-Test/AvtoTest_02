import type { AdminMetricTrendSnapshot } from "@/types/admin";

export type AdminTrendDirection = "increasing" | "decreasing" | "stable";

export type AdminCalculatedTrend = {
  direction: AdminTrendDirection;
  ratio: number | null;
  percentChange: number | null;
};

type TrendOptions = {
  minimumSampleSize?: number;
};

export function calculateMetricTrend(
  snapshot: AdminMetricTrendSnapshot | null | undefined,
  options: TrendOptions = {},
): AdminCalculatedTrend | null {
  if (!snapshot) {
    return null;
  }

  const minimumSampleSize = options.minimumSampleSize ?? 1;
  const currentSample = snapshot.sample_size_current ?? minimumSampleSize;
  const previousSample = snapshot.sample_size_previous ?? minimumSampleSize;

  if (currentSample < minimumSampleSize || previousSample < minimumSampleSize) {
    return null;
  }

  if (snapshot.previous === 0) {
    return null;
  }

  const ratio = (snapshot.current - snapshot.previous) / snapshot.previous;
  const percentChange = ratio * 100;

  if (ratio > 0.1) {
    return {
      direction: "increasing",
      ratio,
      percentChange,
    };
  }

  if (ratio < -0.1) {
    return {
      direction: "decreasing",
      ratio,
      percentChange,
    };
  }

  return {
    direction: "stable",
    ratio,
    percentChange,
  };
}

export function trendArrow(direction: AdminTrendDirection) {
  if (direction === "increasing") {
    return "\u2191";
  }

  if (direction === "decreasing") {
    return "\u2193";
  }

  return "\u2192";
}
