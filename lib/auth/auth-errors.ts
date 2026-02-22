/**
 * Maps Supabase Auth error messages to safe, user-friendly messages.
 * Prevents information disclosure (e.g., "user not found" vs "wrong password").
 */

const LOGIN_ERRORS: Record<string, string> = {
  "invalid login credentials":     "Invalid email or password.",
  "invalid_credentials":           "Invalid email or password.",
  "email not confirmed":           "Please confirm your email address before signing in.",
  "user not found":                "Invalid email or password.",
  "too many requests":             "Too many attempts. Please wait a moment and try again.",
  "user is banned":                "This account has been suspended.",
  "mfa_required":                  "Two-factor authentication is required.",
};

const SIGNUP_ERRORS: Record<string, string> = {
  "user already registered":       "An account with this email already exists.",
  "email already in use":          "An account with this email already exists.",
  "weak password":                 "Password is too weak. Use at least 8 characters with mixed case, numbers, and symbols.",
  "password should be at least":   "Password must be at least 8 characters.",
  "too many requests":             "Too many attempts. Please wait a moment and try again.",
};

const FORGOT_ERRORS: Record<string, string> = {
  "user not found":         "No account found with this email address.",
  "for security purposes":  "You can only request a reset once every 60 seconds.",
  "too many requests":      "Too many attempts. Please wait a moment and try again.",
};

const RESET_ERRORS: Record<string, string> = {
  "weak password":          "Password is too weak. Use at least 8 characters with mixed case, numbers, and symbols.",
  "same password":          "New password must be different from your current password.",
  "token has expired":      "Reset link has expired. Please request a new one.",
};

const OTP_ERRORS: Record<string, string> = {
  "user not found":                "No account found with this email address.",
  "for security purposes":         "You can only request a code once every 60 seconds.",
  "token has expired":             "This code has expired. Please request a new one.",
  "token is invalid":              "Invalid code. Please check and try again.",
  "too many requests":             "Too many attempts. Please wait a moment and try again.",
};

function mapError(message: string, table: Record<string, string>, fallback: string): string {
  const lower = message.toLowerCase();
  for (const [key, friendly] of Object.entries(table)) {
    if (lower.includes(key)) return friendly;
  }
  return fallback;
}

export const authError = {
  login:    (msg: string) => mapError(msg, LOGIN_ERRORS,  "Sign in failed. Please try again."),
  signup:   (msg: string) => mapError(msg, SIGNUP_ERRORS, "Registration failed. Please try again."),
  otp:      (msg: string) => mapError(msg, OTP_ERRORS,    "Failed to send code. Please try again."),
  otpVerify:(msg: string) => mapError(msg, OTP_ERRORS,    "Invalid or expired code. Please try again."),
  mfa:           (_msg: string) => "Invalid code. Please try again.",
  google:        (_msg: string) => "Google sign-in failed. Please try again.",
  forgotPassword:(msg: string)  => mapError(msg, FORGOT_ERRORS, "Failed to send reset email. Please try again."),
  resetPassword: (msg: string)  => mapError(msg, RESET_ERRORS,  "Failed to reset password. Please try again."),
};
