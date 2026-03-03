interface ZonePerformanceV2Props {
  overview: {
    total_attempts?: number;
    average_score?: number;
    improvement_delta?: number;
    improvement_direction?: "up" | "down" | "stable" | string;
    [key: string]: unknown;
  };
}

function formatInt(value: number | undefined) {
  const safe = Number.isFinite(value) ? Number(value) : 0;
  return Math.round(safe).toLocaleString();
}

function formatPercent(value: number | undefined) {
  const safe = Number.isFinite(value) ? Number(value) : 0;
  return `${Math.round(safe)}%`;
}

function getDeltaText(delta: number | undefined, direction: string | undefined) {
  const safe = Math.abs(Number.isFinite(delta) ? Number(delta) : 0);
  if (direction === "up") return `+${Math.round(safe)}%`;
  if (direction === "down") return `-${Math.round(safe)}%`;
  return `${Math.round(safe)}%`;
}

export function ZonePerformanceV2({ overview }: ZonePerformanceV2Props) {
  const deltaDirection = overview?.improvement_direction;
  const deltaClass =
    deltaDirection === "up"
      ? "text-[var(--v2-success)]"
      : deltaDirection === "down"
      ? "text-[var(--v2-warning)]"
      : "text-[var(--v2-text-primary)]";

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-[var(--v2-text-tertiary)]">Performance</p>
        <h2 className="text-sm font-medium text-[var(--v2-text-primary)]">Performance Snapshot</h2>
        <p className="text-sm text-[var(--v2-text-secondary)]">
          Attempt volume, average score, and trend delta from recent sessions.
        </p>
      </div>
      <div className="flex flex-col gap-8 border-b border-[var(--v2-border)] py-6 md:flex-row md:items-end">
        <div className="space-y-1 md:flex-1">
          <p className="text-3xl font-mono font-semibold leading-none text-[var(--v2-text-primary)]">
            {formatInt(overview?.total_attempts)}
          </p>
          <p className="text-sm text-[var(--v2-text-tertiary)]">Total Attempts</p>
        </div>

        <div className="space-y-1 md:flex-1">
          <p className="text-3xl font-mono font-semibold leading-none text-[var(--v2-text-primary)]">
            {formatPercent(overview?.average_score)}
          </p>
          <p className="text-sm text-[var(--v2-text-tertiary)]">Average Score</p>
        </div>

        <div className="space-y-1 md:flex-1">
          <p className={`text-3xl font-mono font-semibold leading-none ${deltaClass}`}>
            {getDeltaText(overview?.improvement_delta, deltaDirection)}
          </p>
          <p className="text-sm text-[var(--v2-text-tertiary)]">Improvement Delta</p>
        </div>
      </div>
    </section>
  );
}
