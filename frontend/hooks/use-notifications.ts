"use client";

import { useCallback } from "react";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/notifications";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { useUser } from "@/hooks/use-user";

export function useNotifications(limit = 8) {
  const { authenticated } = useUser();
  const resource = useAsyncResource(
    () => getNotifications({ limit }),
    [limit, authenticated],
    authenticated,
    {
      cacheKey: `notifications:${limit}`,
      staleTimeMs: 15_000,
    },
  );

  const markRead = useCallback(
    async (id: string) => {
      await markNotificationRead(id);
      await resource.reload();
    },
    [resource],
  );

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    await resource.reload();
  }, [resource]);

  return {
    ...resource,
    notifications: resource.data ?? [],
    unreadCount: (resource.data ?? []).filter((item) => !item.is_read).length,
    markRead,
    markAllRead,
  };
}
