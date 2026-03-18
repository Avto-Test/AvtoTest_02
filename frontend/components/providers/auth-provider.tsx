"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getCurrentUser, logout as logoutRequest } from "@/api/auth";
import { AUTH_EXPIRED_EVENT, AUTH_PRESENCE_COOKIE } from "@/lib/auth-session";
import type { User } from "@/types/user";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  refreshUser: () => Promise<User | null>;
  clearUser: () => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function hasAuthPresenceCookie() {
  if (typeof document === "undefined") {
    return false;
  }

  return document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .some((entry) => entry === `${AUTH_PRESENCE_COOKIE}=1`);
}

function clearAuthPresenceCookie() {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${AUTH_PRESENCE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const nextUser = await getCurrentUser();
      setUser(nextUser);
      return nextUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearUser = useCallback(() => {
    setUser(null);
    setLoading(false);
    clearAuthPresenceCookie();
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearUser();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }, [clearUser]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const hasSession = hasAuthPresenceCookie() ? await hasServerSession() : false;

      if (cancelled) {
        return;
      }

      if (!hasSession) {
        setUser(null);
        setLoading(false);
        return;
      }

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
      authenticated: Boolean(user),
      refreshUser,
      clearUser,
      logout,
    }),
    [clearUser, loading, logout, refreshUser, user],
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
