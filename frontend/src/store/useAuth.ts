import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User } from "@/types/user";
import api from "@/lib/axios";
import Cookies from "js-cookie";

interface AuthState {
    user: User | null;
    token: string | null;
    loading: boolean;
    hydrated: boolean;
    setToken: (token: string | null) => void;
    setUser: (user: User | null) => void;
    signOut: () => void;
    fetchUser: () => Promise<void>;
    markHydrated: () => void;
}

const AUTH_COOKIE_KEY = "access_token";

function syncAuthCookie(token: string | null): void {
    if (typeof window === "undefined") {
        return;
    }

    if (!token) {
        Cookies.remove(AUTH_COOKIE_KEY);
        return;
    }

    const isHttps = window.location.protocol === "https:";
    Cookies.set(AUTH_COOKIE_KEY, token, {
        expires: 7,
        secure: isHttps,
        sameSite: "strict",
    });
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

export const useAuth = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            loading: false,
            hydrated: false,

            setToken: (token) => {
                set({ token, user: null });
                syncAuthCookie(token);
            },

            setUser: (user) => set({ user }),

            signOut: () => {
                set({ user: null, token: null });
                try {
                    syncAuthCookie(null);
                } catch {
                    // Ignore cookie cleanup failures to avoid unhandled promise chains.
                }
                clearPersistedAuthStorage();
            },

            fetchUser: async () => {
                const { token } = get();
                if (!token) return;

                set({ loading: true });
                try {
                    const res = await api.get("/auth/me", {
                        // Treat 401/403 as handled flow instead of rejected promise.
                        validateStatus: (status) => status >= 200 && status < 300 || status === 401 || status === 403,
                    });
                    if (res.status === 401 || res.status === 403) {
                        try {
                            get().signOut();
                        } catch {
                            // Never rethrow from auth recovery flow.
                        }
                        return;
                    }
                    const rawUser = res.data as Partial<User> & { is_premium?: boolean };
                    const plan = rawUser.plan ?? (rawUser.is_premium ? "premium" : "free");
                    const isAdmin = rawUser.is_admin === true;
                    set({
                        user: {
                            ...rawUser,
                            plan,
                            is_admin: isAdmin,
                            has_instructor_profile: rawUser.has_instructor_profile === true,
                            has_school_profile: rawUser.has_school_profile === true,
                        } as User,
                    });
                } catch (error) {
                    const status = (error as { response?: { status?: number } })?.response?.status;
                    if (status === 401 || status === 403) {
                        // Token expired/invalid: clear persisted auth state silently.
                        try {
                            get().signOut();
                        } catch {
                            // Never rethrow from auth recovery flow.
                        }
                        return;
                    }
                    if (process.env.NODE_ENV !== "production") {
                        // Keep UI stable on transient failures (network/backend restart).
                        console.warn("fetchUser failed:", error);
                    }
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
                if (state) {
                    syncAuthCookie(state.token);
                    state.markHydrated();
                }
            },
        }
    )
);
