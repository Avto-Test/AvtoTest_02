/**
 * AUTOTEST Admin API
 * CRUD functions for Tests, Questions, and AnswerOptions
 */

import { api, getErrorMessage } from './api';
import {
    AdminTest,
    AdminQuestion,
    AdminAnswerOption,
    AdminUser,
    AdminUserUpdate,
    AdminUserSubscriptionUpdate,
    AdminSubscriptionPlan,
    AdminPromoCode,
    AdminLesson,
    AdminLessonUploadResponse,
    AdminQuestionCategory,
    PromoCodeFormData,
    QuestionCategoryFormData,
    SubscriptionPlanFormData,
    TestFormData,
    LessonFormData,
    QuestionFormData,
    AnswerOptionFormData,
} from '@/schemas/admin.schema';

// ========== Tests ==========

export async function getTests(): Promise<AdminTest[]> {
    const response = await api.get<AdminTest[]>('/admin/tests');
    return response.data;
}

export async function createTest(data: TestFormData): Promise<AdminTest> {
    const response = await api.post<AdminTest>('/admin/tests', data);
    return response.data;
}

export async function updateTest(id: string, data: Partial<TestFormData>): Promise<AdminTest> {
    const response = await api.put<AdminTest>(`/admin/tests/${id}`, data);
    return response.data;
}

export async function deleteTest(id: string): Promise<void> {
    await api.delete(`/admin/tests/${id}`);
}

// ========== Lessons ==========

export async function getLessons(): Promise<AdminLesson[]> {
    const response = await api.get<AdminLesson[]>('/admin/lessons');
    return response.data;
}

export async function createLesson(data: LessonFormData): Promise<AdminLesson> {
    const response = await api.post<AdminLesson>('/admin/lessons', {
        title: data.title,
        description: data.description || null,
        content_type: data.content_type,
        content_url: data.content_url,
        thumbnail_url: data.thumbnail_url || null,
        topic: data.topic || null,
        section: data.section || null,
        is_active: data.is_active,
        is_premium: data.is_premium,
        sort_order: data.sort_order,
    });
    return response.data;
}

export async function updateLesson(
    lessonId: string,
    data: Partial<LessonFormData>
): Promise<AdminLesson> {
    const response = await api.put<AdminLesson>(`/admin/lessons/${lessonId}`, {
        title: data.title,
        description: data.description ?? null,
        content_type: data.content_type,
        content_url: data.content_url,
        thumbnail_url: data.thumbnail_url ?? null,
        topic: data.topic ?? null,
        section: data.section ?? null,
        is_active: data.is_active,
        is_premium: data.is_premium,
        sort_order: data.sort_order,
    });
    return response.data;
}

export async function deleteLesson(lessonId: string): Promise<void> {
    await api.delete(`/admin/lessons/${lessonId}`);
}

export async function uploadLessonFile(file: File): Promise<AdminLessonUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<AdminLessonUploadResponse>('/admin/media/lesson', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
}

// ========== Questions ==========

export async function getQuestions(categoryId?: string): Promise<AdminQuestion[]> {
    const response = await api.get<AdminQuestion[]>('/admin/questions', {
        params: categoryId ? { category_id: categoryId } : undefined,
    });
    return response.data;
}

export async function uploadQuestionImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<{ url: string }>('/admin/media/image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data.url;
}

export async function createQuestion(data: QuestionFormData): Promise<AdminQuestion> {
    const response = await api.post<AdminQuestion>('/admin/questions', {
        text: data.text,
        image_url: data.image_url || null,
        video_url: data.video_url || null,
        media_type: data.media_type,
        topic: data.topic || null,
        category: data.category || null,
        category_id: data.category_id || null,
        difficulty: data.difficulty,
        difficulty_percent: data.difficulty_percent,
    });
    return response.data;
}

export async function updateQuestion(questionId: string, data: Partial<QuestionFormData>): Promise<AdminQuestion> {
    const response = await api.put<AdminQuestion>(`/admin/questions/${questionId}`, {
        text: data.text,
        image_url: data.image_url || null,
        video_url: data.video_url || null,
        media_type: data.media_type,
        topic: data.topic || null,
        category: data.category || null,
        category_id: data.category_id || null,
        difficulty: data.difficulty,
        difficulty_percent: data.difficulty_percent,
    });
    return response.data;
}

export async function deleteQuestion(questionId: string): Promise<void> {
    await api.delete(`/admin/questions/${questionId}`);
}

// ========== Question Categories ==========

export async function getQuestionCategories(): Promise<AdminQuestionCategory[]> {
    const response = await api.get<AdminQuestionCategory[]>('/admin/question-categories');
    return response.data;
}

export async function createQuestionCategory(data: QuestionCategoryFormData): Promise<AdminQuestionCategory> {
    const response = await api.post<AdminQuestionCategory>('/admin/question-categories', {
        name: data.name,
        description: data.description || null,
        is_active: data.is_active,
    });
    return response.data;
}

export async function updateQuestionCategory(
    categoryId: string,
    data: Partial<QuestionCategoryFormData>
): Promise<AdminQuestionCategory> {
    const response = await api.put<AdminQuestionCategory>(`/admin/question-categories/${categoryId}`, {
        name: data.name,
        description: data.description ?? null,
        is_active: data.is_active,
    });
    return response.data;
}

export async function deleteQuestionCategory(categoryId: string): Promise<void> {
    await api.delete(`/admin/question-categories/${categoryId}`);
}

// ========== Answer Options ==========

export async function getAnswerOptions(): Promise<AdminAnswerOption[]> {
    // Note: Options are part of the question response via test endpoint
    // For now, we'll need to handle this in the component
    return [];
}

export async function createAnswerOption(
    questionId: string,
    data: AnswerOptionFormData
): Promise<AdminAnswerOption> {
    const response = await api.post<AdminAnswerOption>(`/admin/questions/${questionId}/options`, data);
    return response.data;
}

export async function updateAnswerOption(
    optionId: string,
    data: Partial<AnswerOptionFormData>
): Promise<AdminAnswerOption> {
    const response = await api.put<AdminAnswerOption>(`/admin/options/${optionId}`, data);
    return response.data;
}

export async function deleteAnswerOption(optionId: string): Promise<void> {
    await api.delete(`/admin/options/${optionId}`);
}

// ========== Helper to set correct answer ==========

export async function setCorrectAnswer(
    questionId: string,
    correctOptionId: string,
    allOptions: AdminAnswerOption[]
): Promise<void> {
    // First, unset any existing correct answer
    for (const option of allOptions) {
        if (option.is_correct && option.id !== correctOptionId) {
            await updateAnswerOption(option.id, { is_correct: false });
        }
    }
    // Then, set the new correct answer
    await updateAnswerOption(correctOptionId, { is_correct: true });
}

// ========== Users ==========

export async function getUsers(): Promise<AdminUser[]> {
    const response = await api.get<AdminUser[]>('/admin/users');
    return response.data;
}

export async function updateUser(
    userId: string,
    data: AdminUserUpdate
): Promise<AdminUser> {
    const response = await api.put<AdminUser>(`/admin/users/${userId}`, data);
    return response.data;
}

export async function updateUserSubscription(
    userId: string,
    data: AdminUserSubscriptionUpdate
): Promise<AdminUser> {
    const response = await api.put<AdminUser>(`/admin/users/${userId}/subscription`, data);
    return response.data;
}

// ========== Subscription Plans ==========

export async function getSubscriptionPlans(): Promise<AdminSubscriptionPlan[]> {
    const response = await api.get<AdminSubscriptionPlan[]>('/admin/plans');
    return response.data;
}

export async function createSubscriptionPlan(data: SubscriptionPlanFormData): Promise<AdminSubscriptionPlan> {
    const response = await api.post<AdminSubscriptionPlan>('/admin/plans', data);
    return response.data;
}

export async function updateSubscriptionPlan(
    planId: string,
    data: Partial<SubscriptionPlanFormData>
): Promise<AdminSubscriptionPlan> {
    const response = await api.put<AdminSubscriptionPlan>(`/admin/plans/${planId}`, data);
    return response.data;
}

export async function deleteSubscriptionPlan(planId: string): Promise<void> {
    await api.delete(`/admin/plans/${planId}`);
}

// ========== Promo Codes ==========

export async function getPromoCodes(): Promise<AdminPromoCode[]> {
    const response = await api.get<AdminPromoCode[]>('/admin/promos');
    return response.data;
}

export async function createPromoCode(data: PromoCodeFormData): Promise<AdminPromoCode> {
    const response = await api.post<AdminPromoCode>('/admin/promos', data);
    return response.data;
}

export async function updatePromoCode(
    promoId: string,
    data: Partial<PromoCodeFormData>
): Promise<AdminPromoCode> {
    const response = await api.put<AdminPromoCode>(`/admin/promos/${promoId}`, data);
    return response.data;
}

export async function deletePromoCode(promoId: string): Promise<void> {
    await api.delete(`/admin/promos/${promoId}`);
}

// Re-export error helper
export { getErrorMessage };
