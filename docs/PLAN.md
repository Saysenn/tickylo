# Tickworks — Remaining Work

1. **Landing Page + Onboarding Tour** — Marketing page + first-login coach-mark tour.
2. **Help Center CTA** — Fixed "Need help?" widget bottom-left of dashboard.
3. **SMS → Ticket** — Twilio inbound → AI parse → ticket (Enterprise).
4. **Email → Ticket** — Inbound webhook → AI parse → ticket (Enterprise).
5. **AI Ticket Assistance** — Plain text → auto-fill fields + chatbot (Enterprise).
6. **Browser Extension** — See `docs/BROWSER-EXTENSION-PLAN.md`.

# one liner flow

Apply → Super admin approves → org created as unpaid → admin sets up billing → trial (14 days, denied if email used a trial before) → trial ends → Stripe charges → business or enterprise → payment fails → unpaid → admin pays again → back to plan.
