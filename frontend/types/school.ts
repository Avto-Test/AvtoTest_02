import type {
  DrivingSchoolLeadStatus,
  DrivingSchoolPartnerApplicationStatus,
} from "@/types/statuses";

export interface SchoolListItem {
  id: string;
  slug: string;
  name: string;
  short_description?: string | null;
  city: string;
  region?: string | null;
  logo_url?: string | null;
  rating_avg: number;
  rating_count: number;
  categories: string[];
  starting_price_cents?: number | null;
  currency?: string | null;
  min_duration_weeks?: number | null;
  referral_code: string;
  promo_code?: string | null;
}

export interface SchoolMeta {
  cities: string[];
  regions: string[];
  categories: string[];
}

export interface SchoolCourse {
  id: string;
  category_code: string;
  duration_weeks?: number | null;
  price_cents?: number | null;
  currency: string;
  installment_available: boolean;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface SchoolMedia {
  id: string;
  media_type: string;
  url: string;
  caption?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface SchoolReview {
  id: string;
  rating: number;
  comment?: string | null;
  is_visible: boolean;
  created_at: string;
  user_display_name?: string | null;
}

export interface SchoolDetail {
  id: string;
  slug: string;
  name: string;
  short_description?: string | null;
  full_description?: string | null;
  city: string;
  region?: string | null;
  address?: string | null;
  landmark?: string | null;
  phone: string;
  telegram?: string | null;
  website?: string | null;
  work_hours?: string | null;
  license_info?: string | null;
  years_active?: number | null;
  logo_url?: string | null;
  map_embed_url?: string | null;
  referral_code: string;
  promo_code?: string | null;
  rating_avg: number;
  rating_count: number;
  courses: SchoolCourse[];
  media_items: SchoolMedia[];
  reviews: SchoolReview[];
}

export interface SchoolCatalogResponse {
  total: number;
  offset: number;
  limit: number;
  items: SchoolListItem[];
}

export interface SchoolLeadCreate {
  full_name: string;
  phone: string;
  requested_category?: string | null;
  comment?: string | null;
}

export interface SchoolLead {
  id: string;
  school_id: string;
  user_id?: string | null;
  full_name: string;
  phone: string;
  requested_category?: string | null;
  comment?: string | null;
  source: string;
  status: DrivingSchoolLeadStatus;
  created_at: string;
  updated_at: string;
  school_name?: string | null;
  user_email?: string | null;
}

export interface SchoolPartnerApplicationCreate {
  school_name: string;
  city: string;
  responsible_person: string;
  phone: string;
  email: string;
  note?: string | null;
}

export interface SchoolPartnerApplication {
  id: string;
  user_id?: string | null;
  linked_school_id?: string | null;
  school_name: string;
  city: string;
  responsible_person: string;
  phone: string;
  email: string;
  note?: string | null;
  status: DrivingSchoolPartnerApplicationStatus;
  reviewed_by_id?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SchoolAdminProfile extends SchoolDetail {
  owner_user_id?: string | null;
  promo_code_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  lead_count: number;
  review_count: number;
  promo_redemption_count: number;
}

export interface SchoolProfileUpdate {
  name?: string;
  short_description?: string | null;
  full_description?: string | null;
  city?: string;
  region?: string | null;
  address?: string | null;
  landmark?: string | null;
  phone?: string;
  telegram?: string | null;
  website?: string | null;
  work_hours?: string | null;
  license_info?: string | null;
  years_active?: number | null;
  logo_url?: string | null;
  map_embed_url?: string | null;
}

export interface SchoolMediaCreate {
  media_type: string;
  url: string;
  caption?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface SchoolOwnerSummary {
  school: SchoolAdminProfile | null;
  latest_application: SchoolPartnerApplication | null;
}

export interface SchoolRbacDashboard {
  school_id: string;
  school_name: string;
  active_role: string;
  member_count: number;
  group_count: number;
  lead_count: number;
}

export interface UploadedSchoolMedia {
  url: string;
  filename: string;
}
