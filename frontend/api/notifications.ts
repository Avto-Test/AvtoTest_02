import type { Notification } from "@/types/notification";

import { apiRequest } from "@/api/client";

export function getNotifications(params?: { unreadOnly?: boolean; limit?: number }) {
  return apiRequest<Notification[]>("/notifications", {
    method: "GET",
    query: {
      unread_only: params?.unreadOnly,
      limit: params?.limit ?? 20,
    },
  });
}

export function markNotificationRead(id: string) {
  return apiRequest<void>(`/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead() {
  return apiRequest<void>("/notifications/read-all", { method: "POST" });
}
