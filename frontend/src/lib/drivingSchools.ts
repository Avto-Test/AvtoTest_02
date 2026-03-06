import { api } from "@/lib/api";
import type { AxiosProgressEvent } from "axios";
import {
  AdminDrivingSchool,
  AdminDrivingSchoolCourseFormData,
  AdminDrivingSchoolFormData,
  AdminDrivingSchoolLead,
  AdminDrivingSchoolMediaFormData,
  DrivingSchoolCatalogResponse,
  DrivingSchoolDetail,
  DrivingSchoolLeadFormData,
  DrivingSchoolMetaResponse,
  DrivingSchoolOwnerSummary,
  DrivingSchoolPartnerApplication,
  DrivingSchoolPromoStatsItem,
  DrivingSchoolReviewFormData,
  DrivingSchoolReviewItem,
  PartnerApplicationFormData,
} from "@/schemas/drivingSchool.schema";

export type DrivingSchoolCatalogQuery = {
  q?: string;
  city?: string;
  region?: string;
  category?: string;
  price_min_cents?: number;
  price_max_cents?: number;
  rating_min?: number;
  duration_max_weeks?: number;
  sort_by?: "rating" | "price" | "name" | "newest";
  limit?: number;
  offset?: number;
};

export async function getDrivingSchools(
  query: DrivingSchoolCatalogQuery = {}
): Promise<DrivingSchoolCatalogResponse> {
  const response = await api.get<DrivingSchoolCatalogResponse>("/driving-schools", {
    params: query,
  });
  return response.data;
}

export async function getDrivingSchoolMeta(): Promise<DrivingSchoolMetaResponse> {
  const response = await api.get<DrivingSchoolMetaResponse>("/driving-schools/meta");
  return response.data;
}

export async function getDrivingSchoolDetail(slug: string): Promise<DrivingSchoolDetail> {
  const response = await api.get<DrivingSchoolDetail>(`/driving-schools/${slug}`);
  return response.data;
}

export async function submitDrivingSchoolLead(
  slug: string,
  data: DrivingSchoolLeadFormData
): Promise<{ status: string }> {
  const response = await api.post<{ status: string }>(
    `/driving-schools/${slug}/leads`,
    data
  );
  return response.data;
}

export async function getDrivingSchoolReviews(
  slug: string,
  limit = 40
): Promise<DrivingSchoolReviewItem[]> {
  const response = await api.get<DrivingSchoolReviewItem[]>(
    `/driving-schools/${slug}/reviews`,
    {
      params: { limit },
    }
  );
  return response.data;
}

export async function submitDrivingSchoolReview(
  slug: string,
  data: DrivingSchoolReviewFormData
): Promise<DrivingSchoolReviewItem> {
  const response = await api.post<DrivingSchoolReviewItem>(
    `/driving-schools/${slug}/reviews`,
    data
  );
  return response.data;
}

export async function submitPartnerApplication(
  data: PartnerApplicationFormData
): Promise<DrivingSchoolPartnerApplication> {
  const response = await api.post<DrivingSchoolPartnerApplication>(
    "/driving-schools/partner-applications",
    data
  );
  return response.data;
}

export async function getMyDrivingSchoolSummary(): Promise<DrivingSchoolOwnerSummary> {
  const response = await api.get<DrivingSchoolOwnerSummary>("/driving-schools/me/summary");
  return response.data;
}

export async function updateMyDrivingSchoolProfile(
  data: Partial<AdminDrivingSchoolFormData>
): Promise<AdminDrivingSchool> {
  const payload = {
    ...data,
    owner_user_id:
      data.owner_user_id === "" ? null : data.owner_user_id === undefined ? undefined : data.owner_user_id,
    promo_code_id:
      data.promo_code_id === "" ? null : data.promo_code_id === undefined ? undefined : data.promo_code_id,
  };
  const response = await api.put<AdminDrivingSchool>("/driving-schools/me/profile", payload);
  return response.data;
}

export async function getMyDrivingSchoolLeads(): Promise<AdminDrivingSchoolLead[]> {
  const response = await api.get<AdminDrivingSchoolLead[]>("/driving-schools/me/leads");
  return response.data;
}

export async function getMyDrivingSchoolReviews(): Promise<DrivingSchoolReviewItem[]> {
  const response = await api.get<DrivingSchoolReviewItem[]>("/driving-schools/me/reviews");
  return response.data;
}

export async function uploadMyDrivingSchoolMedia(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<{ url: string; filename: string }>(
    "/driving-schools/me/media/upload",
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

export function buildReferralUrl(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/api/driving-schools/ref/${encodeURIComponent(code)}`;
}

// Admin API
export async function adminGetDrivingSchools(): Promise<AdminDrivingSchool[]> {
  const response = await api.get<AdminDrivingSchool[]>("/admin/driving-schools");
  return response.data;
}

export async function adminCreateDrivingSchool(
  data: AdminDrivingSchoolFormData
): Promise<AdminDrivingSchool> {
  const payload = {
    ...data,
    owner_user_id: data.owner_user_id || null,
    promo_code_id: data.promo_code_id || null,
  };
  const response = await api.post<AdminDrivingSchool>("/admin/driving-schools", payload);
  return response.data;
}

export async function adminUpdateDrivingSchool(
  schoolId: string,
  data: Partial<AdminDrivingSchoolFormData>
): Promise<AdminDrivingSchool> {
  const payload = {
    ...data,
    owner_user_id:
      data.owner_user_id === "" ? null : data.owner_user_id === undefined ? undefined : data.owner_user_id,
    promo_code_id:
      data.promo_code_id === "" ? null : data.promo_code_id === undefined ? undefined : data.promo_code_id,
  };
  const response = await api.put<AdminDrivingSchool>(
    `/admin/driving-schools/${schoolId}`,
    payload
  );
  return response.data;
}

export async function adminDeleteDrivingSchool(schoolId: string): Promise<void> {
  await api.delete(`/admin/driving-schools/${schoolId}`);
}

export async function adminUploadDrivingSchoolMedia(
  file: File
): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<{ url: string; filename: string }>(
    "/admin/driving-schools/media/upload",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    }
  );
  return response.data;
}

export async function adminCreateDrivingSchoolCourse(
  schoolId: string,
  data: AdminDrivingSchoolCourseFormData
) {
  const response = await api.post(
    `/admin/driving-schools/${schoolId}/courses`,
    data
  );
  return response.data;
}

export async function adminUpdateDrivingSchoolCourse(
  courseId: string,
  data: Partial<AdminDrivingSchoolCourseFormData>
) {
  const response = await api.put(`/admin/driving-schools/courses/${courseId}`, data);
  return response.data;
}

export async function adminDeleteDrivingSchoolCourse(courseId: string): Promise<void> {
  await api.delete(`/admin/driving-schools/courses/${courseId}`);
}

export async function adminCreateDrivingSchoolMedia(
  schoolId: string,
  data: AdminDrivingSchoolMediaFormData
) {
  const response = await api.post(`/admin/driving-schools/${schoolId}/media`, data);
  return response.data;
}

export async function adminUpdateDrivingSchoolMedia(
  mediaId: string,
  data: Partial<AdminDrivingSchoolMediaFormData>
) {
  const response = await api.put(`/admin/driving-schools/media/${mediaId}`, data);
  return response.data;
}

export async function adminDeleteDrivingSchoolMedia(mediaId: string): Promise<void> {
  await api.delete(`/admin/driving-schools/media/${mediaId}`);
}

export async function adminGetDrivingSchoolLeads(
  schoolId?: string
): Promise<AdminDrivingSchoolLead[]> {
  const response = await api.get<AdminDrivingSchoolLead[]>("/admin/driving-schools/leads", {
    params: schoolId ? { school_id: schoolId } : undefined,
  });
  return response.data;
}

export async function adminUpdateDrivingSchoolLeadStatus(
  leadId: string,
  statusValue: string
): Promise<AdminDrivingSchoolLead> {
  const response = await api.put<AdminDrivingSchoolLead>(
    `/admin/driving-schools/leads/${leadId}`,
    { status: statusValue }
  );
  return response.data;
}

export async function adminGetPartnerApplications(): Promise<DrivingSchoolPartnerApplication[]> {
  const response = await api.get<DrivingSchoolPartnerApplication[]>(
    "/admin/driving-schools/partner-applications"
  );
  return response.data;
}

export async function adminUpdatePartnerApplication(
  applicationId: string,
  statusValue: string
): Promise<DrivingSchoolPartnerApplication> {
  const response = await api.put<DrivingSchoolPartnerApplication>(
    `/admin/driving-schools/partner-applications/${applicationId}`,
    { status: statusValue }
  );
  return response.data;
}

export async function adminGetDrivingSchoolReviews(
  schoolId?: string
): Promise<DrivingSchoolReviewItem[]> {
  const response = await api.get<DrivingSchoolReviewItem[]>(
    "/admin/driving-schools/reviews",
    {
      params: schoolId ? { school_id: schoolId } : undefined,
    }
  );
  return response.data;
}

export async function adminUpdateDrivingSchoolReview(
  reviewId: string,
  data: Partial<{ is_visible: boolean; rating: number; comment: string }>
): Promise<DrivingSchoolReviewItem> {
  const response = await api.put<DrivingSchoolReviewItem>(
    `/admin/driving-schools/reviews/${reviewId}`,
    data
  );
  return response.data;
}

export async function adminDeleteDrivingSchoolReview(reviewId: string): Promise<void> {
  await api.delete(`/admin/driving-schools/reviews/${reviewId}`);
}

export async function adminGetDrivingSchoolPromoStats(): Promise<DrivingSchoolPromoStatsItem[]> {
  const response = await api.get<{ items: DrivingSchoolPromoStatsItem[] }>(
    "/admin/driving-schools/promo-stats"
  );
  return response.data.items;
}
