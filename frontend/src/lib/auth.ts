/**
 * AUTOTEST Auth API
 * Functions for authentication endpoints
 */

import { api } from './api';

// Request types
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
}

export interface VerifyEmailRequest {
    email: string;
    code: string;
}

// Response types
export interface TokenResponse {
    access_token: string;
    token_type: string;
}

export interface MessageResponse {
    message: string;
}

export interface UserResponse {
    id: string;
    email: string;
    full_name: string | null;
    is_verified: boolean;
    is_active: boolean;
    is_admin: boolean;
    is_premium: boolean;
    created_at: string;
}

// Auth API functions
export async function login(data: LoginRequest): Promise<TokenResponse> {
    console.log('Sending login request to /auth/login', data);
    const response = await api.post<TokenResponse>('/auth/login', data);
    console.log('Login request completed', response);
    return response.data;
}

export async function register(data: RegisterRequest): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>('/auth/register', data);
    return response.data;
}

export async function verifyEmail(data: VerifyEmailRequest): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/auth/verify', data);
    return response.data;
}

export async function getMe(): Promise<UserResponse> {
    const response = await api.get<UserResponse>('/users/me');
    return response.data;
}
