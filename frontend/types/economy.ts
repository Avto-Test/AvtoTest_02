import type { ActiveXPBoost } from "@/types/gamification";
import type { PublicQuestion } from "@/types/test";

export interface XPBoostOffer {
  cost: number;
  multiplier: number;
  duration_minutes: number;
  active?: ActiveXPBoost | null;
}

export interface SimulationCooldownOffer {
  cost_per_day: number;
  max_days: number;
  available_days: number;
  days_used: number;
  cooldown_remaining_seconds: number;
  next_available_at?: string | null;
}

export interface FocusPackOffer {
  cost: number;
  question_count: number;
}

export interface SimulationFastUnlockOffer {
  cost: number;
  duration_hours: number;
  active: boolean;
  expires_at?: string | null;
}

export interface EconomyOverview {
  coin_balance: number;
  active_xp_boost?: ActiveXPBoost | null;
  xp_boost_offer: XPBoostOffer;
  simulation_cooldown_offer: SimulationCooldownOffer;
  focus_pack_offer: FocusPackOffer;
  simulation_fast_unlock_offer: SimulationFastUnlockOffer;
}

export interface CooldownReductionResponse {
  coin_balance: number;
  coins_spent: number;
  days_applied: number;
  cooldown_remaining_seconds: number;
  next_available_at?: string | null;
}

export interface XPBoostActivationResponse {
  coin_balance: number;
  coins_spent: number;
  boost: ActiveXPBoost;
}

export interface FocusPackResponse {
  session_id: string;
  topic: string;
  question_count: number;
  coin_balance: number;
  coins_spent: number;
  questions: PublicQuestion[];
}

export interface SimulationFastUnlockResponse {
  coin_balance: number;
  coins_spent: number;
  expires_at: string;
  active: boolean;
  already_active: boolean;
}
