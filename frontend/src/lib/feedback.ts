import { api } from '@/lib/api';
import {
    FeedbackAdminUpdateFormData,
    FeedbackCreateFormData,
    FeedbackItem,
} from '@/schemas/feedback.schema';

export async function submitFeedback(payload: FeedbackCreateFormData): Promise<FeedbackItem> {
    const response = await api.post<FeedbackItem>('/feedback', {
        rating: payload.rating,
        comment: payload.comment,
        category: 'general',
    });
    return response.data;
}

export async function getMyFeedback(): Promise<FeedbackItem[]> {
    const response = await api.get<FeedbackItem[]>('/feedback/me');
    return response.data;
}

export async function getAdminFeedback(statusFilter?: string): Promise<FeedbackItem[]> {
    const response = await api.get<FeedbackItem[]>('/feedback/admin', {
        params: statusFilter ? { status: statusFilter } : undefined,
    });
    return response.data;
}

export async function updateAdminFeedback(
    feedbackId: string,
    payload: FeedbackAdminUpdateFormData
): Promise<FeedbackItem> {
    const response = await api.put<FeedbackItem>(`/feedback/admin/${feedbackId}`, payload);
    return response.data;
}
