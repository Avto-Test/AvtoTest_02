"use client";

type EventMetadata = Record<string, unknown>;

export async function trackEvent(
  event: string,
  metadata?: EventMetadata,
): Promise<void> {
  if (typeof event !== "string" || event.trim().length === 0) {
    return;
  }

  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({
        event: event.trim(),
        metadata: metadata ?? {},
      }),
    });
  } catch {
    // Ignore analytics transport failures to avoid blocking UX.
  }
}
