import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { useAuth } from "@/store/useAuth";

// Extend AxiosRequestConfig to include our custom property
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    _handled401?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL && process.env.NODE_ENV === "development") {
    console.warn("NEXT_PUBLIC_API_URL is not defined in environment variables.");
}

const api: AxiosInstance = axios.create({
    baseURL: API_URL || "http://localhost:8000",
    timeout: 20000,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor to attach token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = useAuth.getState().token;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._handled401) {
            originalRequest._handled401 = true;

            const { token, signOut } = useAuth.getState();

            // Only trigger signOut if we actually had a token (avoid loops on unauth requests)
            if (token) {
                signOut();
            }
        }

        return Promise.reject(error);
    }
);

export default api;
