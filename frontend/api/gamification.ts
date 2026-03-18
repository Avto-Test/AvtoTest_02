import { apiRequest } from "@/api/client";
import type { AchievementResponse } from "@/types/achievement";
import type { LiveRewardResponse } from "@/types/practice";
import type { CoinBalance, GamificationSummary, StreakSummary, XPSummary } from "@/types/gamification";

export function getGamificationSummary() {
  return apiRequest<GamificationSummary>("/users/me/gamification", {
    method: "GET",
  });
}

export function getXpSummary() {
  return apiRequest<XPSummary>("/users/me/xp", {
    method: "GET",
  });
}

export function getCoinBalance() {
  return apiRequest<CoinBalance>("/users/me/coins", {
    method: "GET",
  });
}

export function getStreakSummary() {
  return apiRequest<StreakSummary>("/users/me/streak", {
    method: "GET",
  });
}

export function getAchievements() {
  return apiRequest<AchievementResponse>("/users/me/achievements", {
    method: "GET",
  });
}

export function rewardPracticeAnswer(payload: { attempt_id: string; question_id: string }) {
  return apiRequest<LiveRewardResponse>("/gamification/reward", {
    method: "POST",
    body: payload,
    baseUrl: "/api",
  });
}
