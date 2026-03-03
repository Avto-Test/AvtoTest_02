/**
 * AUTOTEST Auth Schemas
 * Zod validation schemas for auth forms
 */

import { z } from 'zod';

export const loginSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z
        .string()
        .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

export const verifyEmailSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address'),
    code: z
        .string()
        .length(6, 'Verification code must be 6 digits')
        .regex(/^\d+$/, 'Verification code must contain only numbers'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;
