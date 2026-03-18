export type LeaderboardPeriod = "daily" | "weekly" | "monthly";

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  xp_gained: number;
  display_name: string;
  is_current_user?: boolean;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  captured_at?: string;
  users: LeaderboardEntry[];
}

export interface LeaderboardMe {
  period: LeaderboardPeriod;
  captured_at?: string;
  rank: number | null;
  xp_gained: number;
}
