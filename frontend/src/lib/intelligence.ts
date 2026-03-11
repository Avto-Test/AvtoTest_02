import { normalizeAnalytics } from "@/analytics/normalizeAnalytics";
import type {
  DashboardAnalyticsViewModel,
  RawDashboardResponse,
  RawSummaryResponse,
} from "@/analytics/types";
import { api } from "@/lib/api";
import type { UserAnalyticsSummary } from "@/schemas/analytics.schema";

export type UserReadinessResponse = {
  readiness_score: number;
  certificate_unlocked: boolean;
  weak_topics: string[];
  strong_topics: string[];
};

export type UserCoachResponse = {
  exam_pass_probability: number;
  exam_readiness_days_estimate: number;
  focus_topics: string[];
  recommended_questions_today: number;
  confidence_level: string;
  message: string;
};

export type UserPredictionResponse = {
  exam_pass_probability: number;
  confidence: string;
};

export type UserXPResponse = {
  xp_total: number;
  level: number;
  xp_to_next_level: number;
};

export type UserCoinsResponse = {
  coins_total: number;
};

export type UserAchievementItem = {
  code: string;
  name: string;
  awarded_at: string;
};

export type UserAchievementsResponse = {
  achievements: UserAchievementItem[];
};

export type UserMeResponse = {
  id: string;
  email: string;
  full_name?: string | null;
  is_verified: boolean;
  is_active: boolean;
  is_admin: boolean;
  is_premium: boolean;
  has_instructor_profile: boolean;
  has_school_profile: boolean;
  created_at: string;
};

export type LeaderboardPeriod = "daily" | "weekly" | "monthly";

export type LeaderboardEntryResponse = {
  rank: number;
  user_id: string;
  xp_gained: number;
};

export type LeaderboardResponse = {
  period: LeaderboardPeriod;
  users: LeaderboardEntryResponse[];
};

export type MyLeaderboardResponse = {
  period: LeaderboardPeriod;
  rank: number | null;
  xp_gained: number;
};

export type InstructorGroupResponse = {
  id: string;
  school_id: string;
  instructor_id: string;
  name: string;
  student_count: number;
  created_at: string;
  invite_code: string;
  qr_code: string;
  invite_url: string;
  qr_url: string;
};

export type InstructorStudentResponse = {
  user_id: string;
  email: string;
  full_name?: string | null;
  xp_total: number;
  coins_total: number;
  pass_probability: number;
  completion_rate: number;
  finished_attempts: number;
  started_attempts: number;
};

export type WeakTopicResponse = {
  topic: string;
  incorrect_answers: number;
};

export type TopicPerformanceResponse = {
  topic: string;
  success_rate: number;
};

export type InactiveStudentResponse = {
  user_id: string;
  email: string;
  days_since_last_activity: number;
};

export type ExamReadyStudentResponse = {
  user_id: string;
  email: string;
  readiness_score: number;
};

export type AtRiskStudentResponse = {
  user_id: string;
  email: string;
  readiness_score: number;
  risk_reason: string;
};

export type InstructorGroupStudentsResponse = {
  group_id: string;
  school_id: string;
  group_name: string;
  students: InstructorStudentResponse[];
};

export type InstructorGroupAnalyticsResponse = {
  group_id: string;
  school_id: string;
  group_name: string;
  student_count: number;
  group_pass_probability: number;
  completion_rate: number;
  weak_topics: WeakTopicResponse[];
  topic_performance: TopicPerformanceResponse[];
  top_students: InstructorStudentResponse[];
  struggling_students: InstructorStudentResponse[];
  inactive_students: InactiveStudentResponse[];
  exam_ready_students: ExamReadyStudentResponse[];
  at_risk_students: AtRiskStudentResponse[];
};

export type SchoolDashboardResponse = {
  school_id: string;
  school_name: string;
  active_role: string;
  member_count: number;
  group_count: number;
  lead_count: number;
};

export type SchoolBrandingResponse = {
  id: string;
  slug: string;
  name: string;
  logo_url?: string | null;
  brand_color?: string | null;
  banner_url?: string | null;
  is_active: boolean;
  created_at: string;
};

export type UserIntelligenceBundle = {
  analytics: DashboardAnalyticsViewModel;
  summary: UserAnalyticsSummary;
  readiness: UserReadinessResponse;
  coach: UserCoachResponse;
  prediction: UserPredictionResponse;
  xp: UserXPResponse;
  coins: UserCoinsResponse;
  achievements: UserAchievementItem[];
};

export type InstructorDashboardBundle = {
  groups: InstructorGroupResponse[];
  analytics: Record<string, InstructorGroupAnalyticsResponse>;
};

export type InstructorOperationsBundle = InstructorDashboardBundle & {
  students: Record<string, InstructorGroupStudentsResponse>;
};

export type SchoolDashboardBundle = {
  summary: SchoolDashboardResponse;
  branding: SchoolBrandingResponse | null;
  groups: InstructorGroupResponse[];
  analytics: Record<string, InstructorGroupAnalyticsResponse>;
  students: Record<string, InstructorGroupStudentsResponse>;
};

export function estimateReadinessFromStudentSignal(
  passProbability: number,
  completionRate: number,
): number {
  const estimate = (passProbability * 0.7) + (completionRate * 0.3);
  return Math.max(0, Math.min(100, Number(estimate.toFixed(1))));
}

export async function getUserIntelligenceBundle(): Promise<UserIntelligenceBundle> {
  const [
    dashboardResponse,
    summaryResponse,
    readinessResponse,
    coachResponse,
    predictionResponse,
    xpResponse,
    coinsResponse,
    achievementsResponse,
  ] = await Promise.all([
    api.get<RawDashboardResponse>("/analytics/dashboard"),
    api.get<UserAnalyticsSummary>("/analytics/summary"),
    api.get<UserReadinessResponse>("/user/readiness"),
    api.get<UserCoachResponse>("/user/coach"),
    api.get<UserPredictionResponse>("/user/prediction"),
    api.get<UserXPResponse>("/users/me/xp"),
    api.get<UserCoinsResponse>("/users/me/coins"),
    api.get<UserAchievementsResponse>("/users/me/achievements"),
  ]);

  const summaryPayload = summaryResponse.data;
  const normalizedSummary: RawSummaryResponse = {
    total_attempts: summaryPayload.total_attempts,
    average_score: summaryPayload.average_score,
  };

  return {
    analytics: normalizeAnalytics(
      dashboardResponse.data,
      null,
      normalizedSummary,
    ),
    summary: summaryPayload,
    readiness: readinessResponse.data,
    coach: coachResponse.data,
    prediction: predictionResponse.data,
    xp: xpResponse.data,
    coins: coinsResponse.data,
    achievements: achievementsResponse.data.achievements,
  };
}

export async function getUserProfileBundle(): Promise<{
  user: UserMeResponse;
  readiness: UserReadinessResponse;
  prediction: UserPredictionResponse;
  coach: UserCoachResponse;
  xp: UserXPResponse;
  coins: UserCoinsResponse;
  achievements: UserAchievementItem[];
}> {
  const [
    userResponse,
    readinessResponse,
    predictionResponse,
    coachResponse,
    xpResponse,
    coinsResponse,
    achievementsResponse,
  ] = await Promise.all([
    api.get<UserMeResponse>("/users/me"),
    api.get<UserReadinessResponse>("/user/readiness"),
    api.get<UserPredictionResponse>("/user/prediction"),
    api.get<UserCoachResponse>("/user/coach"),
    api.get<UserXPResponse>("/users/me/xp"),
    api.get<UserCoinsResponse>("/users/me/coins"),
    api.get<UserAchievementsResponse>("/users/me/achievements"),
  ]);

  return {
    user: userResponse.data,
    readiness: readinessResponse.data,
    prediction: predictionResponse.data,
    coach: coachResponse.data,
    xp: xpResponse.data,
    coins: coinsResponse.data,
    achievements: achievementsResponse.data.achievements,
  };
}

export async function downloadReadinessCertificate(): Promise<Blob> {
  const response = await api.post("/user/readiness/certificate", undefined, {
    responseType: "blob",
  });
  return response.data as Blob;
}

export async function getLeaderboardBundle(
  period: LeaderboardPeriod = "weekly",
): Promise<{
  leaderboard: LeaderboardResponse;
  me: MyLeaderboardResponse;
  xp: UserXPResponse;
  coins: UserCoinsResponse;
  achievements: UserAchievementItem[];
}> {
  const [
    leaderboardResponse,
    myLeaderboardResponse,
    xpResponse,
    coinsResponse,
    achievementsResponse,
  ] = await Promise.all([
    api.get<LeaderboardResponse>("/leaderboard", { params: { period } }),
    api.get<MyLeaderboardResponse>("/leaderboard/me", { params: { period } }),
    api.get<UserXPResponse>("/users/me/xp"),
    api.get<UserCoinsResponse>("/users/me/coins"),
    api.get<UserAchievementsResponse>("/users/me/achievements"),
  ]);

  return {
    leaderboard: leaderboardResponse.data,
    me: myLeaderboardResponse.data,
    xp: xpResponse.data,
    coins: coinsResponse.data,
    achievements: achievementsResponse.data.achievements,
  };
}

export async function getInstructorDashboardBundle(): Promise<InstructorDashboardBundle> {
  const groupsResponse = await api.get<InstructorGroupResponse[]>("/instructor/groups");
  const groups = groupsResponse.data;
  const analyticsEntries = await Promise.all(
    groups.map(async (group) => {
      const response = await api.get<InstructorGroupAnalyticsResponse>(
        `/instructor/group/${group.id}/analytics`,
      );
      return [group.id, response.data] as const;
    }),
  );

  return {
    groups,
    analytics: Object.fromEntries(analyticsEntries),
  };
}

export async function getInstructorOperationsBundle(): Promise<InstructorOperationsBundle> {
  const groupsResponse = await api.get<InstructorGroupResponse[]>("/instructor/groups");
  const groups = groupsResponse.data;

  const [analyticsEntries, studentEntries] = await Promise.all([
    Promise.all(
      groups.map(async (group) => {
        const response = await api.get<InstructorGroupAnalyticsResponse>(
          `/instructor/group/${group.id}/analytics`,
        );
        return [group.id, response.data] as const;
      }),
    ),
    Promise.all(
      groups.map(async (group) => {
        const response = await api.get<InstructorGroupStudentsResponse>(
          `/instructor/group/${group.id}/students`,
        );
        return [group.id, response.data] as const;
      }),
    ),
  ]);

  return {
    groups,
    analytics: Object.fromEntries(analyticsEntries),
    students: Object.fromEntries(studentEntries),
  };
}

export async function getSchoolDashboardBundle(): Promise<SchoolDashboardBundle> {
  const summaryResponse = await api.get<SchoolDashboardResponse>("/school/dashboard");
  const summary = summaryResponse.data;
  const brandingPromise = api
    .get<SchoolBrandingResponse>(`/schools/${summary.school_id}`)
    .then((response) => response.data)
    .catch(() => null);
  const groupsResponse = await api.get<InstructorGroupResponse[]>("/instructor/groups");
  const groups = groupsResponse.data;

  const [branding, analyticsEntries, studentEntries] = await Promise.all([
    brandingPromise,
    Promise.all(
      groups.map(async (group) => {
        const response = await api.get<InstructorGroupAnalyticsResponse>(
          `/instructor/group/${group.id}/analytics`,
        );
        return [group.id, response.data] as const;
      }),
    ),
    Promise.all(
      groups.map(async (group) => {
        const response = await api.get<InstructorGroupStudentsResponse>(
          `/instructor/group/${group.id}/students`,
        );
        return [group.id, response.data] as const;
      }),
    ),
  ]);

  return {
    summary,
    branding,
    groups,
    analytics: Object.fromEntries(analyticsEntries),
    students: Object.fromEntries(studentEntries),
  };
}

export async function sendInstructorGroupNudge(
  groupId: string,
  payload: {
    type: "inactive" | "weak_topic";
    topic?: string;
  },
): Promise<{ students_notified: number }> {
  const response = await api.post<{ students_notified: number }>(
    `/instructor/group/${groupId}/nudge`,
    payload,
  );
  return response.data;
}
