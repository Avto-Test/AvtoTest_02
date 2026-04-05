import type {
  DrivingInstructorApplicationStatus,
  DrivingInstructorLeadStatus,
} from "@/types/statuses";

export interface InstructorListItem {
  id: string;
  slug: string;
  full_name: string;
  profile_image_url?: string | null;
  years_experience: number;
  transmission: string;
  car_model: string;
  city: string;
  region?: string | null;
  hourly_price_cents: number;
  currency: string;
  rating_avg: number;
  review_count: number;
  is_new: boolean;
  is_top_rated: boolean;
}

export interface InstructorMeta {
  cities: string[];
  regions: string[];
  transmissions: string[];
  genders: string[];
}

export interface InstructorMedia {
  id: string;
  media_type: string;
  url: string;
  caption?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface InstructorReview {
  id: string;
  rating: number;
  comment?: string | null;
  is_visible: boolean;
  created_at: string;
  user_display_name?: string | null;
}

export interface InstructorDetail {
  id: string;
  slug: string;
  full_name: string;
  gender?: string | null;
  years_experience: number;
  short_bio: string;
  teaching_style?: string | null;
  city: string;
  region?: string | null;
  service_areas?: string | null;
  transmission: string;
  car_model: string;
  car_year?: number | null;
  car_features?: string | null;
  hourly_price_cents: number;
  currency: string;
  min_lesson_minutes: number;
  special_services?: string | null;
  phone: string;
  telegram?: string | null;
  profile_image_url: string;
  map_embed_url?: string | null;
  referral_code: string;
  promo_code?: string | null;
  view_count: number;
  views_last_24h: number;
  lead_count: number;
  is_most_selected: boolean;
  is_top_rated: boolean;
  rating_avg: number;
  review_count: number;
  review_distribution: Record<string, number>;
  media_items: InstructorMedia[];
  reviews: InstructorReview[];
  disclaimer: string;
}

export interface InstructorCatalogResponse {
  total: number;
  offset: number;
  limit: number;
  items: InstructorListItem[];
}

export interface InstructorLeadCreate {
  full_name: string;
  phone: string;
  requested_transmission?: string | null;
  comment?: string | null;
}

export interface InstructorLead {
  id: string;
  instructor_id: string;
  user_id?: string | null;
  full_name: string;
  phone: string;
  requested_transmission?: string | null;
  comment?: string | null;
  source: string;
  status: DrivingInstructorLeadStatus;
  created_at: string;
  updated_at: string;
  instructor_name?: string | null;
  user_email?: string | null;
}

export interface InstructorComplaintCreate {
  full_name: string;
  phone?: string | null;
  reason: string;
  comment?: string | null;
}

export interface InstructorApplicationCreate {
  full_name: string;
  phone: string;
  city: string;
  region?: string | null;
  gender?: string | null;
  years_experience: number;
  transmission: string;
  car_model: string;
  hourly_price_cents: number;
  currency: string;
  short_bio: string;
  profile_image_url: string;
  extra_image_urls: string[];
}

export interface InstructorApplication {
  id: string;
  user_id?: string | null;
  linked_instructor_id?: string | null;
  full_name: string;
  phone: string;
  city: string;
  region?: string | null;
  gender?: string | null;
  years_experience: number;
  transmission: string;
  car_model: string;
  hourly_price_cents: number;
  currency: string;
  short_bio: string;
  profile_image_url: string;
  extra_image_urls: string[];
  status: DrivingInstructorApplicationStatus;
  rejection_reason?: string | null;
  reviewed_by_id?: string | null;
  reviewed_at?: string | null;
  submitted_from: string;
  created_at: string;
  updated_at: string;
  user_email?: string | null;
}

export interface InstructorRegistrationSettings {
  is_paid_enabled: boolean;
  price_cents: number;
  currency: string;
  validity_days: number;
  discount_percent: number;
  campaign_title?: string | null;
  campaign_description?: string | null;
  free_banner_enabled: boolean;
  countdown_enabled: boolean;
  countdown_ends_at?: string | null;
  updated_at: string;
}

export interface InstructorAdminProfile extends InstructorDetail {
  user_id?: string | null;
  promo_code_id?: string | null;
  is_verified: boolean;
  is_active: boolean;
  is_blocked: boolean;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
  lead_count: number;
  promo_redemption_count: number;
}

export interface InstructorProfileUpdate {
  full_name?: string;
  gender?: string | null;
  years_experience?: number | null;
  short_bio?: string;
  teaching_style?: string | null;
  city?: string;
  region?: string | null;
  service_areas?: string | null;
  transmission?: string;
  car_model?: string;
  car_year?: number | null;
  car_features?: string | null;
  hourly_price_cents?: number | null;
  currency?: string;
  min_lesson_minutes?: number | null;
  special_services?: string | null;
  phone?: string;
  telegram?: string | null;
  profile_image_url?: string;
  map_embed_url?: string | null;
}

export interface InstructorMediaCreate {
  media_type: string;
  url: string;
  caption?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface InstructorTrendPoint {
  date: string;
  views: number;
  leads: number;
  reviews: number;
}

export interface InstructorOwnerSummary {
  instructor: InstructorAdminProfile | null;
  latest_application: InstructorApplication | null;
  view_trend_7d: InstructorTrendPoint[];
}

export interface UploadedMedia {
  url: string;
  filename: string;
}
