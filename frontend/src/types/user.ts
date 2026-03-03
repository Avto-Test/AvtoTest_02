export type Plan = "free" | "premium";

export interface User {
    id: string;
    email: string;
    full_name?: string;
    is_admin: boolean;
    plan: Plan;
    has_instructor_profile?: boolean;
    has_school_profile?: boolean;
}
