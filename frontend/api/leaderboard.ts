import { apiRequest } from "@/api/client";
import type { LeaderboardMe, LeaderboardPeriod, LeaderboardResponse } from "@/types/leaderboard";

export function getLeaderboard(period: LeaderboardPeriod = "weekly", limit = 20) {
  return apiRequest<LeaderboardResponse>("/leaderboard", {
    method: "GET",
    query: { period, limit },
  });
}

export function getMyLeaderboard(period: LeaderboardPeriod = "weekly") {
  return apiRequest<LeaderboardMe>("/leaderboard/me", {
    method: "GET",
    query: { period },
  });
}
