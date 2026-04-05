export interface AchievementItem {
  id?: string;
  code?: string;
  name: string;
  description?: string;
  icon?: string;
  trigger_rule?: string;
  awarded_at: string;
}

export interface XPSummary {
  total_xp: number;
  level: number;
  current_level_xp: number;
  next_level_xp: number;
  xp_to_next_level: number;
  progress_percent: number;
}

export interface CoinBalance {
  balance: number;
  last_updated?: string | null;
}

export interface ActiveXPBoost {
  multiplier: number;
  source: string;
  activated_at: string;
  expires_at: string;
  remaining_seconds: number;
}

export interface StreakSummary {
  current_streak: number;
  longest_streak: number;
  last_activity_date?: string | null;
}

export interface GamificationSummary {
  xp: XPSummary;
  coins: CoinBalance;
  streak: StreakSummary;
  active_xp_boost?: ActiveXPBoost | null;
  recent_achievements: AchievementItem[];
}
