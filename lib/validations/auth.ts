/**
 * Authentication Validation Schemas
 *
 * Uses Zod for type-safe validation of user inputs.
 * These schemas are used on both client and server.
 */

import { z } from "zod";

// ============================================
// SHARED FIELD VALIDATORS
// ============================================

const emailField = z
	.string()
	.email("Please enter a valid email")
	.max(255, "Email is too long")
	.transform((val) => val.toLowerCase().trim());

const passwordField = z
	.string()
	.min(8, "Password must be at least 8 characters")
	.max(128, "Password is too long")
	.regex(/[A-Z]/, "Password needs an uppercase letter")
	.regex(/[a-z]/, "Password needs a lowercase letter")
	.regex(/[0-9]/, "Password needs a number")
	.regex(/[^A-Za-z0-9]/, "Password needs a special character");

const nameField = z
	.string()
	.min(2, "Name must be at least 2 characters")
	.max(100, "Name is too long")
	.regex(/^[a-zA-Z\s\-']+$/, "Name contains invalid characters")
	.transform((val) => val.trim());

// ============================================
// FORM SCHEMAS
// ============================================

/**
 * Login form validation
 */
export const loginSchema = z.object({
	email: emailField,
	password: z.string().min(1, "Password is required").max(128),
});

/**
 * Registration form validation
 */
export const registerSchema = z
	.object({
		name: nameField,
		email: emailField,
		password: passwordField,
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

/**
 * Forgot password form validation
 */
export const forgotPasswordSchema = z.object({
	email: emailField,
});

/**
 * Reset password form validation
 */
export const resetPasswordSchema = z
	.object({
		password: passwordField,
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

// ============================================
// TYPE EXPORTS
// ============================================

export type LoginInput          = z.infer<typeof loginSchema>;
export type RegisterInput       = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput  = z.infer<typeof resetPasswordSchema>;
