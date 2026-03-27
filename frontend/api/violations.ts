import { ApiError } from "@/api/client";

export type ViolationLogPayload = {
  event_type: string;
  attempt_id?: string;
  test_id?: string;
  details?: Record<string, unknown>;
};

export type ViolationLogResponse = {
  success: boolean;
  violation_count?: number;
  violation_limit?: number;
  attempt_finished?: boolean;
  disqualified?: boolean;
  disqualification_reason?: string | null;
  coins_penalized?: number;
  coin_balance?: number | null;
  sentWithBeacon?: boolean;
};

async function parseViolationResponse(response: Response): Promise<ViolationLogResponse> {
  const text = await response.text();
  if (!text) {
    return { success: response.ok };
  }

  try {
    return JSON.parse(text) as ViolationLogResponse;
  } catch {
    if (!response.ok) {
      throw new ApiError(text, response.status, text);
    }
    return { success: true };
  }
}

export async function logViolation(
  payload: ViolationLogPayload,
  options: {
    keepalive?: boolean;
    useBeacon?: boolean;
  } = {},
): Promise<ViolationLogResponse> {
  const body = JSON.stringify(payload);

  if (options.useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const sent = navigator.sendBeacon(
      "/api/violations/log",
      new Blob([body], { type: "application/json" }),
    );
    if (sent) {
      return { success: true, sentWithBeacon: true };
    }
  }

  const response = await fetch("/api/violations/log", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: options.keepalive,
  });

  if (!response.ok) {
    const detail = await parseViolationResponse(response);
    throw new ApiError("Violation logging failed", response.status, detail);
  }

  return parseViolationResponse(response);
}
