"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useProgressSnapshot } from "@/components/providers/progress-provider";
import { NotificationPanel, type NotificationPanelItem } from "@/components/notifications/notification-panel";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

const SYNTHETIC_STORAGE_KEY = "autotest.notifications.synthetic.read.v1";

function isSameLocalDay(timestamp?: string | null, target = new Date()) {
  if (!timestamp) {
    return false;
  }
  const parsed = new Date(timestamp);
  return (
    parsed.getFullYear() === target.getFullYear()
    && parsed.getMonth() === target.getMonth()
    && parsed.getDate() === target.getDate()
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [syntheticReadIds, setSyntheticReadIds] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }
    const raw = window.localStorage.getItem(SYNTHETIC_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const { dashboard, summary, gamification } = useProgressSnapshot();
  const { notifications, loading, markAllRead, markRead } = useNotifications(8);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const persistSyntheticReadIds = (nextIds: string[]) => {
    setSyntheticReadIds(nextIds);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SYNTHETIC_STORAGE_KEY, JSON.stringify(nextIds));
    }
  };

  const hasPracticedToday = useMemo(
    () => (summary?.last_attempts ?? []).some((attempt) => isSameLocalDay(attempt.finished_at)),
    [summary?.last_attempts],
  );
  const currentStreak = gamification?.streak.current_streak ?? 0;
  const latestAchievement = gamification?.recent_achievements[0] ?? null;

  const syntheticNotifications = useMemo<NotificationPanelItem[]>(() => {
    const items: NotificationPanelItem[] = [];
    const now = new Date().toISOString();
    const weakestTopic = dashboard?.topic_breakdown
      .slice()
      .sort((left, right) => left.accuracy - right.accuracy)[0]?.topic;

    if (!hasPracticedToday) {
      items.push({
        id: `synthetic:daily:${new Date().toISOString().slice(0, 10)}`,
        notification_type: "daily_practice",
        title: "Bugungi mashq tayyor",
        message: "Bugungi mashq tayyor. Davom etish uchun mashqni boshlang.",
        payload: {},
        is_read: syntheticReadIds.includes(`synthetic:daily:${new Date().toISOString().slice(0, 10)}`),
        created_at: now,
        synthetic: true,
      });
    }

    if (!hasPracticedToday && currentStreak > 0) {
      const id = `synthetic:streak:${new Date().toISOString().slice(0, 10)}:${currentStreak}`;
      items.push({
        id,
        notification_type: "streak_warning",
        title: "Seriyangizni yo'qotmang",
        message: `Bugun kamida bitta mashq qilsangiz ${currentStreak} kunlik seriya saqlanadi.`,
        payload: {},
        is_read: syntheticReadIds.includes(id),
        created_at: now,
        synthetic: true,
      });
    }

    if (weakestTopic) {
      const id = `synthetic:lesson:${weakestTopic}`;
      items.push({
        id,
        notification_type: "lesson_recommendation",
        title: "Zaif mavzu bo'yicha dars tavsiya etiladi",
        message: `${weakestTopic} mavzusini yana bir ko'rib chiqish foydali bo'ladi.`,
        payload: { topic: weakestTopic },
        is_read: syntheticReadIds.includes(id),
        created_at: now,
        synthetic: true,
      });
    }

    if (dashboard?.simulation_status?.launch_ready) {
      const id = `synthetic:simulation:${dashboard.simulation_status.next_available_at ?? "ready"}`;
      items.push({
        id,
        notification_type: "simulation_ready",
        title: "Simulyatsiya ochildi",
        message: "Imtihon simulyatsiyasi hozir tayyor. Boshlash uchun sahifani oching.",
        payload: {},
        is_read: syntheticReadIds.includes(id),
        created_at: now,
        synthetic: true,
      });
    }

    if (latestAchievement) {
      const id = `synthetic:achievement:${latestAchievement.id ?? latestAchievement.code ?? latestAchievement.name}:${latestAchievement.awarded_at}`;
      items.push({
        id,
        notification_type: "achievement",
        title: "Yangi yutuq",
        message: latestAchievement.name,
        payload: {},
        is_read: syntheticReadIds.includes(id),
        created_at: latestAchievement.awarded_at,
        synthetic: true,
      });
    }

    const deduped = new Map<string, NotificationPanelItem>();
    items.forEach((item) => {
      deduped.set(`${item.title}:${item.message}`, item);
    });
    return [...deduped.values()];
  }, [currentStreak, dashboard, hasPracticedToday, latestAchievement, syntheticReadIds]);

  const combinedNotifications = useMemo(() => {
    const merged = [...syntheticNotifications, ...notifications];
    merged.sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
    return merged.slice(0, 8);
  }, [notifications, syntheticNotifications]);

  const unreadCount = useMemo(
    () => combinedNotifications.filter((notification) => !notification.is_read).length,
    [combinedNotifications],
  );

  const handleMarkRead = async (notification: NotificationPanelItem) => {
    if (notification.synthetic) {
      if (syntheticReadIds.includes(notification.id)) {
        return;
      }
      persistSyntheticReadIds([...syntheticReadIds, notification.id]);
      return;
    }
    await markRead(notification.id);
  };

  const handleMarkAllRead = async () => {
    const syntheticIds = syntheticNotifications.map((notification) => notification.id);
    persistSyntheticReadIds([...new Set([...syntheticReadIds, ...syntheticIds])]);
    await markAllRead();
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        className={cn(
          "notification-trigger",
          open && "notification-trigger-open",
          unreadCount > 0 && "notification-trigger-unread",
        )}
        onClick={() => setOpen((value) => !value)}
        aria-label={unreadCount > 0 ? `${unreadCount} ta yangi bildirishnoma` : "Bildirishnomalar"}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <svg viewBox="0 0 448 512" className="notification-trigger-icon" aria-hidden="true">
          <path d="M224 0c-17.7 0-32 14.3-32 32V49.9C119.5 61.4 64 124.2 64 200v33.4c0 45.4-15.5 89.5-43.8 124.9L5.3 377c-5.8 7.2-6.9 17.1-2.9 25.4S14.8 416 24 416H424c9.2 0 17.6-5.3 21.6-13.6s2.9-18.2-2.9-25.4l-14.9-18.6C399.5 322.9 384 278.8 384 233.4V200c0-75.8-55.5-138.6-128-150.1V32c0-17.7-14.3-32-32-32zm0 96h8c57.4 0 104 46.6 104 104v33.4c0 47.9 13.9 94.6 39.7 134.6H72.3C98.1 328 112 281.3 112 233.4V200c0-57.4 46.6-104 104-104h8zm64 352H224 160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7s18.7-28.3 18.7-45.3z" />
        </svg>
        {unreadCount > 0 ? (
          <span className="notification-trigger-badge">
            {unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <NotificationPanel
          notifications={combinedNotifications}
          unreadCount={unreadCount}
          loading={loading}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
