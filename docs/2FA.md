# Two-Factor Authentication (TOTP) Setup

This template uses Supabase's built-in MFA for TOTP-based 2FA.
Works with Google Authenticator, Authy, 1Password, or any TOTP app.

---

## 1. Enable MFA in Supabase

`Authentication → Multi-Factor Authentication`

- Enable **Time-based One-Time Password (TOTP)**

That's the only Supabase config needed.

---

## 2. How it works in this app

### Enabling 2FA (Settings page)

1. User goes to `/settings`
2. Clicks **Enable 2FA**
3. Supabase generates a TOTP secret + QR code
4. User scans QR with their authenticator app
5. User enters the 6-digit code to confirm
6. 2FA is now active on their account

### Signing in with 2FA

1. User signs in with email/password
2. App checks AAL (Authentication Assurance Level)
3. If `nextLevel === 'aal2'`, shows the TOTP code prompt
4. User enters 6-digit code from their authenticator app
5. App challenges + verifies → full session granted

### Disabling 2FA

1. User goes to `/settings`
2. Clicks **Disable 2FA**
3. Must enter current TOTP code to confirm
4. Factor is unenrolled from their account

---

## 3. Relevant files

| File | Purpose |
|---|---|
| `components/settings/two-factor-settings.tsx` | Enable/disable TOTP UI |
| `components/auth/login-form.tsx` | TOTP challenge during login |
| `lib/supabase/client.ts` | Browser Supabase client |

---

## 4. Supabase MFA API used

```ts
// Enroll
supabase.auth.mfa.enroll({ factorType: 'totp' })

// Challenge + Verify
supabase.auth.mfa.challenge({ factorId })
supabase.auth.mfa.verify({ factorId, challengeId, code })

// List enrolled factors
supabase.auth.mfa.listFactors()

// Check current AAL after login
supabase.auth.mfa.getAuthenticatorAssuranceLevel()

// Remove factor
supabase.auth.mfa.unenroll({ factorId })
```

---

## 5. Notes

- Users who have 2FA enabled **must** enter their TOTP code on every login
- The TOTP secret is stored securely in Supabase — never in your app
- Challenge IDs expire — always create a fresh challenge at verify time
