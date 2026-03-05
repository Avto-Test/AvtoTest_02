/**
 * AUTOTEST API Client
 * Axios instance with interceptors for auth and global error handling
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { useAuth } from '@/store/useAuth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 20000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = useAuth.getState().token ?? Cookies.get('access_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        const status = error.response?.status;
        const errorMessage = getErrorMessage(error);
        const requestUrl = String(error.config?.url ?? "");

        // Auth flow requests handle their own error display (login/register pages).
        const isAuthFlowRequest =
            requestUrl.includes("/auth/login")
            || requestUrl.includes("/auth/register")
            || requestUrl.includes("/auth/verify")
            || requestUrl.includes("/auth/resend-verification")
            || requestUrl.includes("/auth/forgot-password")
            || requestUrl.includes("/auth/reset-password");

        // Payment flow requests handle errors via component state (setError/setPromoError).
        // Suppress global toast to avoid duplicate error display on upgrade page.
        const isPaymentFlowRequest =
            requestUrl.includes("/api/payments/create-session")
            || requestUrl.includes("/api/payments/quote")
            || requestUrl.includes("/api/payments/redeem-promo")
            || requestUrl.includes("/payments/create-session")
            || requestUrl.includes("/payments/quote")
            || requestUrl.includes("/payments/redeem-promo");

        if (status === 401) {
            // Clear cookie and zustand auth state on auth error
            Cookies.remove('access_token');
            const { token, signOut } = useAuth.getState();
            if (token) {
                signOut();
            }
            if (typeof window !== 'undefined') {
                // Only redirect if not already on login/register/verify pages
                const path = window.location.pathname;
                if (!path.startsWith('/login') && !path.startsWith('/register') && !path.startsWith('/verify')) {
                    toast.error('Session expired. Please login again.');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 1500);
                }
            }
        } else if (status === 403) {
            // Auth and payment flow pages handle 403 themselves.
            if (isAuthFlowRequest || isPaymentFlowRequest) {
                return Promise.reject(error);
            }
            toast.error('You do not have permission to perform this action.');
        } else if (status === 409) {
            // Conflict (e.g. already premium) — let payment/auth pages handle it.
            if (isPaymentFlowRequest || isAuthFlowRequest) {
                return Promise.reject(error);
            }
            toast.error(errorMessage);
        } else if (status === 502 || status === 503) {
            // Provider unavailable — payment page shows its own message.
            if (isPaymentFlowRequest) {
                return Promise.reject(error);
            }
            toast.error(errorMessage);
        } else if (status === 500) {
            toast.error('Internal Server Error. Please try again later.');
        } else if (!status) {
            // Network error
            toast.error('Network error. Please check your connection.');
        } else {
            // Other errors (400, 404, etc.)
            if (isPaymentFlowRequest || isAuthFlowRequest) {
                return Promise.reject(error);
            }
            toast.error(errorMessage);
        }

        return Promise.reject(error);
    }
);

export interface ApiError {
    detail: string;
}

export function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiError>;
        // Handle array of errors or string
        const detail = axiosError.response?.data?.detail;
        if (Array.isArray(detail)) {
            // If it's a validation error array (FastAPI default)
            return detail.map(e => e.msg).join(', ');
        }
        return (detail as string) || axiosError.message || 'An unexpected error occurred';
    }
    return 'An unexpected error occurred';
}
