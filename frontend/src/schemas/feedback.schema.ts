import { z } from 'zod';

export interface FeedbackItem {
    id: string;
    user_id: string;
    user_email?: string | null;
    rating: number;
    category: string;
    comment: string;
    suggestion: string | null;
    status: string;
    admin_note: string | null;
    created_at: string;
    updated_at: string;
}

export const feedbackCreateSchema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().min(3).max(4000),
});

export type FeedbackCreateFormData = z.infer<typeof feedbackCreateSchema>;

export const feedbackAdminUpdateSchema = z.object({
    status: z.string().min(1).max(30).optional(),
    admin_note: z.string().max(4000).optional(),
});

export type FeedbackAdminUpdateFormData = z.infer<typeof feedbackAdminUpdateSchema>;
