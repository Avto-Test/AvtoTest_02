import { z } from "zod";

export interface DrivingInstructorCatalogItem {
  id: string;
  slug: string;
  full_name: string;
  profile_image_url: string | null;
  years_experience: number;
  transmission: string;
  car_model: string;
  city: string;
  region: string | null;
  hourly_price_cents: number;
  currency: string;
  rating_avg: number;
  review_count: number;
  is_new: boolean;
  is_top_rated: boolean;
}

export interface DrivingInstructorCatalogResponse {
  total: number;
  offset: number;
  limit: number;
  items: DrivingInstructorCatalogItem[];
}

export interface DrivingInstructorMetaResponse {
  cities: string[];
  regions: string[];
  transmissions: string[];
  genders: string[];
}

export interface DrivingInstructorMediaItem {
  id: string;
  media_type: string;
  url: string;
  caption: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface DrivingInstructorReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  is_visible: boolean;
  created_at: string;
  user_display_name: string | null;
}

export interface DrivingInstructorDetail {
  id: string;
  slug: string;
  full_name: string;
  gender: string | null;
  years_experience: number;
  short_bio: string;
  teaching_style: string | null;
  city: string;
  region: string | null;
  service_areas: string | null;
  transmission: string;
  car_model: string;
  car_year: number | null;
  car_features: string | null;
  hourly_price_cents: number;
  currency: string;
  min_lesson_minutes: number;
  special_services: string | null;
  phone: string;
  telegram: string | null;
  profile_image_url: string;
  map_embed_url: string | null;
  referral_code: string;
  promo_code: string | null;
  view_count?: number;
  views_last_24h?: number;
  lead_count?: number;
  is_most_selected?: boolean;
  is_top_rated?: boolean;
  rating_avg: number;
  review_count: number;
  review_distribution: Record<string, number>;
  media_items: DrivingInstructorMediaItem[];
  reviews: DrivingInstructorReviewItem[];
  disclaimer: string;
}

export const drivingInstructorLeadSchema = z.object({
  full_name: z.string().min(2).max(255),
  phone: z.string().min(5).max(40),
  requested_transmission: z.string().max(20).optional(),
  comment: z.string().max(4000).optional(),
});

export type DrivingInstructorLeadFormData = z.infer<typeof drivingInstructorLeadSchema>;

export const drivingInstructorReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(4000).optional(),
});

export type DrivingInstructorReviewFormData = z.infer<typeof drivingInstructorReviewSchema>;

export const drivingInstructorComplaintSchema = z.object({
  full_name: z.string().min(2).max(255),
  phone: z.string().min(5).max(40).optional(),
  reason: z.string().min(2).max(120),
  comment: z.string().max(4000).optional(),
});

export type DrivingInstructorComplaintFormData = z.infer<typeof drivingInstructorComplaintSchema>;

export const drivingInstructorApplicationSchema = z.object({
  full_name: z.string().min(2).max(255),
  phone: z.string().min(5).max(40),
  city: z.string().min(2).max(120),
  region: z.string().max(120).optional(),
  gender: z.string().max(20).optional(),
  years_experience: z.number().int().min(0).max(80),
  transmission: z.string().min(3).max(20),
  car_model: z.string().min(2).max(120),
  hourly_price_cents: z.number().int().min(0),
  currency: z.string().min(3).max(10),
  short_bio: z.string().min(20).max(4000),
  profile_image_url: z.string().min(1).max(2000),
  extra_image_urls: z.array(z.string().min(1).max(2000)).min(1).max(15),
});

export type DrivingInstructorApplicationFormData = z.infer<
  typeof drivingInstructorApplicationSchema
>;

export interface DrivingInstructorApplication {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  city: string;
  region: string | null;
  gender: string | null;
  years_experience: number;
  transmission: string;
  car_model: string;
  hourly_price_cents: number;
  currency: string;
  short_bio: string;
  profile_image_url: string;
  extra_image_urls: string[];
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  submitted_from: string;
  created_at: string;
  updated_at: string;
  user_email: string | null;
}

export interface DrivingInstructorRegistrationSettings {
  is_paid_enabled: boolean;
  price_cents: number;
  currency: string;
  validity_days: number;
  discount_percent: number;
  campaign_title: string | null;
  campaign_description: string | null;
  free_banner_enabled: boolean;
  countdown_enabled: boolean;
  countdown_ends_at: string | null;
  updated_at: string;
}

export interface DrivingInstructorAdmin {
  id: string;
  user_id: string | null;
  slug: string;
  full_name: string;
  gender: string | null;
  years_experience: number;
  short_bio: string;
  teaching_style: string | null;
  city: string;
  region: string | null;
  service_areas: string | null;
  transmission: string;
  car_model: string;
  car_year: number | null;
  car_features: string | null;
  hourly_price_cents: number;
  currency: string;
  min_lesson_minutes: number;
  special_services: string | null;
  phone: string;
  telegram: string | null;
  profile_image_url: string;
  map_embed_url: string | null;
  referral_code: string;
  promo_code_id: string | null;
  promo_code: string | null;
  is_verified: boolean;
  is_active: boolean;
  is_blocked: boolean;
  is_top_rated: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  lead_count: number;
  review_count: number;
  rating_avg: number;
  promo_redemption_count: number;
  media_items: DrivingInstructorMediaItem[];
}

export const adminDrivingInstructorSchema = z.object({
  user_id: z.string().uuid().optional().or(z.literal("")),
  slug: z.string().max(140).optional(),
  full_name: z.string().min(2).max(255),
  gender: z.string().max(20).optional(),
  years_experience: z.number().int().min(0).max(80),
  short_bio: z.string().min(20).max(1200),
  teaching_style: z.string().max(8000).optional(),
  city: z.string().min(2).max(120),
  region: z.string().max(120).optional(),
  service_areas: z.string().max(4000).optional(),
  transmission: z.string().min(3).max(20),
  car_model: z.string().min(2).max(120),
  car_year: z.number().int().min(1950).max(2100).optional(),
  car_features: z.string().max(4000).optional(),
  hourly_price_cents: z.number().int().min(0),
  currency: z.string().min(3).max(10),
  min_lesson_minutes: z.number().int().min(15).max(480),
  special_services: z.string().max(4000).optional(),
  phone: z.string().min(5).max(40),
  telegram: z.string().max(120).optional(),
  profile_image_url: z.string().min(1).max(2000),
  map_embed_url: z.string().max(2000).optional(),
  referral_code: z.string().max(80).optional(),
  promo_code_id: z.string().uuid().optional().or(z.literal("")),
  is_verified: z.boolean(),
  is_active: z.boolean(),
  is_blocked: z.boolean(),
  is_top_rated: z.boolean(),
});

export type AdminDrivingInstructorFormData = z.infer<typeof adminDrivingInstructorSchema>;

export interface DrivingInstructorLeadItem {
  id: string;
  instructor_id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  requested_transmission: string | null;
  comment: string | null;
  source: string;
  status: string;
  created_at: string;
  updated_at: string;
  instructor_name: string | null;
  user_email: string | null;
}

export interface DrivingInstructorComplaintItem {
  id: string;
  instructor_id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  reason: string;
  comment: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  instructor_name: string | null;
  user_email: string | null;
}

export interface DrivingInstructorPromoStatsItem {
  instructor_id: string;
  instructor_name: string;
  promo_code: string | null;
  referral_code: string;
  lead_count: number;
  promo_redemption_count: number;
  view_count: number;
}

export interface DrivingInstructorDashboardTrendPoint {
  date: string;
  views: number;
  leads: number;
  reviews: number;
}

export interface DrivingInstructorSummaryResponse {
  instructor: DrivingInstructorAdmin | null;
  latest_application: DrivingInstructorApplication | null;
  view_trend_7d: DrivingInstructorDashboardTrendPoint[];
}
