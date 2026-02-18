# Next.js Auth Template

Production-ready authentication template — Next.js App Router + Supabase Auth.

## Stack

- **Auth**: Supabase Auth (email/password, Google OAuth, Email OTP, 2FA TOTP)
- **Framework**: Next.js 16 (App Router)
- **State**: Redux Toolkit + TanStack React Query
- **HTTP**: Axios singleton service
- **Validation**: Zod
- **Styling**: Tailwind CSS v4

## Features

- Email/password sign up & sign in
- Google OAuth
- Email OTP (passwordless login)
- Two-factor authentication (TOTP — Google Authenticator, Authy, etc.)
- Protected routes via middleware
- Session management via cookies (`@supabase/ssr`)
- CRM-ready dashboard shell (sidebar + header + user dropdown)
- Settings page with 2FA toggle

## Project Structure

```
app/
├── (auth)/            # Login, Register pages
├── (protected)/       # Dashboard, Settings (requires auth)
└── api/auth/callback/ # OAuth + magic link handler
components/
├── auth/              # LoginForm, RegisterForm
├── dashboard/         # Sidebar, Header, UserDropdown
├── settings/          # TwoFactorSettings
└── ui/                # Button, Input, Card
lib/
├── supabase/          # client.ts, server.ts, middleware.ts
└── validations/       # Zod schemas
providers/             # AppProvider (Redux + TanStack), UserProvider
services/              # axios.ts, api.ts, tanstack.ts
store/                 # Redux store + auth slice
configs/               # supabase.ts, stripe.ts
middleware.ts          # Route protection
```

## Quick Start

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with your Supabase credentials
npm run dev
```

## Guides

- [Setup Guide](./SETUP.md)
- [2FA (TOTP) Setup](./2FA.md)
- [Email OTP Setup](./EMAIL_OTP.md)

## License

MIT
