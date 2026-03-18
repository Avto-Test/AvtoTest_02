import type {
  SchoolCatalogResponse,
  SchoolDetail,
  SchoolLead,
  SchoolLeadCreate,
  SchoolMedia,
  SchoolMediaCreate,
  SchoolMeta,
  SchoolProfileUpdate,
  SchoolOwnerSummary,
  SchoolPartnerApplication,
  SchoolPartnerApplicationCreate,
  SchoolRbacDashboard,
  UploadedSchoolMedia,
} from "@/types/school";

import { apiRequest } from "@/api/client";

export type SchoolQuery = {
  q?: string;
  city?: string;
  region?: string;
  category?: string;
  sort_by?: "rating" | "price" | "name" | "newest";
  limit?: number;
  offset?: number;
};

export function getSchoolMeta() {
  return apiRequest<SchoolMeta>("/driving-schools/meta", { method: "GET" });
}

export function getSchools(query: SchoolQuery = {}) {
  return apiRequest<SchoolCatalogResponse>("/driving-schools", {
    method: "GET",
    query: {
      q: query.q,
      city: query.city,
      region: query.region,
      category: query.category,
      sort_by: query.sort_by ?? "rating",
      limit: query.limit ?? 12,
      offset: query.offset ?? 0,
    },
  });
}

export function getSchoolDetail(slug: string) {
  return apiRequest<SchoolDetail>(`/driving-schools/${slug}`, { method: "GET" });
}

export function createSchoolLead(slug: string, payload: SchoolLeadCreate) {
  return apiRequest<{ status: string }>(`/driving-schools/${slug}/leads`, {
    method: "POST",
    body: payload,
  });
}

export function createSchoolPartnerApplication(payload: SchoolPartnerApplicationCreate) {
  return apiRequest<SchoolPartnerApplication>("/driving-schools/partner-applications", {
    method: "POST",
    body: payload,
  });
}

export function getMySchoolSummary() {
  return apiRequest<SchoolOwnerSummary>("/driving-schools/me/summary", { method: "GET" });
}

export function getMySchoolLeads() {
  return apiRequest<SchoolLead[]>("/driving-schools/me/leads", { method: "GET" });
}

export function getMySchoolReviews() {
  return apiRequest<SchoolDetail["reviews"]>("/driving-schools/me/reviews", { method: "GET" });
}

export function getSchoolDashboard() {
  return apiRequest<SchoolRbacDashboard>("/school/dashboard", { method: "GET" });
}

export function updateMySchoolProfile(payload: SchoolProfileUpdate) {
  return apiRequest<SchoolOwnerSummary["school"]>("/driving-schools/me/profile", {
    method: "PUT",
    body: payload,
  });
}

export function uploadMySchoolMedia(file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<UploadedSchoolMedia>("/driving-schools/me/media/upload", {
    method: "POST",
    body,
  });
}

export function createMySchoolMedia(payload: SchoolMediaCreate) {
  return apiRequest<SchoolMedia>("/driving-schools/me/media", {
    method: "POST",
    body: payload,
  });
}

export function deleteMySchoolMedia(mediaId: string) {
  return apiRequest<null>(`/driving-schools/me/media/${mediaId}`, {
    method: "DELETE",
  });
}
