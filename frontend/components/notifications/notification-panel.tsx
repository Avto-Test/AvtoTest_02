"use client";

import Link from "next/link";
import { CheckCheck } from "lucide-react";

import { formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import type { Notification } from "@/types/notification";

export type NotificationPanelItem = Notification & {
  synthetic?: boolean;
};

export function NotificationPanel({
  notifications,
  unreadCount,
  loading,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: {
  notifications: NotificationPanelItem[];
  unreadCount: number;
  loading: boolean;
  onMarkRead: (notification: NotificationPanelItem) => void | Promise<void>;
  onMarkAllRead: () => void | Promise<void>;
  onClose: () => void;
}) {
  return (
    <Card className="absolute right-0 top-12 z-40 w-[22rem] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">Bildirishnomalar</p>
          <p className="text-xs text-[var(--muted-foreground)]">{unreadCount} ta yangi</p>
        </div>
        {unreadCount > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => void onMarkAllRead()}>
            <CheckCheck className="h-4 w-4" />
            O'qilgan qilish
          </Button>
        ) : null}
      </div>
      <div className="mt-4 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
        {loading ? (
          <>
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </>
        ) : notifications.length === 0 ? (
          <EmptyState title="Bildirishnoma yo'q" description="Yangi hodisalar shu yerda ko'rinadi." />
        ) : (
          notifications.map((notification) => (
            <button
              key={notification.id}
              className={`w-full rounded-2xl border p-3 text-left transition hover:bg-[var(--muted)] ${
                notification.is_read
                  ? "border-[var(--border)]"
                  : "border-[color-mix(in_oklab,var(--primary)_35%,white)] bg-[color-mix(in_oklab,var(--primary)_6%,white)]"
              }`}
              onClick={() => void onMarkRead(notification)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{notification.title}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">{notification.message}</p>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    {formatRelativeTime(notification.created_at)}
                  </p>
                </div>
                {!notification.is_read ? <Badge>{notification.synthetic ? "Eslatma" : "Yangi"}</Badge> : null}
              </div>
            </button>
          ))
        )}
      </div>
      <div className="mt-4 flex justify-end">
        <Link href="/settings" onClick={onClose} className="text-sm font-medium text-[var(--primary)]">
          Sozlamalar
        </Link>
      </div>
    </Card>
  );
}
