"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { getCurrentUser, logout as logoutRequest } from "@/api/auth";
import { ApiError } from "@/api/client";
import {
  AUTH_EXPIRED_EVENT,
  clearAuthPresenceCookie,
  hasAuthPresenceCookie,
} from "@/lib/auth-session";
import type { User } from "@/types/user";

const AUTH_USER_SNAPSHOT_KEY = "autotest.auth.user.v1";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  sessionPresent: boolean;
  error: unknown;
  refreshUser: () => Promise<User | null>;
  clearUser: () => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_USER_SNAPSHOT_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function writeStoredUser(user: User | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!user) {
    window.localStorage.removeItem(AUTH_USER_SNAPSHOT_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_USER_SNAPSHOT_KEY, JSON.stringify(user));
}

async function hasServerSession() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as { authenticated?: boolean };
    return payload.authenticated === true;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => (hasAuthPresenceCookie() ? readStoredUser() : null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [sessionPresent, setSessionPresent] = useState(() => hasAuthPresenceCookie());
  const userRef = useRef<User | null>(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextUser = await getCurrentUser();
      setUser(nextUser);
      setSessionPresent(true);
      writeStoredUser(nextUser);
      return nextUser;
    } catch (nextError) {
      const nextHasSession = hasAuthPresenceCookie();
      const fallbackUser = userRef.current ?? (nextHasSession ? readStoredUser() : null);
      setSessionPresent(nextHasSession);
      setError(nextError);

      if (nextError instanceof ApiError && (nextError.status === 401 || nextError.status === 403 || !nextHasSession)) {
        setUser(null);
        writeStoredUser(null);
        return null;
      }

      if (fallbackUser) {
        setUser(fallbackUser);
        return fallbackUser;
      }

      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearUser = useCallback(() => {
    setUser(null);
    setSessionPresent(false);
    setLoading(false);
    setError(null);
    writeStoredUser(null);
    clearAuthPresenceCookie();
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearUser();
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  }, [clearUser]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const cookieSession = hasAuthPresenceCookie();
      const cachedUser = cookieSession ? readStoredUser() : null;

      if (cachedUser) {
        setUser(cachedUser);
        setSessionPresent(true);
      }

      const hasSession = cookieSession ? await hasServerSession() : false;

      if (cancelled) {
        return;
      }

      if (!hasSession) {
        setUser(null);
        setSessionPresent(false);
        setLoading(false);
        setError(null);
        writeStoredUser(null);
        return;
      }

      setSessionPresent(true);
      await refreshUser();
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  useEffect(() => {
    const onAuthExpired = () => {
      clearUser();
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
  }, [clearUser]);

  const value = useMemo(
    () => ({
      user,
      loading,
      authenticated: Boolean(user) || sessionPresent,
      sessionPresent,
      error,
      refreshUser,
      clearUser,
      logout,
    }),
    [clearUser, error, loading, logout, refreshUser, sessionPresent, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
