# Tickworks — Remaining Work

1. **Employee Dashboard** — Replace "My Active Tasks" card with Time Logged This Week; wire "My Requests" card to a new `/dashboard/requests` page with cancel support + employee sidebar nav item ( might as well do some updates on admin dashbaord )
2. **Plan Gating** — Enterprise-only: Reports, performance APIs, CSV/PDF export, AI, SMS, Email features
3. **Session Enforcement** — One active session per account via `supabase.auth.admin.signOut(userId, "others")` on new login
4. **Help Center CTA** — "Need help?" widget (headphone-mic icon) linking to help center; fixed bottom-left of dashboard
5. **SMS → Ticket** — Twilio inbound, AI parse raw SMS → structured ticket (Enterprise)
6. **Email → Ticket** — Inbound webhook, AI parse email body → ticket (Enterprise)
7. **AI Ticket Assistance** — Plain text → auto-fill ticket fields (Business+)
8. **Browser Extension** — See `docs/BROWSER-EXTENSION-PLAN.md`
