import type { User } from "@/types/user";

import { apiRequest } from "@/api/client";

export function getMe() {
  return apiRequest<Omit<User, "plan"> & { is_premium?: boolean }>("/users/me", {
    method: "GET",
  }).then((user) => ({
    ...user,
    plan: user.is_premium ? "premium" : "free",
  }) as User);
}
