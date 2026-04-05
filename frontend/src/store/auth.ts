/**
 * AUTOTEST auth compatibility hook.
 * Legacy consumers should read from the canonical cookie-session store only.
 */

import React from "react";
import { useAuth } from "@/store/useAuth";
import type { User } from "@/types/user";

type LegacyAuthState = {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  fetchUser: () => Promise<void>;
  initialize: () => Promise<void>;
};

type Selector<T> = (state: LegacyAuthState) => T;

function buildLegacyAuthState(
  state: ReturnType<typeof useAuth.getState>,
): LegacyAuthState {
  return {
    accessToken: state.token,
    user: state.user,
    isAuthenticated: Boolean(state.token || state.user),
    isLoading: !state.hydrated || state.loading,
    setToken: (token) => state.setToken(token),
    setUser: (user) => state.setUser(user),
    logout: () => state.signOut(),
    fetchUser: async () => {
      await state.fetchUser();
    },
    initialize: async () => {
      if (!state.hydrated || state.loading || state.user) {
        return;
      }

      if (state.token) {
        await state.fetchUser();
      }
    },
  };
}

export function useAuthStore(): LegacyAuthState;
export function useAuthStore<T>(selector: Selector<T>): T;
export function useAuthStore<T>(selector?: Selector<T>) {
  const token = useAuth(state => state.token);
  const user = useAuth(state => state.user);
  const loading = useAuth(state => state.loading);
  const hydrated = useAuth(state => state.hydrated);
  const setToken = useAuth(state => state.setToken);
  const setUser = useAuth(state => state.setUser);
  const signOut = useAuth(state => state.signOut);
  const fetchUser = useAuth(state => state.fetchUser);

  // We memoize the legacy state to avoid creating a new object on every render
  // This object creation combined with `useAuth` was causing the infinite react loop
  const legacyState = React.useMemo<LegacyAuthState>(() => {
    return {
      accessToken: token,
      user: user,
      isAuthenticated: Boolean(token || user),
      isLoading: !hydrated || loading,
      setToken: (t) => setToken(t),
      setUser: (u) => setUser(u),
      logout: () => signOut(),
      fetchUser: async () => {
        await fetchUser();
      },
      initialize: async () => {
        if (!hydrated || loading || user) {
          return;
        }
        if (token) {
          await fetchUser();
        }
      },
    };
  }, [token, user, hydrated, loading, setToken, setUser, signOut, fetchUser]);

  return selector ? selector(legacyState) : (legacyState as T);
}
