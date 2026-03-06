import { api } from './api';

export interface UserNotification {
    id: string;
    notification_type: string;
    title: string;
    message: string;
    payload: Record<string, unknown>;
    is_read: boolean;
    created_at: string;
}

export async function getNotifications(unreadOnly = false): Promise<UserNotification[]> {
    const response = await api.get<UserNotification[]>('/notifications', {
        params: {
            unread_only: unreadOnly,
            limit: 20,
        },
    });
    return response.data;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
    await api.post(`/notifications/${notificationId}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
    await api.post('/notifications/read-all');
}
