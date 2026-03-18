import { apiRequest } from "@/api/client";
import type { SimulationHistoryResponse, SimulationStartResponse } from "@/types/simulation";

export function startSimulationExam() {
  return apiRequest<SimulationStartResponse>("/simulation/start", {
    method: "POST",
  });
}

export function getSimulationHistory() {
  return apiRequest<SimulationHistoryResponse>("/simulation/history", {
    method: "GET",
  });
}
