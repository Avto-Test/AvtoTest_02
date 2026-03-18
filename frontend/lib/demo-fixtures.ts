import type { AchievementItem } from "@/types/achievement";
import type { LeaderboardMe, LeaderboardPeriod, LeaderboardResponse } from "@/types/leaderboard";

type DemoProfile = {
  display_name: string;
  xp: {
    xp_total: number;
    level: number;
    xp_to_next_level: number;
  };
  coins: {
    coins_total: number;
  };
  achievements: AchievementItem[];
  leaderboard: Record<LeaderboardPeriod, { rank: number; xp_gained: number }>;
};

const demoProfiles: Record<string, DemoProfile> = {
  "demo.student@example.com": {
    display_name: "Aziza Karimova",
    xp: { xp_total: 2840, level: 9, xp_to_next_level: 160 },
    coins: { coins_total: 930 },
    achievements: [
      { code: "first_test", name: "Birinchi qadamlar", awarded_at: "2026-03-02T09:20:00Z" },
      { code: "streak_7", name: "7 kun streak", awarded_at: "2026-03-09T19:40:00Z" },
      { code: "xp_1000", name: "1000 XP", awarded_at: "2026-03-06T12:00:00Z" },
      { code: "simulation_pass", name: "Simulation pass", awarded_at: "2026-03-11T15:10:00Z" },
    ],
    leaderboard: {
      daily: { rank: 1, xp_gained: 240 },
      weekly: { rank: 1, xp_gained: 980 },
      monthly: { rank: 1, xp_gained: 2840 },
    },
  },
  "demo.free@example.com": {
    display_name: "Jasur Rahimov",
    xp: { xp_total: 860, level: 4, xp_to_next_level: 140 },
    coins: { coins_total: 210 },
    achievements: [
      { code: "first_test", name: "Birinchi qadamlar", awarded_at: "2026-03-04T11:30:00Z" },
    ],
    leaderboard: {
      daily: { rank: 4, xp_gained: 120 },
      weekly: { rank: 5, xp_gained: 410 },
      monthly: { rank: 5, xp_gained: 860 },
    },
  },
  "demo.admin@example.com": {
    display_name: "Dilshod Admin",
    xp: { xp_total: 6120, level: 15, xp_to_next_level: 380 },
    coins: { coins_total: 1640 },
    achievements: [
      { code: "first_test", name: "Birinchi qadamlar", awarded_at: "2026-02-12T08:00:00Z" },
      { code: "streak_7", name: "7 kun streak", awarded_at: "2026-02-18T08:00:00Z" },
      { code: "xp_1000", name: "1000 XP", awarded_at: "2026-02-21T08:00:00Z" },
      { code: "xp_5000", name: "5000 XP", awarded_at: "2026-03-01T08:00:00Z" },
      { code: "simulation_pass", name: "Simulation pass", awarded_at: "2026-03-10T08:00:00Z" },
    ],
    leaderboard: {
      daily: { rank: 5, xp_gained: 110 },
      weekly: { rank: 2, xp_gained: 760 },
      monthly: { rank: 2, xp_gained: 2510 },
    },
  },
  "demo.school.owner@example.com": {
    display_name: "Madina School Owner",
    xp: { xp_total: 1240, level: 5, xp_to_next_level: 260 },
    coins: { coins_total: 320 },
    achievements: [
      { code: "first_test", name: "Birinchi qadamlar", awarded_at: "2026-03-03T10:15:00Z" },
      { code: "xp_1000", name: "1000 XP", awarded_at: "2026-03-10T17:00:00Z" },
    ],
    leaderboard: {
      daily: { rank: 3, xp_gained: 160 },
      weekly: { rank: 4, xp_gained: 540 },
      monthly: { rank: 4, xp_gained: 1240 },
    },
  },
  "demo.instructor.owner@example.com": {
    display_name: "Rustam Instructor Owner",
    xp: { xp_total: 1480, level: 6, xp_to_next_level: 120 },
    coins: { coins_total: 440 },
    achievements: [
      { code: "first_test", name: "Birinchi qadamlar", awarded_at: "2026-03-01T09:00:00Z" },
      { code: "simulation_pass", name: "Simulation pass", awarded_at: "2026-03-11T09:00:00Z" },
    ],
    leaderboard: {
      daily: { rank: 2, xp_gained: 180 },
      weekly: { rank: 3, xp_gained: 640 },
      monthly: { rank: 3, xp_gained: 1480 },
    },
  },
};

const leaderboardSeeds = [
  { email: "demo.student@example.com", user_id: "a11a4b10-0000-4000-8000-000000000001" },
  { email: "demo.admin@example.com", user_id: "a11a4b10-0000-4000-8000-000000000002" },
  { email: "demo.instructor.owner@example.com", user_id: "a11a4b10-0000-4000-8000-000000000003" },
  { email: "demo.school.owner@example.com", user_id: "a11a4b10-0000-4000-8000-000000000004" },
  { email: "demo.free@example.com", user_id: "a11a4b10-0000-4000-8000-000000000005" },
];

export function getDemoProfile(email?: string | null) {
  if (email && demoProfiles[email]) {
    return demoProfiles[email];
  }
  return demoProfiles["demo.student@example.com"];
}

export function getDemoLeaderboard(
  period: LeaderboardPeriod,
  currentUser?: { id?: string | null; email?: string | null },
): LeaderboardResponse {
  return {
    period,
    users: leaderboardSeeds
      .slice()
      .sort((left, right) => {
        return (
          getDemoProfile(left.email).leaderboard[period].rank -
          getDemoProfile(right.email).leaderboard[period].rank
        );
      })
      .map((seed) => {
        const profile = getDemoProfile(seed.email);
        const isCurrent = currentUser?.email === seed.email;
        return {
          rank: profile.leaderboard[period].rank,
          user_id: isCurrent ? currentUser?.id ?? seed.user_id : seed.user_id,
          xp_gained: profile.leaderboard[period].xp_gained,
          display_name: profile.display_name,
        };
      }),
  };
}

export function getDemoMyLeaderboard(
  period: LeaderboardPeriod,
  currentUser?: { email?: string | null },
): LeaderboardMe {
  const profile = getDemoProfile(currentUser?.email);
  return {
    period,
    rank: profile.leaderboard[period].rank,
    xp_gained: profile.leaderboard[period].xp_gained,
  };
}
