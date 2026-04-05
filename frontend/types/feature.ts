export interface PlatformFeature {
  id: string;
  key: string;
  name: string;
  is_premium: boolean;
  enabled_for_all_until?: string | null;
  experiment_group?: string | null;
  rollout_percentage?: number;
  feature_usage_limit?: number | null;
  current_price?: number | null;
  suggested_price_min?: number | null;
  suggested_price_max?: number | null;
  last_price_analysis_at?: string | null;
  has_access?: boolean | null;
  access_reason?: string | null;
  remaining_trial_uses?: number | null;
  trial_usage_count?: number | null;
  effective_trial_limit?: number | null;
  rollout_eligible?: boolean | null;
  experiment_variant?: string | null;
  user_segment?: string | null;
  recommended_prompt_intensity?: "default" | "aggressive" | null;
  created_at: string;
}

export interface UpdatePlatformFeaturePayload {
  is_premium?: boolean;
  enabled_for_all_until?: string | null;
  experiment_group?: string | null;
  rollout_percentage?: number;
  feature_usage_limit?: number | null;
  current_price?: number | null;
}
