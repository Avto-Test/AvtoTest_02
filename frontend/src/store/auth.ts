/**
 * AUTOTEST Auth Store
 * Zustand store for authentication state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { getMe, UserResponse } from '@/lib/auth';

interface AuthState {
    accessToken: string | null;
    user: UserResponse | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Actions
    setToken: (token: string) => void;
    setUser: (user: UserResponse) => void;
    logout: () => void;
    fetchUser: () => Promise<void>;
    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            accessToken: null,
            user: null,
            isAuthenticated: false,
            isLoading: true,

            setToken: (token: string) => {
                const isHttps =
                    typeof window !== 'undefined'
                        ? window.location.protocol === 'https:'
                        : process.env.NODE_ENV === 'production';
                Cookies.set('access_token', token, {
                    expires: 7,
                    secure: isHttps,
                    sameSite: 'lax'
                });
                set({ accessToken: token, isAuthenticated: true });
            },

            setUser: (user: UserResponse) => {
                set({ user });
            },

            logout: () => {
                Cookies.remove('access_token');
                set({
                    accessToken: null,
                    user: null,
                    isAuthenticated: false
                });
            },

            fetchUser: async () => {
                try {
                    const user = await getMe();
                    set({ user, isAuthenticated: true, isLoading: false });
                } catch {
                    get().logout();
                    set({ isLoading: false });
                }
            },

            initialize: async () => {
                const token = Cookies.get('access_token');

                if (token) {
                    set({ accessToken: token });
                    await get().fetchUser();
                } else {
                    set({ isLoading: false });
                }
            },
        }),
        {
            name: 'autotest-auth',
            partialize: (state) => ({
                accessToken: state.accessToken
            }),
        }
    )
);
