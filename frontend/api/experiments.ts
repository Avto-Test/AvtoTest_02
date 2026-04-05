import { apiRequest } from "@/api/client";

export type ExperimentAssignments = Record<string, string>;

export function getExperimentAssignments() {
  return apiRequest<ExperimentAssignments>("/api/experiments", {
    method: "GET",
    baseUrl: "/",
  });
}
