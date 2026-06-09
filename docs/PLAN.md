# Tickylo — Remaining Work

## Enterprise Readiness Gap

- **Own infrastructure** (storage, SMS/Twilio) — decided, needs implementation
- **SSO / SAML** — enterprises require it, non-negotiable for big accounts
- **SOC 2 / data residency** — later stage, needed for regulated industries
- **SLAs and uptime guarantees** — needed before enterprise sales conversations

1. **Help Center CTA** — Fixed "Need help?" widget bottom-left of dashboard.
2. **SMS → Ticket** — Twilio inbound → AI parse → ticket (Enterprise).
3. **Email → Ticket** — Inbound webhook → AI parse → ticket (Enterprise).
4. **AI Ticket Assistance** — Plain text → auto-fill fields + chatbot (Enterprise).
5. **Client Portal** — Client logs in to view their own tickets and invoice history.
6. enable RLS policies for all tables
7. Add a dedicated Comparison Page to the landing site featuring competitor comparison tables that highlight our SaaS advantages, key features, pricing benefits, and unique selling points.
8. stick to only one plan for now. business only. we will make users focus on just the ticket and time management and tracking for the saas

# one liner flow

Apply → Super admin approves → org created as unpaid → admin sets up billing → trial (14 days, denied if email used a trial before) → trial ends → Stripe charges → business or enterpr![alt text](image.png)ise → payment fails → unpaid → admin pays again → back to plan.
