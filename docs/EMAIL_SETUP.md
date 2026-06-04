# Email Setup

| Feature                       | Provider      | Status                                        |
| ----------------------------- | ------------- | --------------------------------------------- |
| Forgot password               | Resend (SMTP) | Needs Supabase SMTP pointed at Resend          |
| Email confirmation            | Resend (SMTP) | Needs Supabase SMTP pointed at Resend          |
| Magic link / OTP login        | Resend (SMTP) | Needs Supabase SMTP pointed at Resend          |
| Email change confirmation     | Resend (SMTP) | Needs Supabase SMTP pointed at Resend          |
| Org registration OTP code     | Resend        | Needs `RESEND_API_KEY` in `.env.local`         |
| Org deletion approval email   | Resend        | Needs `RESEND_API_KEY` in `.env.local`         |

---

## Step 1 — Add Resend credentials to `.env.local`

```env
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=Tickylo <noreply@yourdomain.com>
```

This immediately enables the org registration OTP and deletion approval emails.

---

## Step 2 — Point Supabase SMTP at Resend

`Supabase Dashboard → Authentication → Settings → SMTP` → Enable Custom SMTP:

| Field         | Value                     |
| ------------- | ------------------------- |
| Host          | `smtp.resend.com`         |
| Port          | `465`                     |
| Username      | `resend`                  |
| Password      | `re_xxxxxxxxxxxx`         |
| Sender email  | `noreply@yourdomain.com`  |
| Sender name   | `Tickylo`               |

This enables forgot password, email confirmation, magic link, and email change — all sent via Resend.

> A verified domain in Resend is required for both steps.
