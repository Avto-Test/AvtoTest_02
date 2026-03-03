/**
 * AUTOTEST Test Schemas
 * Type definitions for tests and attempts
 */

import { z } from 'zod';

export interface AnswerOption {
    id: string;
    text: string;
}

export interface Question {
    id: string;
    text: string;
    image_url: string | null;
    video_url?: string | null;
    media_type?: string | null;
    topic?: string | null;
    category?: string | null;
    difficulty?: string | null;
    answer_options: AnswerOption[];
}

export interface TestList {
    id: string;
    title: string;
    description: string | null;
    difficulty: 'easy' | 'medium' | 'hard';
    is_premium?: boolean;
    duration?: number | null;
    question_count: number;
    created_at: string;
}

export interface TestDetail extends TestList {
    questions: Question[];
}

export interface Attempt {
    id: string;
    test_id: string;
    score: number;
    started_at: string;
    finished_at: string | null;
}

export interface ScoreResult {
    attempt_id: string;
    score: number;
    total_questions: number;
    finished_at: string;
}
