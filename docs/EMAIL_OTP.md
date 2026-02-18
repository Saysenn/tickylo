# Email OTP Setup

Email OTP lets users sign in with a 6-digit code sent to their email — no password needed.
Powered by Supabase Auth's built-in `signInWithOtp`.

---

## 1. Supabase configuration

### Enable Email provider
`Authentication → Providers → Email` → **Enable**

### Configure email sending (required for OTP delivery)

Supabase's built-in email is limited to **3 emails/hour** per project on the free tier.

For development and production, configure a custom SMTP provider:

`Project Settings → Auth → SMTP Settings`

| Field | Value |
|---|---|
| Host | Your SMTP host (e.g. `smtp.resend.com`) |
| Port | `465` (SSL) or `587` (TLS) |
| User | Your SMTP username |
| Password | Your SMTP password / API key |
| Sender email | `no-reply@yourdomain.com` |

**Recommended free SMTP providers:**
- [Resend](https://resend.com) — 3,000 emails/month free
- [Brevo (Sendinblue)](https://brevo.com) — 300/day free
- [Mailgun](https://mailgun.com) — 100/day free

---

## 2. How it works in this app

### Login flow

1. User goes to `/login` → clicks **Email OTP** tab
2. Enters their email address → clicks **Send OTP**
3. Supabase sends a 6-digit code to that email
4. User enters the code → clicks **Verify & Sign in**
5. Session is created, user is redirected to `/dashboard`

> Note: OTP codes expire after **1 hour** by default (configurable in Supabase).

### Registration

Email OTP login uses `shouldCreateUser: false` — the user must already have an account.
To register, users use the email/password or Google OAuth flow.

---

## 3. Relevant files

| File | Purpose |
|---|---|
| `components/auth/login-form.tsx` | Email OTP tab (send + verify) |
| `app/api/auth/callback/route.ts` | Handles magic link redirects |

---

## 4. Supabase API used

```ts
// Send OTP to email
supabase.auth.signInWithOtp({
  email,
  options: { shouldCreateUser: false },
})

// Verify the 6-digit code
supabase.auth.verifyOtp({
  email,
  token: otpCode,
  type: 'email',
})
```

---

## 5. Customise the OTP email template

`Authentication → Email Templates → Magic Link`

Change the subject and body to match your brand.
The `{{ .Token }}` variable inserts the 6-digit code.

---

## 6. Notes

- OTP codes are single-use — they become invalid once verified
- If a user doesn't receive the email, check Supabase Dashboard → Logs → Auth
- For production, always use a custom SMTP provider (built-in is for dev only)
