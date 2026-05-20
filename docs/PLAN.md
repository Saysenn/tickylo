# Tickworks — Remaining Work

1. **Plan Gating** — Feature access based on org plan. Enforce at API, page, and UI layers.
2. **Notification Audit** — Check all important operations that need notifications; list and add any missing ones.
3. **Landing Page + Onboarding Tour** — Marketing landing page outside auth. On first dashboard login: guided coach-mark tour (spotlight overlay + tooltip on each key UI element, Skip + Next controls). Store `onboarding_completed` flag per user so it never re-triggers.
4. **Session Enforcement** — One active session per account via `supabase.auth.admin.signOut(userId, "others")` on new login
5. **Help Center CTA** — "Need help?" widget (headphone-mic icon) linking to help center; fixed bottom-left of dashboard
6. **SMS → Ticket** — Twilio inbound, AI parse raw SMS → structured ticket (Enterprise)
7. **Email → Ticket** — Inbound webhook, AI parse email body → ticket (Enterprise)
8. **AI Ticket Assistance** — Plain text → auto-fill ticket fields + chatbot (Enterprise)
9. **Browser Extension** — See `docs/BROWSER-EXTENSION-PLAN.md`
10. **Trust Signals** — Add to landing page: "Secured by Stripe" badge, SSL indicator, GDPR-ready note, uptime/reliability stat, and a short social proof section (logos or testimonials).

---

# Plan Tiers

## Exempt (internal / testing)

- Full access to everything, no restrictions
- Never billed, never expires
- For internal orgs and developer testing only

## Trial (14 days)

- Full Business access, time-limited
- Shows upgrade CTA when trial expires → Business or Enterprise

## Business

- Ticket management (create, assign, update, comment)
- Time tracking (clock in/out, own + team logs)
- Dashboard (team overview, stats, charts)
- Employee management
- Department hierarchy
- Time manager (team overview)
- Bulk operations (tickets, employees, time)
- Ticket requests (transfer, reopen, due date)
- Ticket templates
- Work schedule configuration
- Attachments on tickets
- Org join code / invite system
- Browser extension
- Audit logs & ticket logs
- Notifications
- Profile & settings

## Enterprise

Everything in Business, plus:

- Reports & analytics
- Performance tracking
- CSV / PDF export
- AI ticket assistance
- SMS → Ticket (Twilio)
- Email → Ticket

For a Business org:

UPDATE "Organization"
SET plan = 'business'
WHERE id = 'org-id';
For an Enterprise org:

UPDATE "Organization"
SET plan = 'enterprise'
WHERE id = 'org-id';
For a Trial org:

UPDATE "Organization"
SET plan = 'trial', trial_ends_at = NOW() + INTERVAL '14 days'
WHERE id = 'org-id';
