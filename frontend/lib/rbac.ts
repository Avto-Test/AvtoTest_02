import type { User } from "@/types/user";

export const SUPER_ADMIN_ROLE = "SuperAdmin";

export function hasRole(user: User | null | undefined, roleName: string) {
  return Array.isArray(user?.roles) && user.roles.includes(roleName);
}

export function isSuperAdmin(user: User | null | undefined) {
  return hasRole(user, SUPER_ADMIN_ROLE);
}
