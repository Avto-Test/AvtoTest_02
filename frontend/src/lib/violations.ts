/**
 * AUTOTEST Violations API
 * Lightweight client for logging violation events.
 */

import { api } from "./api";

export interface ViolationPayload {
    event_type: string;
    test_id?: string;
    attempt_id?: string;
    details?: Record<string, unknown>;
}

export async function logViolation(payload: ViolationPayload): Promise<void> {
    try {
        await api.post("/violations/log", payload);
    } catch {
        // Fail silently
    }
}
