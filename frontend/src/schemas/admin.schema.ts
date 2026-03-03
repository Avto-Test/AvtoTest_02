/**
 * AUTOTEST Admin Schemas
 * TypeScript interfaces and Zod validation for admin CRUD
 */

import { z } from 'zod';

// ========== Test Schemas ==========

export interface AdminTest {
    id: string;
    title: string;
    description: string | null;
    difficulty: string;
    is_active: boolean;
    is_premium: boolean;
    duration: number | null;
}

export const testFormSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    is_active: z.boolean(),
    is_premium: z.boolean(),
    duration: z.number().int().min(1).max(300),
});

export type TestFormData = z.infer<typeof testFormSchema>;

// ========== Lesson Schemas ==========

export interface AdminLesson {
    id: string;
    title: string;
    description: string | null;
    content_type: string;
    content_url: string;
    thumbnail_url: string | null;
    topic: string | null;
    section: string | null;
    is_active: boolean;
    is_premium: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface AdminLessonUploadResponse {
    url: string;
    filename: string;
    content_type: string;
    size_bytes: number;
}

export const lessonFormSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().optional(),
    content_type: z.enum(['video', 'audio', 'document', 'image', 'link', 'text']),
    content_url: z.string().min(1, 'Content URL or file path is required'),
    thumbnail_url: z.string().optional(),
    topic: z.string().optional(),
    section: z.string().optional(),
    is_active: z.boolean(),
    is_premium: z.boolean(),
    sort_order: z.number().int(),
});

export type LessonFormData = z.infer<typeof lessonFormSchema>;

// ========== Question Schemas ==========

export interface AdminQuestion {
    id: string;
    test_id?: string | null;
    text: string;
    image_url: string | null;
    video_url: string | null;
    media_type: string;
    topic: string | null;
    category: string | null;
    category_id: string | null;
    difficulty: string;
    difficulty_percent: number;
    answer_options?: AdminAnswerOption[];
}

export const questionFormSchema = z.object({
    text: z.string().min(1, 'Question text is required'),
    image_url: z.string().url().optional().or(z.literal('')),
    video_url: z.string().url().optional().or(z.literal('')),
    media_type: z.enum(['text', 'image', 'video']),
    topic: z.string().optional(),
    category: z.string().optional(),
    category_id: z.string().uuid().optional().or(z.literal('')),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    difficulty_percent: z.number().int().min(0).max(100),
});

export type QuestionFormData = z.infer<typeof questionFormSchema>;

// ========== Answer Option Schemas ==========

export interface AdminAnswerOption {
    id: string;
    question_id: string;
    text: string;
    is_correct: boolean;
}

export const answerOptionFormSchema = z.object({
    text: z.string().min(1, 'Option text is required'),
    is_correct: z.boolean().default(false),
});

export type AnswerOptionFormData = z.infer<typeof answerOptionFormSchema>;

// ========== Question Category Schemas ==========

export interface AdminQuestionCategory {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export const questionCategoryFormSchema = z.object({
    name: z.string().min(1, 'Category name is required').max(120),
    description: z.string().optional(),
    is_active: z.boolean(),
});

export type QuestionCategoryFormData = z.infer<typeof questionCategoryFormSchema>;

// ========== Extended Types with Relations ==========

export interface AdminQuestionWithOptions extends AdminQuestion {
    options: AdminAnswerOption[];
}

export interface AdminTestWithQuestions extends AdminTest {
    questions: AdminQuestion[];
    question_count?: number;
}

// ========== User Schemas ==========

export interface AdminUser {
    id: string;
    email: string;
    full_name: string | null;
    is_active: boolean;
    is_verified: boolean;
    is_admin: boolean;
    is_premium: boolean;
    created_at: string;
    subscription_plan: string | null;
    subscription_status: string | null;
    subscription_expires_at: string | null;
}

export interface AdminUserUpdate {
    is_active?: boolean;
    is_verified?: boolean;
    is_admin?: boolean;
}

export interface AdminUserSubscriptionUpdate {
    plan: string;
    status: string;
    expires_at?: string | null;
}

// ========== Subscription Plan Schemas ==========

export interface AdminSubscriptionPlan {
    id: string;
    code: string;
    name: string;
    description: string | null;
    price_cents: number;
    currency: string;
    duration_days: number;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export const subscriptionPlanFormSchema = z.object({
    code: z.string().min(3).max(50),
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    price_cents: z.number().int().min(1),
    currency: z.string().min(3).max(10),
    duration_days: z.number().int().min(1).max(3650),
    is_active: z.boolean(),
    sort_order: z.number().int(),
});

export type SubscriptionPlanFormData = z.infer<typeof subscriptionPlanFormSchema>;

// ========== Promo Code Schemas ==========

export type PromoDiscountType = 'percent' | 'fixed';

export interface AdminPromoCode {
    id: string;
    code: string;
    name: string | null;
    description: string | null;
    discount_type: PromoDiscountType;
    discount_value: number;
    max_redemptions: number | null;
    redeemed_count: number;
    starts_at: string | null;
    expires_at: string | null;
    is_active: boolean;
    applicable_plan_ids: string[];
    created_at: string;
    updated_at: string;
}

export const promoCodeFormSchema = z.object({
    code: z.string().min(3).max(50),
    name: z.string().optional(),
    description: z.string().optional(),
    discount_type: z.enum(['percent', 'fixed']),
    discount_value: z.number().int().min(1),
    max_redemptions: z.number().int().min(1).optional(),
    starts_at: z.string().optional(),
    expires_at: z.string().optional(),
    is_active: z.boolean(),
    applicable_plan_ids: z.array(z.string().uuid()),
});

export type PromoCodeFormData = z.infer<typeof promoCodeFormSchema>;
