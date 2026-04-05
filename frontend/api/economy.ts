import { apiRequest } from "@/api/client";
import type {
  CooldownReductionResponse,
  EconomyOverview,
  FocusPackResponse,
  SimulationFastUnlockResponse,
  XPBoostActivationResponse,
} from "@/types/economy";

export function getEconomyOverview() {
  return apiRequest<EconomyOverview>("/economy/overview", {
    method: "GET",
    baseUrl: "/api",
  });
}

export function reduceSimulationCooldown(days: number) {
  return apiRequest<CooldownReductionResponse>("/economy/simulation/reduce-cooldown", {
    method: "POST",
    body: { days },
    baseUrl: "/api",
  });
}

export function unlockSimulationFastTrack() {
  return apiRequest<SimulationFastUnlockResponse>("/economy/simulation/unlock", {
    method: "POST",
    baseUrl: "/api",
  });
}

export function activateXpBoost() {
  return apiRequest<XPBoostActivationResponse>("/economy/xp-boost/activate", {
    method: "POST",
    baseUrl: "/api",
  });
}

export function unlockFocusPack(payload: { topic: string; question_count?: number }) {
  return apiRequest<FocusPackResponse>("/economy/focus-pack", {
    method: "POST",
    body: payload,
    baseUrl: "/api",
  });
}
