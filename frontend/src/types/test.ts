export interface PublicAnswerOption {
    id: string;
    text: string;
}

export interface PublicQuestion {
    id: string;
    text: string;
    topic?: string;
    category?: string;
    difficulty?: string;
    image_url?: string;
    video_url?: string;
    media_type?: string;
    answer_options: PublicAnswerOption[];
}

export interface TestListResult {
    id: string;
    title: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
    question_count: number;
    duration: number; // minutes
    is_premium: boolean;
}

export interface TestDetail extends TestListResult {
    questions: PublicQuestion[];
}

export interface DetailedAnswer {
    question_id: string;
    selected_option_id: string;
    correct_option_id: string;
    is_correct: boolean;
    dynamic_difficulty_score?: number;
    difficulty_label?: string;
    reinforcement_message?: string;
}

export interface BulkSubmitResponse {
    score: number;
    total: number;
    passed: boolean;
    finished_at: string;
    answers: DetailedAnswer[];
    correct_count?: number;
    mistakes_count?: number;
    answers_unlocked?: boolean;
    unlock_reason?: string | null;
    is_adaptive?: boolean;
    training_level?: string | null;
    pass_prediction_label?: string | null;
    avg_response_time?: number | null;
    cognitive_profile?: string | null;
    pressure_mode?: boolean;
}

export interface TestSessionStart {
    id: string;
    test_id: string;
    score: number;
    started_at: string;
    finished_at: string | null;
    questions: PublicQuestion[];
    question_count: number;
    duration_minutes: number;
    attempt_mode?: string;
    attempts_used_today?: number | null;
    attempts_limit?: number | null;
    attempts_remaining?: number | null;
}

export interface FreeTestStatus {
    attempts_used_today: number;
    attempts_limit: number;
    attempts_remaining: number;
    limit_reached: boolean;
    is_premium: boolean;
}
