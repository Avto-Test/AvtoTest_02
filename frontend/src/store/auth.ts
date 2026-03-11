/**
 * AUTOTEST Auth Store
 * Legacy Zustand store kept for routes that still depend on initialize/isAuthenticated.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { AUTH_SESSION_MARKER } from "@/lib/auth-session";

type UserResponse = {
  id: string;
  email: string;
  full_name: string | null;
  is_verified: boolean;
  is_active: boolean;
  is_admin: boolean;
  is_premium: boolean;
  created_at: string;
};

interface AuthState {
  accessToken: string | null;
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setToken: (token: string) => void;
  setUser: (user: UserResponse) => void;
  logout: () => void;
  fetchUser: () => Promise<void>;
  initialize: () => Promise<void>;
}

function invalidateServerSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  void fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  }).catch(() => {
    // Best-effort cleanup only.
  });
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setToken: () => {
        set({ accessToken: AUTH_SESSION_MARKER, isAuthenticated: true });
      },

      setUser: (user: UserResponse) => {
        set({ user });
      },

      logout: () => {
        invalidateServerSession();
        set({
          accessToken: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      fetchUser: async () => {
        try {
          let response = await fetch("/api/auth/me", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          });

          if (response.status === 401) {
            const refreshResponse = await fetch("/api/auth/refresh", {
              method: "POST",
              credentials: "include",
              cache: "no-store",
            });

            if (!refreshResponse.ok) {
              set({
                accessToken: null,
                user: null,
                isAuthenticated: false,
                isLoading: false,
              });
              return;
            }

            response = await fetch("/api/auth/me", {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            });
          }

          if (!response.ok) {
            throw new Error(`Auth me failed: ${response.status}`);
          }

          const user = (await response.json()) as UserResponse;
          set({
            user,
            accessToken: AUTH_SESSION_MARKER,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          get().logout();
        }
      },

      initialize: async () => {
        set({ isLoading: true });
        await get().fetchUser();
      },
    }),
    {
      name: "autotest-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
      }),
    },
  ),
);
