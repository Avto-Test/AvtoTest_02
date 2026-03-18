import type {
  InstructorAdminProfile,
  InstructorApplication,
  InstructorLead,
  InstructorMedia,
  InstructorRegistrationSettings,
  InstructorReview,
} from "@/types/instructor";
import type {
  SchoolAdminProfile,
  SchoolCourse,
  SchoolLead,
  SchoolMedia,
  SchoolPartnerApplication,
  SchoolReview,
} from "@/types/school";

export interface AdminAnalyticsSummary {
  total_users: number;
  premium_users: number;
  free_users: number;
  total_tests: number;
  total_attempts: number;
}

export interface AdminTopTestAnalytics {
  test_id: string;
  title: string;
  attempts_count: number;
  average_score: number;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_admin: boolean;
  is_premium: boolean;
  created_at: string;
  subscription_plan?: string | null;
  subscription_status?: string | null;
  subscription_expires_at?: string | null;
}

export interface AdminUserUpdatePayload {
  is_active?: boolean;
  is_verified?: boolean;
  is_admin?: boolean;
}

export interface AdminUserSubscriptionPayload {
  plan: string;
  status: string;
  expires_at?: string | null;
}

export interface AdminTestListItem {
  id: string;
  title: string;
  description?: string | null;
  difficulty: string;
  is_active: boolean;
  is_premium: boolean;
  duration?: number | null;
}

export interface AdminTestPayload {
  title: string;
  description?: string | null;
  difficulty: string;
  is_active: boolean;
  is_premium: boolean;
  duration?: number | null;
}

export interface AdminAnswerOption {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
}

export interface AdminAnswerOptionPayload {
  text: string;
  is_correct: boolean;
}

export interface AdminQuestionListItem {
  id: string;
  test_id?: string | null;
  text: string;
  image_url?: string | null;
  video_url?: string | null;
  media_type: string;
  topic?: string | null;
  category?: string | null;
  category_id?: string | null;
  difficulty: string;
  difficulty_percent: number;
  answer_options: AdminAnswerOption[];
}

export interface AdminQuestionPayload {
  text: string;
  image_url?: string | null;
  video_url?: string | null;
  media_type: string;
  topic?: string | null;
  category?: string | null;
  category_id?: string | null;
  difficulty: string;
  difficulty_percent: number;
}

export interface AdminTestDetail extends AdminTestListItem {
  questions: AdminQuestionListItem[];
}

export interface AdminQuestionCategory {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminQuestionCategoryPayload {
  name: string;
  description?: string | null;
  is_active: boolean;
}

export interface AdminLesson {
  id: string;
  title: string;
  description?: string | null;
  content_type: string;
  content_url: string;
  thumbnail_url?: string | null;
  topic?: string | null;
  section?: string | null;
  is_active: boolean;
  is_premium: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AdminLessonPayload {
  title: string;
  description?: string | null;
  content_type: string;
  content_url: string;
  thumbnail_url?: string | null;
  topic?: string | null;
  section?: string | null;
  is_active: boolean;
  is_premium: boolean;
  sort_order: number;
}

export interface AdminUploadedAsset {
  url: string;
  filename: string;
  content_type?: string;
  size_bytes?: number;
}

export interface AdminSubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  duration_days: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AdminSubscriptionPlanPayload {
  code: string;
  name: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  duration_days: number;
  is_active: boolean;
  sort_order: number;
}

export interface AdminPromoCode {
  id: string;
  code: string;
  name?: string | null;
  description?: string | null;
  discount_type: string;
  discount_value: number;
  school_id?: string | null;
  group_id?: string | null;
  max_redemptions?: number | null;
  max_uses?: number | null;
  redeemed_count: number;
  current_uses: number;
  starts_at?: string | null;
  expires_at?: string | null;
  is_active: boolean;
  applicable_plan_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface AdminPromoCodePayload {
  code: string;
  name?: string | null;
  description?: string | null;
  discount_type: string;
  discount_value: number;
  school_id?: string | null;
  group_id?: string | null;
  max_redemptions?: number | null;
  max_uses?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  is_active: boolean;
  applicable_plan_ids: string[];
}

export interface AdminViolationLog {
  id: string;
  user_id?: string | null;
  guest_id?: string | null;
  test_id?: string | null;
  attempt_id?: string | null;
  event_type: string;
  details: Record<string, unknown>;
  created_at: string;
  user_email?: string | null;
  test_title?: string | null;
}

export interface AdminDrivingSchoolPayload {
  owner_user_id?: string | null;
  slug?: string | null;
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
  referral_code?: string | null;
  promo_code_id?: string | null;
  is_active: boolean;
}

export interface AdminDrivingSchoolCoursePayload {
  category_code: string;
  duration_weeks?: number | null;
  price_cents?: number | null;
  currency: string;
  installment_available: boolean;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface AdminDrivingSchoolMediaPayload {
  media_type: string;
  url: string;
  caption?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface AdminDrivingSchoolLeadPayload {
  status: string;
}

export interface AdminDrivingSchoolPartnerApplicationPayload {
  status: string;
}

export interface AdminDrivingSchoolReviewPayload {
  is_visible?: boolean;
  rating?: number | null;
  comment?: string | null;
}

export interface AdminDrivingSchoolPromoStatsItem {
  school_id: string;
  school_name: string;
  promo_code?: string | null;
  referral_code: string;
  lead_count: number;
  promo_redemption_count: number;
}

export interface AdminDrivingInstructorPayload {
  user_id?: string | null;
  slug?: string | null;
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
  referral_code?: string | null;
  promo_code_id?: string | null;
  is_verified: boolean;
  is_active: boolean;
  is_blocked: boolean;
  is_top_rated: boolean;
}

export interface AdminDrivingInstructorMediaPayload {
  media_type: string;
  url: string;
  caption?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface AdminDrivingInstructorApplicationPayload {
  status: string;
  rejection_reason?: string | null;
}

export interface AdminDrivingInstructorLeadPayload {
  status: string;
}

export interface AdminDrivingInstructorReviewPayload {
  is_visible?: boolean;
  rating?: number | null;
  comment?: string | null;
}

export interface AdminDrivingInstructorComplaintPayload {
  status: string;
}

export interface AdminDrivingInstructorRegistrationSettingsPayload {
  is_paid_enabled?: boolean;
  price_cents?: number | null;
  currency?: string;
  validity_days?: number | null;
  discount_percent?: number | null;
  campaign_title?: string | null;
  campaign_description?: string | null;
  free_banner_enabled?: boolean;
  countdown_enabled?: boolean;
  countdown_ends_at?: string | null;
}

export interface AdminDrivingInstructorPromoStatsItem {
  instructor_id: string;
  instructor_name: string;
  promo_code?: string | null;
  referral_code: string;
  lead_count: number;
  promo_redemption_count: number;
  view_count: number;
}

export interface AdminDashboardData {
  analytics: AdminAnalyticsSummary | null;
  users: AdminUserListItem[];
  tests: AdminTestListItem[];
  questions: AdminQuestionListItem[];
  schools: SchoolAdminProfile[];
  instructors: InstructorAdminProfile[];
  schoolApplications: SchoolPartnerApplication[];
  instructorApplications: InstructorApplication[];
  schoolLeads: SchoolLead[];
  instructorLeads: InstructorLead[];
  unavailableSections: string[];
}

export interface AdminContentData {
  tests: AdminTestListItem[];
  lessons: AdminLesson[];
  questions: AdminQuestionListItem[];
  categories: AdminQuestionCategory[];
}

export interface AdminBillingData {
  plans: AdminSubscriptionPlan[];
  promos: AdminPromoCode[];
}

export interface AdminDrivingSchoolsData {
  schools: SchoolAdminProfile[];
  leads: SchoolLead[];
  applications: SchoolPartnerApplication[];
  reviews: SchoolReview[];
  promoStats: AdminDrivingSchoolPromoStatsItem[];
}

export interface AdminDrivingInstructorsData {
  instructors: InstructorAdminProfile[];
  applications: InstructorApplication[];
  leads: InstructorLead[];
  reviews: InstructorReview[];
  complaints: {
    id: string;
    instructor_id: string;
    user_id?: string | null;
    full_name: string;
    phone?: string | null;
    reason: string;
    comment?: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    instructor_name?: string | null;
    user_email?: string | null;
  }[];
  registrationSettings: InstructorRegistrationSettings | null;
  promoStats: AdminDrivingInstructorPromoStatsItem[];
}

export type AdminSchoolCourse = SchoolCourse;
export type AdminSchoolMedia = SchoolMedia;
export type AdminInstructorMedia = InstructorMedia;
