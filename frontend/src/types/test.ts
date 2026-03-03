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
}
