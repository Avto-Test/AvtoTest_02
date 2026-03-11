import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { AUTH_SESSION_MARKER } from "@/lib/auth-session";
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
        set({ user: null, token: null, loading: false });
        invalidateServerSession();
        clearPersistedAuthStorage();
      },

      fetchUser: async () => {
        set({ loading: true });
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
              set({ user: null, token: null });
              clearPersistedAuthStorage();
              return false;
            }

            set({ token: AUTH_SESSION_MARKER });
            response = await fetch("/api/auth/me", {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            });
          }

          if (response.status === 401 || response.status === 403) {
            set({ user: null, token: null });
            clearPersistedAuthStorage();
            return false;
          }

          if (!response.ok) {
            throw new Error(`Auth me failed: ${response.status}`);
          }

          const rawUser = (await response.json()) as Partial<User> & { is_premium?: boolean };
          const plan = rawUser.plan ?? (rawUser.is_premium ? "premium" : "free");
          const isAdmin = rawUser.is_admin === true;
          set({
            token: AUTH_SESSION_MARKER,
            user: {
              ...rawUser,
              plan,
              is_admin: isAdmin,
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
