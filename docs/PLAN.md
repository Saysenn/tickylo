# Tickylo — Remaining Work

## Landing Page Positioning
Complexity is the #1 complaint about Zendesk, Freshdesk, Jira — top reviews always say:
"Too complex to set up", "Took weeks to onboard", "Too many features we don't need."

**Our angle:** Simplicity as a strategy. Proven by Basecamp (beat complex PM tools), Linear (beat Jira), Notion (beat Confluence), Stripe (beat old payment processors). They didn't win on features — they won on "it just works."

Suggested headline:
> *"Tickylo — Helpdesk software your team will actually use."*
> *"All the power of Zendesk. None of the complexity."*

Push this message on the landing page, comparison page, and every marketing touchpoint.



## Enterprise Readiness Gap

( optional )

- **Own infrastructure** (storage, SMS/Twilio) — decided, needs implementation
- **SSO / SAML** — enterprises require it, non-negotiable for big accounts
- **SOC 2 / data residency** — later stage, needed for regulated industries
- **SLAs and uptime guarantees** — needed before enterprise sales conversations

( reqiured )

1. **AI Ticket Assistance** — Plain text → auto-fill fields (Enterprise) and suggestions ai.
2. own storage in supabase.
3. **Client Portal** — Client logs in to view their own tickets and invoice history ( need ai assistance for this )
4. enable RLS policies for all tables
5. Add a comparison page showcasing our SaaS advantages, features, pricing, and key differentiators against competitors.
6. hide / disable Enterprise plan from UI/UX for now; focus exclusively on the Business plan until product-market fit is achieved.
7. **Help Center CTA** — Fixed "Need help?" widget bottom-left of dashboard.
8. **SMS → Ticket** — Twilio inbound → AI parse → ticket (Enterprise).
9. **Email → Ticket** — Inbound webhook → AI parse → ticket (Enterprise).

# one liner flow

Apply → Super admin approves → org created as unpaid → admin sets up billing → trial (14 days, denied if email used a trial before) → trial ends → Stripe charges → business or enterpr![alt text](image.png)ise → payment fails → unpaid → admin pays again → back to plan.
