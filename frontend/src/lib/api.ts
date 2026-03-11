/**
 * AUTOTEST API Client
 * Axios instance with auth refresh and global error handling.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";

import { refreshAuthSession } from "@/lib/fetch-with-session";
import { useAuth } from "@/store/useAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE || "/api";

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _handled401?: boolean;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => config,
  (error: AxiosError) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url ?? "");
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;
    const isAuthFlowRequest =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/verify") ||
      requestUrl.includes("/auth/resend-verification") ||
      requestUrl.includes("/auth/forgot-password") ||
      requestUrl.includes("/auth/reset-password") ||
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/logout");

    if (status === 401 && originalRequest && !originalRequest._handled401 && !isAuthFlowRequest) {
      originalRequest._handled401 = true;
      const refreshed = await refreshAuthSession();
      if (refreshed) {
        return api.request(originalRequest);
      }
    }

    const errorMessage = getErrorMessage(error);

    const isPaymentFlowRequest =
      requestUrl.includes("/api/payments/create-session") ||
      requestUrl.includes("/api/payments/quote") ||
      requestUrl.includes("/api/payments/redeem-promo") ||
      requestUrl.includes("/payments/create-session") ||
      requestUrl.includes("/payments/quote") ||
      requestUrl.includes("/payments/redeem-promo");

    if (status === 401) {
      const { token, signOut } = useAuth.getState();
      if (token) {
        signOut();
      }
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (!path.startsWith("/login") && !path.startsWith("/register") && !path.startsWith("/verify")) {
          toast.error("Session expired. Please login again.");
          setTimeout(() => {
            window.location.href = "/login";
          }, 1500);
        }
      }
    } else if (status === 403) {
      if (isAuthFlowRequest || isPaymentFlowRequest) {
        return Promise.reject(error);
      }
      toast.error("You do not have permission to perform this action.");
    } else if (status === 409) {
      if (isPaymentFlowRequest || isAuthFlowRequest) {
        return Promise.reject(error);
      }
      toast.error(errorMessage);
    } else if (status === 502 || status === 503) {
      if (isPaymentFlowRequest) {
        return Promise.reject(error);
      }
      toast.error(errorMessage);
    } else if (status === 500) {
      toast.error("Internal Server Error. Please try again later.");
    } else if (!status) {
      toast.error("Network error. Please check your connection.");
    } else {
      if (isPaymentFlowRequest || isAuthFlowRequest) {
        return Promise.reject(error);
      }
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  },
);

export interface ApiError {
  detail: string;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    const detail = axiosError.response?.data?.detail;
    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg).join(", ");
    }
    return (detail as string) || axiosError.message || "An unexpected error occurred";
  }
  return "An unexpected error occurred";
}
