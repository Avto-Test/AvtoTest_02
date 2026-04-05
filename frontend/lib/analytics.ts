"use client";

type EventMetadata = Record<string, unknown>;

export type MonetizationEventType =
  | "premium_block_view"
  | "upgrade_click"
  | "upgrade_success"
  | "feature_used"
  | "feature_locked_click";

type AnalyticsEnvelope =
  | {
      event: string;
      metadata: EventMetadata;
    }
  | {
      event_type: MonetizationEventType;
      feature_key?: string;
      metadata: EventMetadata;
    };

const FLUSH_DELAY_MS = 650;
const DEDUPE_WINDOW_MS = 1_500;
const MAX_BATCH_SIZE = 20;

const queue: AnalyticsEnvelope[] = [];
const dedupeTimestamps = new Map<string, number>();
let flushTimer: number | null = null;
let listenersBound = false;

function normalizeToken(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function buildDedupeKey(payload: AnalyticsEnvelope) {
  const source = normalizeToken(
    typeof payload.metadata.source === "string" ? payload.metadata.source : undefined,
  );
  if ("event_type" in payload) {
    return `${payload.event_type}:${normalizeToken(payload.feature_key) ?? "-"}:${source ?? "-"}`;
  }

  return `${normalizeToken(payload.event) ?? "-"}:${source ?? "-"}`;
}

function shouldDropDuplicate(payload: AnalyticsEnvelope) {
  const key = buildDedupeKey(payload);
  const now = Date.now();
  const previous = dedupeTimestamps.get(key) ?? 0;
  if (now - previous < DEDUPE_WINDOW_MS) {
    return true;
  }
  dedupeTimestamps.set(key, now);
  return false;
}

function scheduleFlush() {
  if (typeof window === "undefined") {
    return;
  }
  if (flushTimer !== null) {
    return;
  }
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushAnalyticsQueue();
  }, FLUSH_DELAY_MS);
}

async function sendBatch(batch: AnalyticsEnvelope[]) {
  if (batch.length === 0) {
    return;
  }

  try {
    const response = await fetch("/api/analytics/track/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify(batch),
    });

    if (response.ok) {
      return;
    }
  } catch {
    // Fallback to per-event dispatch below.
  }

  await Promise.allSettled(
    batch.map((payload) =>
      fetch("/api/analytics/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        keepalive: true,
        body: JSON.stringify(payload),
      }),
    ),
  );
}

function bindLifecycleFlush() {
  if (listenersBound || typeof window === "undefined") {
    return;
  }

  const flushNow = () => {
    if (document.visibilityState === "hidden") {
      void flushAnalyticsQueue({ immediate: true });
    }
  };

  window.addEventListener("pagehide", () => {
    void flushAnalyticsQueue({ immediate: true });
  });
  document.addEventListener("visibilitychange", flushNow);
  listenersBound = true;
}

export async function flushAnalyticsQueue(options: { immediate?: boolean } = {}) {
  bindLifecycleFlush();

  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }

  while (queue.length > 0) {
    const batch = queue.splice(0, options.immediate ? queue.length : MAX_BATCH_SIZE);
    await sendBatch(batch);
    if (!options.immediate) {
      break;
    }
  }
}

function enqueue(payload: AnalyticsEnvelope) {
  if (shouldDropDuplicate(payload)) {
    return;
  }

  bindLifecycleFlush();
  queue.push(payload);
  scheduleFlush();
}

export async function trackEvent(event: string, metadata?: EventMetadata): Promise<void> {
  const normalizedEvent = normalizeToken(event);
  if (!normalizedEvent) {
    return;
  }

  enqueue({
    event: normalizedEvent,
    metadata: metadata ?? {},
  });
}

export async function trackMonetizationEvent(
  eventType: MonetizationEventType,
  featureKey?: string | null,
  metadata?: EventMetadata,
): Promise<void> {
  const normalizedFeatureKey = normalizeToken(featureKey);
  enqueue({
    event_type: eventType,
    feature_key: normalizedFeatureKey ?? undefined,
    metadata: metadata ?? {},
  });
}
