import type {
  InstructorApplication,
  InstructorApplicationCreate,
  InstructorAdminProfile,
  InstructorCatalogResponse,
  InstructorComplaintCreate,
  InstructorDetail,
  InstructorLead,
  InstructorLeadCreate,
  InstructorMedia,
  InstructorMediaCreate,
  InstructorMeta,
  InstructorOwnerSummary,
  InstructorProfileUpdate,
  InstructorRegistrationSettings,
  UploadedMedia,
} from "@/types/instructor";

import { apiRequest } from "@/api/client";

export type InstructorQuery = {
  q?: string;
  city?: string;
  region?: string;
  transmission?: string;
  gender?: string;
  sort_by?: "rating" | "price" | "experience" | "newest" | "activity";
  limit?: number;
  offset?: number;
};

export function getInstructorMeta() {
  return apiRequest<InstructorMeta>("/driving-instructors/meta", { method: "GET" });
}

export function getInstructors(query: InstructorQuery = {}) {
  return apiRequest<InstructorCatalogResponse>("/driving-instructors", {
    method: "GET",
    query: {
      q: query.q,
      city: query.city,
      region: query.region,
      transmission: query.transmission,
      gender: query.gender,
      sort_by: query.sort_by ?? "rating",
      limit: query.limit ?? 12,
      offset: query.offset ?? 0,
    },
  });
}

export function getInstructorDetail(slug: string) {
  return apiRequest<InstructorDetail>(`/driving-instructors/${slug}`, { method: "GET" });
}

export function createInstructorLead(slug: string, payload: InstructorLeadCreate) {
  return apiRequest<InstructorLead>(`/driving-instructors/${slug}/leads`, {
    method: "POST",
    body: payload,
  });
}

export function createInstructorComplaint(slug: string, payload: InstructorComplaintCreate) {
  return apiRequest<{ status: string }>(`/driving-instructors/${slug}/complaints`, {
    method: "POST",
    body: payload,
  });
}

export function getInstructorRegistrationSettings() {
  return apiRequest<InstructorRegistrationSettings>("/driving-instructors/registration-settings", {
    method: "GET",
  });
}

export function uploadInstructorMedia(file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<UploadedMedia>("/driving-instructors/media/upload", {
    method: "POST",
    body,
  });
}

export function createInstructorApplication(payload: InstructorApplicationCreate) {
  return apiRequest<InstructorApplication>("/driving-instructors/applications", {
    method: "POST",
    body: payload,
  });
}

export function getMyInstructorSummary() {
  return apiRequest<InstructorOwnerSummary>("/driving-instructors/me/summary", { method: "GET" });
}

export function getMyInstructorLeads() {
  return apiRequest<InstructorLead[]>("/driving-instructors/me/leads", { method: "GET" });
}

export function getMyInstructorReviews() {
  return apiRequest<InstructorDetail["reviews"]>("/driving-instructors/me/reviews", { method: "GET" });
}

export function updateMyInstructorProfile(payload: InstructorProfileUpdate) {
  return apiRequest<InstructorAdminProfile>("/driving-instructors/me/profile", {
    method: "PUT",
    body: payload,
  });
}

export function createMyInstructorMedia(payload: InstructorMediaCreate) {
  return apiRequest<InstructorMedia>("/driving-instructors/me/media", {
    method: "POST",
    body: payload,
  });
}

export function deleteMyInstructorMedia(mediaId: string) {
  return apiRequest<null>(`/driving-instructors/me/media/${mediaId}`, {
    method: "DELETE",
  });
}
