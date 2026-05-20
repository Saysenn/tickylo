# Tickworks — Remaining Work

1. **Employee Dashboard** — Replace "My Active Tasks" card with Time Logged This Week; wire "My Requests" card to a new `/dashboard/requests` page with cancel support + employee sidebar nav item (also do some updates on admin dashboard)
2. **Landing Page + Onboarding Tour** — Marketing landing page outside auth. On first dashboard login: guided coach-mark tour (spotlight overlay + tooltip on each key UI element, Skip + Next controls). Store `onboarding_completed` flag per user so it never re-triggers.
3. **Plan Gating** — Enterprise-only: Reports, performance APIs, CSV/PDF export, AI, SMS, Email features
4. **Session Enforcement** — One active session per account via `supabase.auth.admin.signOut(userId, "others")` on new login
5. **Help Center CTA** — "Need help?" widget (headphone-mic icon) linking to help center; fixed bottom-left of dashboard
6. **SMS → Ticket** — Twilio inbound, AI parse raw SMS → structured ticket (Enterprise)
7. **Email → Ticket** — Inbound webhook, AI parse email body → ticket (Enterprise)
8. **AI Ticket Assistance** — Plain text → auto-fill ticket fields (Business+)
9. **Browser Extension** — See `docs/BROWSER-EXTENSION-PLAN.md`
