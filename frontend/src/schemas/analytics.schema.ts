/**
 * AUTOTEST Analytics Schemas
 * Type definitions for analytics data
 */

export interface UserAttemptSummary {
    id: string;
    test_title: string;
    score: number;
    finished_at: string | null;
}

export interface UserAnalyticsSummary {
    total_attempts: number;
    average_score: number;
    last_attempts: UserAttemptSummary[];
}

export interface UserTestAnalytics {
    test_id: string;
    title: string;
    attempts_count: number;
    best_score: number;
    average_score: number;
}
