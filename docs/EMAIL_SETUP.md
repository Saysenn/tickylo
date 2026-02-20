# Email Setup

Required for forgot password, email confirmations, and OTP login to work.
Powered by Supabase Auth — configure SMTP once and all email features work automatically.

---

## 1. Configure SMTP in Supabase

`Authentication → Settings → SMTP Settings` → **Enable Custom SMTP**

| Field | Value |
|---|---|
| Sender email | `no-reply@yourdomain.com` |
| Sender name | `PerformAI` (or your brand) |
| Host | Your SMTP host (e.g. `smtp.resend.com`) |
| Port | `587` (TLS) or `465` (SSL) |
| Username | Your SMTP username / API key |
| Password | Your SMTP password / API key |

**Recommended free providers:**
- [Resend](https://resend.com) — 3,000 emails/month free
- [SendGrid](https://sendgrid.com) — 100 emails/day free
- [Brevo](https://brevo.com) — 300 emails/day free

> Without custom SMTP, Supabase's built-in service is limited to **3 emails/hour** — fine for development, not for production.

---

## 2. Update the reset password email template

`Authentication → Email Templates → Reset Password`

Ensure the template body includes `{{ .ConfirmationURL }}` — this is the link users click to land on the reset password page.

---

## 3. How forgot password works in this app

1. User clicks **Forgot password?** on `/login`
2. Enters their email on `/forgot-password`
3. Supabase sends a reset email via your configured SMTP
4. User clicks the link → arrives at `/reset-password`
5. Enters a new password → redirected to `/login`

---

## 4. Relevant files

| File | Purpose |
|---|---|
| `components/auth/forgot-password-form.tsx` | Email input + sends reset email |
| `components/auth/reset-password-form.tsx` | New password form |
| `app/(auth)/forgot-password/page.tsx` | Forgot password page |
| `app/(auth)/reset-password/page.tsx` | Reset password page |
| `app/api/auth/callback/route.ts` | Exchanges Supabase code for session |

---

## 5. Supabase API used

```ts
// Send reset email
supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${origin}/api/auth/callback?next=/reset-password`,
})

// Set new password (called after recovery session is active)
supabase.auth.updateUser({ password: newPassword })
```

---

## 6. Notes

- If a user doesn't receive the email, check `Supabase Dashboard → Logs → Auth`
- Reset links expire after **1 hour** by default (configurable in Supabase Auth settings)
- Google OAuth users don't have a password — they can't use forgot password
