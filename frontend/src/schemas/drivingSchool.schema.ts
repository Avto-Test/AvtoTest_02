import { z } from "zod";

export interface DrivingSchoolCatalogItem {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  city: string;
  region: string | null;
  logo_url: string | null;
  rating_avg: number;
  rating_count: number;
  categories: string[];
  starting_price_cents: number | null;
  currency: string | null;
  min_duration_weeks: number | null;
  referral_code: string;
  promo_code: string | null;
}

export interface DrivingSchoolCatalogResponse {
  total: number;
  offset: number;
  limit: number;
  items: DrivingSchoolCatalogItem[];
}

export interface DrivingSchoolMetaResponse {
  cities: string[];
  regions: string[];
  categories: string[];
}

export interface DrivingSchoolMediaItem {
  id: string;
  media_type: string;
  url: string;
  caption: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface DrivingSchoolCourseItem {
  id: string;
  category_code: string;
  duration_weeks: number | null;
  price_cents: number | null;
  currency: string;
  installment_available: boolean;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface DrivingSchoolReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  is_visible: boolean;
  created_at: string;
  user_display_name: string | null;
}

export interface DrivingSchoolDetail {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  full_description: string | null;
  city: string;
  region: string | null;
  address: string | null;
  landmark: string | null;
  phone: string;
  telegram: string | null;
  website: string | null;
  work_hours: string | null;
  license_info: string | null;
  years_active: number | null;
  logo_url: string | null;
  map_embed_url: string | null;
  referral_code: string;
  promo_code: string | null;
  rating_avg: number;
  rating_count: number;
  courses: DrivingSchoolCourseItem[];
  media_items: DrivingSchoolMediaItem[];
  reviews: DrivingSchoolReviewItem[];
}

export const drivingSchoolLeadSchema = z.object({
  full_name: z.string().min(2).max(255),
  phone: z.string().min(5).max(40),
  requested_category: z.string().max(30).optional(),
  comment: z.string().max(4000).optional(),
});

export type DrivingSchoolLeadFormData = z.infer<typeof drivingSchoolLeadSchema>;

export const drivingSchoolReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(4000).optional(),
});

export type DrivingSchoolReviewFormData = z.infer<typeof drivingSchoolReviewSchema>;

export const partnerApplicationSchema = z.object({
  school_name: z.string().min(2).max(255),
  city: z.string().min(2).max(120),
  responsible_person: z.string().min(2).max(255),
  phone: z.string().min(5).max(40),
  email: z.string().email(),
  note: z.string().max(4000).optional(),
});

export type PartnerApplicationFormData = z.infer<typeof partnerApplicationSchema>;

export interface AdminDrivingSchool {
  id: string;
  owner_user_id: string | null;
  slug: string;
  name: string;
  short_description: string | null;
  full_description: string | null;
  city: string;
  region: string | null;
  address: string | null;
  landmark: string | null;
  phone: string;
  telegram: string | null;
  website: string | null;
  work_hours: string | null;
  license_info: string | null;
  years_active: number | null;
  logo_url: string | null;
  map_embed_url: string | null;
  referral_code: string;
  promo_code_id: string | null;
  promo_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  lead_count: number;
  review_count: number;
  rating_avg: number;
  promo_redemption_count: number;
  courses: DrivingSchoolCourseItem[];
  media_items: DrivingSchoolMediaItem[];
}

export const adminDrivingSchoolSchema = z.object({
  owner_user_id: z.string().uuid().optional().or(z.literal("")),
  slug: z.string().max(140).optional(),
  name: z.string().min(2).max(255),
  short_description: z.string().max(500).optional(),
  full_description: z.string().max(8000).optional(),
  city: z.string().min(2).max(120),
  region: z.string().max(120).optional(),
  address: z.string().max(500).optional(),
  landmark: z.string().max(255).optional(),
  phone: z.string().min(5).max(40),
  telegram: z.string().max(120).optional(),
  website: z.string().max(255).optional(),
  work_hours: z.string().max(255).optional(),
  license_info: z.string().max(255).optional(),
  years_active: z.number().int().min(0).max(100).optional(),
  logo_url: z.string().max(1000).optional(),
  map_embed_url: z.string().max(2000).optional(),
  referral_code: z.string().max(80).optional(),
  promo_code_id: z.string().uuid().optional().or(z.literal("")),
  is_active: z.boolean(),
});

export type AdminDrivingSchoolFormData = z.infer<typeof adminDrivingSchoolSchema>;

export const adminDrivingSchoolCourseSchema = z.object({
  category_code: z.string().min(1).max(20),
  duration_weeks: z.number().int().min(1).max(520).optional(),
  price_cents: z.number().int().min(0).optional(),
  currency: z.string().min(3).max(10),
  installment_available: z.boolean(),
  description: z.string().max(4000).optional(),
  is_active: z.boolean(),
  sort_order: z.number().int(),
});

export type AdminDrivingSchoolCourseFormData = z.infer<typeof adminDrivingSchoolCourseSchema>;

export const adminDrivingSchoolMediaSchema = z.object({
  media_type: z.string().max(20),
  url: z.string().min(1).max(2000),
  caption: z.string().max(255).optional(),
  is_active: z.boolean(),
  sort_order: z.number().int(),
});

export type AdminDrivingSchoolMediaFormData = z.infer<typeof adminDrivingSchoolMediaSchema>;

export interface AdminDrivingSchoolLead {
  id: string;
  school_id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  requested_category: string | null;
  comment: string | null;
  source: string;
  status: string;
  created_at: string;
  updated_at: string;
  school_name: string | null;
  user_email: string | null;
}

export interface DrivingSchoolPartnerApplication {
  id: string;
  user_id: string | null;
  school_name: string;
  city: string;
  responsible_person: string;
  phone: string;
  email: string;
  note: string | null;
  status: string;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DrivingSchoolPromoStatsItem {
  school_id: string;
  school_name: string;
  promo_code: string | null;
  referral_code: string;
  lead_count: number;
  promo_redemption_count: number;
}

export interface DrivingSchoolOwnerSummary {
  school: AdminDrivingSchool | null;
  latest_application: DrivingSchoolPartnerApplication | null;
}
