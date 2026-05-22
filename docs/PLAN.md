# Tickworks — Remaining Work

1. **Help Center CTA** — Fixed "Need help?" widget bottom-left of dashboard.
2. **Client Management + Invoice Export** — See full spec below.
3. **SMS → Ticket** — Twilio inbound → AI parse → ticket (Enterprise).
4. **Email → Ticket** — Inbound webhook → AI parse → ticket (Enterprise).
5. **AI Ticket Assistance** — Plain text → auto-fill fields + chatbot (Enterprise).
6. **Client Portal** — Client logs in to view their own tickets and invoice history.
7. **Invoice Templates** — Customizable invoice templates (Enterprise). Found in settings or a new menu on main sidebar.

# one liner flow

Apply → Super admin approves → org created as unpaid → admin sets up billing → trial (14 days, denied if email used a trial before) → trial ends → Stripe charges → business or enterprise → payment fails → unpaid → admin pays again → back to plan.
