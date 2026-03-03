import { BadgeV2, CardV2 } from "@/components/ui-v2";

interface ZonePrimaryAIV2Props {
  overview: {
    pass_probability?: number;
    pass_prediction_label?: string;
    readiness_score?: number;
    current_training_level?: string | null;
    cognitive_stability?: string | null;
    drift_status?: string;
    ml_status?: string;
    [key: string]: unknown;
  };
  user?: {
    plan?: string;
  } | null;
}

function clampPercent(value: number | undefined) {
  const safeValue = Number.isFinite(value) ? Number(value) : 0;
  return Math.min(100, Math.max(0, Math.round(safeValue)));
}

function getReadinessMeta(score: number) {
  if (score >= 90) return { label: "Exam Ready", variant: "success" as const };
  if (score >= 75) return { label: "Near Ready", variant: "warning" as const };
  if (score >= 50) return { label: "Improving", variant: "warning" as const };
  return { label: "Not Ready", variant: "neutral" as const };
}

function getTrainingLevelLabel(level: string | null | undefined) {
  const normalized = (level || "beginner").toLowerCase();
  if (normalized === "advanced") return "Advanced";
  if (normalized === "intermediate") return "Intermediate";
  return "Beginner";
}

function getDriftMeta(status: string | undefined) {
  if (status === "severe") return { label: "Drift: Severe", variant: "warning" as const };
  if (status === "moderate") return { label: "Drift: Moderate", variant: "warning" as const };
  return { label: "Model Stable", variant: "success" as const };
}

export function ZonePrimaryAIV2({ overview }: ZonePrimaryAIV2Props) {
  const passProbability = clampPercent(overview?.pass_probability);
  const readinessScore = clampPercent(overview?.readiness_score);
  const readinessMeta = getReadinessMeta(readinessScore);
  const trainingLevel = getTrainingLevelLabel(overview?.current_training_level);
  const driftMeta = getDriftMeta(overview?.drift_status);
  const cognitiveStability =
    typeof overview?.cognitive_stability === "string" && overview.cognitive_stability.trim().length > 0
      ? overview.cognitive_stability
      : null;

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-[var(--v2-text-tertiary)]">Model Outlook</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-medium text-[var(--v2-text-primary)]">Pass Outlook</h2>
          {overview?.ml_status && <BadgeV2 variant={driftMeta.variant}>{driftMeta.label}</BadgeV2>}
        </div>
        <p className="text-sm text-[var(--v2-text-secondary)]">
          Probability, readiness, and stability signals from current performance.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-[240px] flex-col justify-center rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface-subtle)] px-8 py-10">
          <div className="text-6xl font-semibold font-mono leading-none tracking-tight text-[var(--v2-text-primary)]">
            {passProbability}%
          </div>
          <p className="mt-3 text-sm text-[var(--v2-text-tertiary)]">Likelihood to Pass</p>
          {overview?.pass_prediction_label && (
            <p className="mt-2 text-xs text-[var(--v2-text-secondary)]">{overview.pass_prediction_label}</p>
          )}
        </div>

        <div className="grid gap-3">
          <CardV2 className="p-4">
            <div className="space-y-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--v2-text-tertiary)]">
                Readiness Score
              </p>
              <p className="text-3xl font-semibold font-mono leading-none text-[var(--v2-text-primary)]">
                {readinessScore}%
              </p>
              <BadgeV2 variant={readinessMeta.variant}>{readinessMeta.label}</BadgeV2>
            </div>
          </CardV2>

          <CardV2 className="p-4">
            <div className="space-y-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--v2-text-tertiary)]">
                Training Level
              </p>
              <p className="text-2xl font-semibold leading-tight text-[var(--v2-text-primary)]">{trainingLevel}</p>
            </div>
          </CardV2>

          {cognitiveStability && (
            <CardV2 className="p-4">
              <div className="space-y-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--v2-text-tertiary)]">
                  Cognitive Stability
                </p>
                <p className="text-2xl font-semibold leading-tight text-[var(--v2-text-primary)]">
                  {cognitiveStability}
                </p>
              </div>
            </CardV2>
          )}
        </div>
      </div>
    </section>
  );
}
