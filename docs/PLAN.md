# Tickworks — Remaining Work

1. **Help Center CTA** — Fixed "Need help?" widget bottom-left of dashboard.
2. **SMS → Ticket** — Twilio inbound → AI parse → ticket (Enterprise).
3. **Email → Ticket** — Inbound webhook → AI parse → ticket (Enterprise).
4. **AI Ticket Assistance** — Plain text → auto-fill fields + chatbot (Enterprise).
5. **Client Portal** — Client logs in to view their own tickets and invoice history.
6. enable RLS policies for all tables

# one liner flow

Apply → Super admin approves → org created as unpaid → admin sets up billing → trial (14 days, denied if email used a trial before) → trial ends → Stripe charges → business or enterpr![alt text](image.png)ise → payment fails → unpaid → admin pays again → back to plan.
