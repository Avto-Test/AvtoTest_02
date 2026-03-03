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
    timeout: 10000,
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
            toast.error('You do not have permission to perform this action.');
        } else if (status === 500) {
            toast.error('Internal Server Error. Please try again later.');
        } else if (!status) {
            // Network error
            toast.error('Network error. Please check your connection.');
        } else {
            // Other errors (400, 404, etc.) - display specific message if available
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

