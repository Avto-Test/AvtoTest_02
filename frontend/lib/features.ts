export const FEATURES = {
  ANALYTICS: "analytics_view",
  AI_PREDICTION: "ai_prediction",
  SIMULATION: "simulation_run",
} as const;

export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES];
