"use client";

import { useAuth } from "@/components/providers/auth-provider";

export function useUser() {
  return useAuth();
}
