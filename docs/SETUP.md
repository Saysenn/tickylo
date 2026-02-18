# Setup Guide

## 1. Install dependencies

```bash
npm install
```

---

## 2. Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Copy your **Project URL** and **Anon Key** from:
   `Project Settings → API`

---

## 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 4. Supabase dashboard settings

### Email auth
`Authentication → Providers → Email` → **Enable**
> For local dev: disable "Confirm email" so you can sign in immediately after registering.

### Google OAuth
`Authentication → Providers → Google` → **Enable**

You need a Google OAuth app:
1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create → **OAuth 2.0 Client ID** (Web application)
3. Authorized redirect URI:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
4. Copy the Client ID and Secret into Supabase

### Redirect URLs
`Authentication → URL Configuration`

| Field | Value |
|---|---|
| Site URL | `http://localhost:3000` |
| Additional redirect URLs | `http://localhost:3000/api/auth/callback` |

> For production, add your production domain to both fields.

### Email OTP (passwordless login)
`Authentication → Providers → Email` must be enabled (already done above).

Supabase sends the OTP automatically — no extra config needed.
> Requires a working email provider. For local dev, use **Supabase's built-in email** (limited to 3 emails/hour) or configure a custom SMTP:
> `Project Settings → Auth → SMTP Settings`

### 2FA (TOTP)
`Authentication → Multi-Factor Authentication` → enable **Time-based One-Time Password (TOTP)**

---

## 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Production checklist

- [ ] Update Site URL and redirect URLs in Supabase to your production domain
- [ ] Set `NEXT_PUBLIC_APP_URL` to your production URL in env vars
- [ ] Rotate any credentials that were committed to `.env.example` by mistake
- [ ] Enable email confirmation (`Authentication → Providers → Email`)
