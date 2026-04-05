import type { User } from "@/types/user";

import { apiRequest } from "@/api/client";

type AuthTokenResponse = {
  access_token: string;
  token_type: string;
};

type MessageResponse = {
  message: string;
};

type VerifyPayload = {
  email: string;
  code: string;
};

const AUTH_REQUEST_TIMEOUT_MS = 10000;
const AUTH_PROFILE_TIMEOUT_MS = 8000;

export async function getCurrentUser() {
  const user = await apiRequest<Omit<User, "plan"> & { is_premium?: boolean }>("/api/auth/me", {
    method: "GET",
    baseUrl: "/",
    timeoutMs: AUTH_PROFILE_TIMEOUT_MS,
  });

  return {
    ...user,
    plan: user.is_premium ? "premium" : "free",
  } as User;
}

export function login(payload: { email: string; password: string }) {
  return apiRequest<AuthTokenResponse>("/api/auth/login", {
    method: "POST",
    body: payload,
    baseUrl: "/",
    retryOnAuth: false,
    timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
  });
}

export function register(payload: { email: string; password: string }) {
  return apiRequest<MessageResponse>("/api/auth/register", {
    method: "POST",
    body: payload,
    baseUrl: "/",
    retryOnAuth: false,
  });
}

export function verifyEmail(payload: VerifyPayload) {
  return apiRequest<MessageResponse>("/api/auth/verify", {
    method: "POST",
    body: payload,
    baseUrl: "/",
    retryOnAuth: false,
  });
}

export function resendVerification(email: string) {
  return apiRequest<MessageResponse>("/api/auth/resend-verification", {
    method: "POST",
    body: { email },
    baseUrl: "/",
    retryOnAuth: false,
  });
}

export function logout() {
  return apiRequest<MessageResponse>("/api/auth/logout", {
    method: "POST",
    baseUrl: "/",
    retryOnAuth: false,
    timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
  });
}
