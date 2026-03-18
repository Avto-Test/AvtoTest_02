export type Plan = "free" | "premium";

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  is_admin: boolean;
  is_verified: boolean;
  is_active: boolean;
  is_premium: boolean;
  has_instructor_profile: boolean;
  has_school_profile: boolean;
  created_at: string;
  plan: Plan;
}
