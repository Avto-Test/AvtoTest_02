import type { AxiosProgressEvent } from 'axios';
import { api } from "@/lib/api";
import {
  AdminDrivingInstructorFormData,
  DrivingInstructorAdmin,
  DrivingInstructorMediaItem,
  DrivingInstructorApplication,
  DrivingInstructorApplicationFormData,
  DrivingInstructorCatalogResponse,
  DrivingInstructorComplaintFormData,
  DrivingInstructorComplaintItem,
  DrivingInstructorDetail,
  DrivingInstructorLeadFormData,
  DrivingInstructorLeadItem,
  DrivingInstructorMetaResponse,
  DrivingInstructorSummaryResponse,
  DrivingInstructorPromoStatsItem,
  DrivingInstructorRegistrationSettings,
  DrivingInstructorReviewFormData,
  DrivingInstructorReviewItem,
} from "@/schemas/drivingInstructor.schema";

export type DrivingInstructorCatalogQuery = {
  q?: string;
  city?: string;
  region?: string;
  transmission?: string;
  price_min_cents?: number;
  price_max_cents?: number;
  rating_min?: number;
  experience_min_years?: number;
  gender?: string;
  sort_by?: "rating" | "price" | "experience" | "newest" | "activity";
  limit?: number;
  offset?: number;
};

export async function getDrivingInstructors(
  query: DrivingInstructorCatalogQuery = {}
): Promise<DrivingInstructorCatalogResponse> {
  const response = await api.get<DrivingInstructorCatalogResponse>("/driving-instructors", {
    params: query,
  });
  return response.data;
}

export async function getDrivingInstructorMeta(): Promise<DrivingInstructorMetaResponse> {
  const response = await api.get<DrivingInstructorMetaResponse>("/driving-instructors/meta");
  return response.data;
}

export async function getDrivingInstructorDetail(slug: string): Promise<DrivingInstructorDetail> {
  const response = await api.get<DrivingInstructorDetail>(`/driving-instructors/${slug}`);
  return response.data;
}

export async function getDrivingInstructorReviews(
  slug: string,
  limit = 50
): Promise<DrivingInstructorReviewItem[]> {
  const response = await api.get<DrivingInstructorReviewItem[]>(
    `/driving-instructors/${slug}/reviews`,
    { params: { limit } }
  );
  return response.data;
}

export async function submitDrivingInstructorLead(
  slug: string,
  data: DrivingInstructorLeadFormData
): Promise<DrivingInstructorLeadItem> {
  const response = await api.post<DrivingInstructorLeadItem>(
    `/driving-instructors/${slug}/leads`,
    data
  );
  return response.data;
}

export async function submitDrivingInstructorReview(
  slug: string,
  data: DrivingInstructorReviewFormData
): Promise<DrivingInstructorReviewItem> {
  const response = await api.post<DrivingInstructorReviewItem>(
    `/driving-instructors/${slug}/reviews`,
    data
  );
  return response.data;
}

export async function submitDrivingInstructorComplaint(
  slug: string,
  data: DrivingInstructorComplaintFormData
): Promise<{ status: string }> {
  const response = await api.post<{ status: string }>(
    `/driving-instructors/${slug}/complaints`,
    data
  );
  return response.data;
}

export async function getDrivingInstructorRegistrationSettings(): Promise<DrivingInstructorRegistrationSettings> {
  const response = await api.get<DrivingInstructorRegistrationSettings>(
    "/driving-instructors/registration-settings"
  );
  return response.data;
}

export async function uploadDrivingInstructorMedia(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<{ url: string; filename: string }>(
    "/driving-instructors/media/upload",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (!onProgress || !progressEvent.total) return;
        const percent = Math.min(
          100,
          Math.max(0, Math.round((progressEvent.loaded / progressEvent.total) * 100))
        );
        onProgress(percent);
      },
    }
  );
  return response.data;
}

export async function submitDrivingInstructorApplication(
  data: DrivingInstructorApplicationFormData
): Promise<DrivingInstructorApplication> {
  const response = await api.post<DrivingInstructorApplication>(
    "/driving-instructors/applications",
    data
  );
  return response.data;
}

export async function getMyDrivingInstructorSummary(): Promise<DrivingInstructorSummaryResponse> {
  const response = await api.get<DrivingInstructorSummaryResponse>("/driving-instructors/me/summary");
  return response.data;
}

export async function updateMyDrivingInstructorProfile(
  data: Partial<AdminDrivingInstructorFormData>
): Promise<DrivingInstructorAdmin> {
  const payload = {
    ...data,
    promo_code_id:
      data.promo_code_id === "" ? null : data.promo_code_id === undefined ? undefined : data.promo_code_id,
  };
  const response = await api.put<DrivingInstructorAdmin>("/driving-instructors/me/profile", payload);
  return response.data;
}

export async function createMyDrivingInstructorMedia(data: {
  media_type: string;
  url: string;
  caption?: string;
  sort_order: number;
  is_active: boolean;
}): Promise<DrivingInstructorMediaItem> {
  const response = await api.post<DrivingInstructorMediaItem>('/driving-instructors/me/media', data);
  return response.data;
}

export async function updateMyDrivingInstructorMedia(
  mediaId: string,
  data: Partial<{
    media_type: string;
    url: string;
    caption: string;
    sort_order: number;
    is_active: boolean;
  }>
): Promise<DrivingInstructorMediaItem> {
  const response = await api.put<DrivingInstructorMediaItem>(`/driving-instructors/me/media/${mediaId}`, data);
  return response.data;
}

export async function deleteMyDrivingInstructorMedia(mediaId: string): Promise<void> {
  await api.delete(`/driving-instructors/me/media/${mediaId}`);
}

export async function getMyDrivingInstructorLeads(): Promise<DrivingInstructorLeadItem[]> {
  const response = await api.get<DrivingInstructorLeadItem[]>("/driving-instructors/me/leads");
  return response.data;
}

export async function getMyDrivingInstructorReviews(): Promise<DrivingInstructorReviewItem[]> {
  const response = await api.get<DrivingInstructorReviewItem[]>("/driving-instructors/me/reviews");
  return response.data;
}

export function buildDrivingInstructorReferralUrl(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/api/driving-instructors/ref/${encodeURIComponent(code)}`;
}

// Admin API
export async function adminGetDrivingInstructors(): Promise<DrivingInstructorAdmin[]> {
  const response = await api.get<DrivingInstructorAdmin[]>("/admin/driving-instructors");
  return response.data;
}

export async function adminCreateDrivingInstructor(
  data: AdminDrivingInstructorFormData
): Promise<DrivingInstructorAdmin> {
  const payload = {
    ...data,
    user_id: data.user_id || null,
    promo_code_id: data.promo_code_id || null,
  };
  const response = await api.post<DrivingInstructorAdmin>(
    "/admin/driving-instructors",
    payload
  );
  return response.data;
}

export async function adminUpdateDrivingInstructor(
  instructorId: string,
  data: Partial<AdminDrivingInstructorFormData>
): Promise<DrivingInstructorAdmin> {
  const payload = {
    ...data,
    user_id: data.user_id === "" ? null : data.user_id,
    promo_code_id:
      data.promo_code_id === "" ? null : data.promo_code_id === undefined ? undefined : data.promo_code_id,
  };
  const response = await api.put<DrivingInstructorAdmin>(
    `/admin/driving-instructors/${instructorId}`,
    payload
  );
  return response.data;
}

export async function adminDeleteDrivingInstructor(instructorId: string): Promise<void> {
  await api.delete(`/admin/driving-instructors/${instructorId}`);
}

export async function adminUploadDrivingInstructorMedia(
  file: File
): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<{ url: string; filename: string }>(
    "/admin/driving-instructors/media/upload",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    }
  );
  return response.data;
}

export async function adminCreateDrivingInstructorMedia(
  instructorId: string,
  data: { media_type: string; url: string; caption?: string; sort_order: number; is_active: boolean }
) {
  const response = await api.post(`/admin/driving-instructors/${instructorId}/media`, data);
  return response.data;
}

export async function adminUpdateDrivingInstructorMedia(
  mediaId: string,
  data: Partial<{ media_type: string; url: string; caption: string; sort_order: number; is_active: boolean }>
) {
  const response = await api.put(`/admin/driving-instructors/media/${mediaId}`, data);
  return response.data;
}

export async function adminDeleteDrivingInstructorMedia(mediaId: string): Promise<void> {
  await api.delete(`/admin/driving-instructors/media/${mediaId}`);
}

export async function adminGetDrivingInstructorApplications(): Promise<DrivingInstructorApplication[]> {
  const response = await api.get<DrivingInstructorApplication[]>(
    "/admin/driving-instructors/applications"
  );
  return response.data;
}

export async function adminUpdateDrivingInstructorApplication(
  applicationId: string,
  data: { status: "pending" | "approved" | "rejected"; rejection_reason?: string }
): Promise<DrivingInstructorApplication> {
  const response = await api.put<DrivingInstructorApplication>(
    `/admin/driving-instructors/applications/${applicationId}`,
    data
  );
  return response.data;
}

export async function adminGetDrivingInstructorLeads(
  instructorId?: string
): Promise<DrivingInstructorLeadItem[]> {
  const response = await api.get<DrivingInstructorLeadItem[]>("/admin/driving-instructors/leads", {
    params: instructorId ? { instructor_id: instructorId } : undefined,
  });
  return response.data;
}

export async function adminUpdateDrivingInstructorLeadStatus(
  leadId: string,
  statusValue: string
): Promise<DrivingInstructorLeadItem> {
  const response = await api.put<DrivingInstructorLeadItem>(
    `/admin/driving-instructors/leads/${leadId}`,
    { status: statusValue }
  );
  return response.data;
}

export async function adminGetDrivingInstructorReviews(
  instructorId?: string
): Promise<DrivingInstructorReviewItem[]> {
  const response = await api.get<DrivingInstructorReviewItem[]>(
    "/admin/driving-instructors/reviews",
    {
      params: instructorId ? { instructor_id: instructorId } : undefined,
    }
  );
  return response.data;
}

export async function adminUpdateDrivingInstructorReview(
  reviewId: string,
  data: Partial<{ is_visible: boolean; rating: number; comment: string }>
): Promise<DrivingInstructorReviewItem> {
  const response = await api.put<DrivingInstructorReviewItem>(
    `/admin/driving-instructors/reviews/${reviewId}`,
    data
  );
  return response.data;
}

export async function adminDeleteDrivingInstructorReview(reviewId: string): Promise<void> {
  await api.delete(`/admin/driving-instructors/reviews/${reviewId}`);
}

export async function adminGetDrivingInstructorComplaints(
  instructorId?: string
): Promise<DrivingInstructorComplaintItem[]> {
  const response = await api.get<DrivingInstructorComplaintItem[]>(
    "/admin/driving-instructors/complaints",
    {
      params: instructorId ? { instructor_id: instructorId } : undefined,
    }
  );
  return response.data;
}

export async function adminUpdateDrivingInstructorComplaint(
  complaintId: string,
  statusValue: string
): Promise<DrivingInstructorComplaintItem> {
  const response = await api.put<DrivingInstructorComplaintItem>(
    `/admin/driving-instructors/complaints/${complaintId}`,
    { status: statusValue }
  );
  return response.data;
}

export async function adminGetDrivingInstructorRegistrationSettings(): Promise<DrivingInstructorRegistrationSettings> {
  const response = await api.get<DrivingInstructorRegistrationSettings>(
    "/admin/driving-instructors/registration-settings"
  );
  return response.data;
}

export async function adminUpdateDrivingInstructorRegistrationSettings(
  data: Partial<DrivingInstructorRegistrationSettings>
): Promise<DrivingInstructorRegistrationSettings> {
  const response = await api.put<DrivingInstructorRegistrationSettings>(
    "/admin/driving-instructors/registration-settings",
    data
  );
  return response.data;
}

export async function adminGetDrivingInstructorPromoStats(): Promise<DrivingInstructorPromoStatsItem[]> {
  const response = await api.get<{ items: DrivingInstructorPromoStatsItem[] }>(
    "/admin/driving-instructors/promo-stats"
  );
  return response.data.items;
}
