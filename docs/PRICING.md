# Tickworks — Pricing

---

## Business — $20/mo + $4.99/seat/mo

Admin included in base. Each employee = $4.99/seat. Buy and remove seats anytime from Settings → Subscription.

**Includes:**
- Full ticketing + task management
- Time tracking per ticket
- Leave management *(coming soon)*
- Browser extension
- Rich text threads (no file attachments)
- Workload + performance reports
- Bulk actions + advanced filters
- Custom ticket types
- Email notifications
- Audit log + GDPR tools
- Work schedule config

**Seat billing:**
- Mid-month add → Stripe charges prorated days remaining only
- Remove seats → access revoked immediately, unused days credited to next invoice
- *"Next billing date: Feb 1 — remove seats before then to avoid charges."*

**Annual:** $200/yr base + $49.90/yr per seat (2 months free)

---

## Enterprise — $100/mo flat

25 seats + admin included. No per-seat math. Everything the platform has.

**Everything in Business, plus:**
- File + image attachments in threads
- Storage setup — 1-on-1 guidance to connect S3 or Supabase, or we do it for you
- SMS → ticket (clients text your Twilio number, auto-creates ticket)
- Email → ticket (inbound webhook, emails become tickets)
- 2FA / OTP enforcement org-wide
- White-label / custom domain
- Dedicated onboarding + account manager
- SLA guarantee
- On-premise deployment
- Custom integrations + full API access

Need more than 25 seats? Contact us for a custom quote.

> 📩 [hello@tickworks.app](mailto:hello@tickworks.app)

**Annual:** $1,000/yr (2 months free)

---

## Why Enterprise is the better deal at scale

A Business customer with 25 employees pays `$20 + (25 × $4.99) = $144.75/mo` with no attachments, no SMS, no dedicated support. Enterprise at $100 flat is cheaper and gets everything.

---

## Feature Comparison

| Feature                        |       Business        |      Enterprise      |
|--------------------------------|:---------------------:|:--------------------:|
| Ticketing + time tracking      |          ✅           |          ✅          |
| Leave management               |          🔜           |          🔜          |
| Browser extension              |          ✅           |          ✅          |
| Rich text threads              |          ✅           |          ✅          |
| File + image attachments       |          ❌           |          ✅          |
| Storage setup (S3/Supabase)    |          ❌           |          ✅          |
| SMS → ticket                   |          ❌           |          ✅          |
| Email → ticket                 |          ❌           |          ✅          |
| 2FA enforcement                |          ❌           |          ✅          |
| White-label / on-premise       |          ❌           |          ✅          |
| Custom integrations + API      |          ❌           |          ✅          |
| Dedicated support + SLA        |          ❌           |          ✅          |
| **Seats**                      |    **Pay per seat**   |   **25 + admin**     |
| **Price**                      | **$20 + $4.99/seat**  |   **$100/mo flat**   |

---

## Stripe Implementation

### Schema (Organization)
```prisma
plan                    String    @default("trial") // "trial" | "business" | "enterprise"
seat_count              Int       @default(1)
trial_ends_at           DateTime?
stripe_customer_id      String?   @unique
stripe_subscription_id  String?   @unique
stripe_base_item_id     String?
stripe_seat_item_id     String?
next_billing_date       DateTime?
```

### Price IDs (configs/stripe.config.ts)
```ts
export const STRIPE_PRICES = {
  business: {
    base:     { monthly: "price_xxx", annual: "price_xxx" }, // $20/mo
    per_seat: { monthly: "price_xxx", annual: "price_xxx" }, // $4.99/seat
  },
  enterprise: {
    base:     { monthly: "price_xxx", annual: "price_xxx" }, // $100/mo flat
  },
};
```

### Flow
1. Org approved → `plan = "trial"`, `trial_ends_at = now + 14 days`
2. Trial ends → `/billing` → Stripe Checkout (choose plan + seat count)
3. Payment success → webhook → update `org.plan`, `org.seat_count` in DB
4. Payment fails → Stripe retries 3× → org locked
5. Seat changes → `stripe.subscriptions.update` with `proration_behavior: "create_prorations"`
6. Cancel / portal → Stripe Customer Portal

### Seat enforcement
```ts
const activeCount = await prisma.user.count({ where: { org_id, deleted_at: null } });
if (activeCount >= org.seat_count) {
  throw { status: 403, message: "Seat limit reached. Purchase more seats in Settings → Subscription." };
}
```

### Feature gating
```ts
// enterprise-only features
requirePlan(org, "enterprise"); // attachments, SMS, email inbound, 2FA, storage
```
