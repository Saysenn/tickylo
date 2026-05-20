# Tickworks — Remaining Work

1. ~~**Plan Gating**~~ ✅ — Enforced at API, page, and UI (sidebar + dashboard cards) layers.
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

- `is_internal = true` — bypasses all feature gates
- Full access to everything, no restrictions
- Never billed, never expires

```sql
UPDATE "Organization" SET is_internal = true WHERE id = 'org-id';
```

## Trial (14 days)

- Resolves to Business for all feature checks
- Card required upfront; charged automatically after 14 days
- Shows upgrade CTA when trial expires
- `had_trial` flag prevents second trials

```sql
UPDATE "Organization"
SET plan = 'trial', trial_ends_at = NOW() + INTERVAL '14 days'
WHERE id = 'org-id';
```

## Business

| Feature | Gate key |
|---|---|
| Dashboard (stats, charts, team overview) | `dashboard` |
| Employee management (CRUD, bulk) | `employees` |
| Department hierarchy | `departments` |
| Bulk operations | `bulk_operations` |
| Ticket requests (transfer, reopen, due date) | `ticket_requests` |
| Ticket templates | `ticket_templates` |
| Work schedule configuration | `work_schedule` |
| Attachments on tickets | `attachments` |
| Time manager (admin team view) | `time_manager` |
| Notifications, profile, settings | *(ungated — core)* |
| Tickets & time tracking | *(ungated — core)* |
| Browser extension | *(ungated — core)* |

```sql
UPDATE "Organization" SET plan = 'business' WHERE id = 'org-id';
```

## Enterprise

Everything in Business, plus:

| Feature | Gate key |
|---|---|
| Reports & analytics | `reports` |
| Performance tracking | `performance` |
| CSV / PDF export | `csv_export` |
| Ticket logs (audit trail) | `audit_logs` |
| AI ticket assistance | `ai` |
| SMS → Ticket (Twilio) | `sms_ticket` |
| Email → Ticket | `email_ticket` |

```sql
UPDATE "Organization" SET plan = 'enterprise' WHERE id = 'org-id';
```
