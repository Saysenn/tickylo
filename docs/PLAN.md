# Tickworks — Remaining Work

1. **Landing Page + Onboarding Tour** — Marketing page + first-login coach-mark tour.
2. **Session Enforcement** — One active session per account on new login.
3. **Work Email Verification** — On company registration, send a 6-digit OTP to the work email before submission. Prevents fake/wrong emails and closes the infinite-trial loophole via re-registration.
4. **Org Deletion Request** — Admin submits a deletion request to super admin (not instant). Super admin reviews and approves. On approval: cancel Stripe subscription, revoke all user access, soft-delete org, hard-delete after 30-day grace period. Admin's `had_trial` flag persisted on User model to prevent trial abuse on re-registration.
5. **Help Center CTA** — Fixed "Need help?" widget bottom-left of dashboard.
6. **SMS → Ticket** — Twilio inbound → AI parse → ticket (Enterprise).
7. **Email → Ticket** — Inbound webhook → AI parse → ticket (Enterprise).
8. **AI Ticket Assistance** — Plain text → auto-fill fields + chatbot (Enterprise).
9. **Browser Extension** — See `docs/BROWSER-EXTENSION-PLAN.md`.
10. **Super Admin Dashboard** — Full super admin UI with its own sidebar; separate components, same architecture. Plan after browser extension.
11. **Trust Signals** — Stripe badge, SSL, GDPR note, social proof on landing page.
