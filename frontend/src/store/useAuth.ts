import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { AUTH_SESSION_MARKER } from "@/lib/auth-session";
import { fetchWithSessionRefresh } from "@/lib/fetch-with-session";
import { User } from "@/types/user";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  hydrated: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  signOut: () => void;
  fetchUser: () => Promise<boolean>;
  markHydrated: () => void;
}

function clearPersistedAuthStorage(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem("auth-storage");
  } catch {
    // Ignore storage access failures (private mode / blocked storage).
  }
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

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      hydrated: false,

      setToken: (token) => {
        set({
          token: token ? AUTH_SESSION_MARKER : null,
          user: token ? get().user : null,
        });
      },

      setUser: (user) => set({ user }),

      signOut: () => {
        set({ user: null, token: null });
        invalidateServerSession();
        clearPersistedAuthStorage();
      },

      fetchUser: async () => {
        // Even if token (marker) is missing, we attempt to fetch the user
        // to support recovery from cookies.
        set({ loading: true });
        try {
          // Use the session-aware fetcher which handles automatic refresh
          const response = await fetchWithSessionRefresh("/api/auth/me", {
            method: "GET",
          });

          if (response.status === 401 || response.status === 403) {
            get().signOut();
            return false;
          }

          if (!response.ok) {
            throw new Error(`Auth me failed: ${response.status}`);
          }

          const rawUser = (await response.json()) as Partial<User> & { is_premium?: boolean };
          const plan = rawUser.plan ?? (rawUser.is_premium ? "premium" : "free");
          const isAdmin = rawUser.is_admin === true;

          // If we got a user successfully, ensure the token marker is set (Recovery)
          set({
            token: AUTH_SESSION_MARKER,
            user: {
              ...rawUser,
              plan,
              is_admin: isAdmin,
              is_premium: plan === "premium",
              has_instructor_profile: rawUser.has_instructor_profile === true,
              has_school_profile: rawUser.has_school_profile === true,
            } as User,
          });
          return true;
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("fetchUser failed:", error);
          }
          set({ user: null, token: null });
          clearPersistedAuthStorage();
          return false;
        } finally {
          set({ loading: false });
        }
      },

      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
