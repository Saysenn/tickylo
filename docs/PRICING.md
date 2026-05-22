# Tickworks — Pricing

---

## Business — $20/mo + $3.99/seat/mo

Admin included in base. Each employee = $3.99/seat. Buy and remove seats anytime from Settings → Subscription.

**Annual:** $200/yr base + $39.90/yr per seat (2 months free)

---

## Enterprise — $100/mo flat

26 seats + admin included. No per-seat math. Everything the platform has.

**Annual:** $1,000/yr (2 months free)

Need more than 26 seats? Contact us — [hello@tickworks.app](mailto:hello@tickworks.app)

---

## Feature Comparison

| Feature                      |     Trial      |       Business       |    Enterprise    |
| ---------------------------- | :------------: | :------------------: | :--------------: |
| Ticketing + time tracking    |       ✅       |          ✅          |        ✅        |
| Dashboard                    |       ✅       |          ✅          |        ✅        |
| Employees                    |       ✅       |          ✅          |        ✅        |
| Departments                  |       ✅       |          ✅          |        ✅        |
| Bulk operations              |       ✅       |          ✅          |        ✅        |
| Ticket requests              |       ✅       |          ✅          |        ✅        |
| Ticket templates             |       ✅       |          ✅          |        ✅        |
| Work schedule config         |       ✅       |          ✅          |        ✅        |
| File + image attachments     |       ✅       |          ✅          |        ✅        |
| Audit logs                   |       ✅       |          ✅          |        ✅        |
| Team overview (time manager) |       ✅       |          ✅          |        ✅        |
| Reports                      |       ❌       |          ❌          |        ✅        |
| Performance analytics        |       ❌       |          ❌          |        ✅        |
| CSV export                   |       ❌       |          ❌          |        ✅        |
| AI assistance                |       ❌       |          ❌          |        ✅        |
| SMS → ticket                 |       ❌       |          ❌          |        ✅        |
| Email → ticket               |       ❌       |          ❌          |        ✅        |
| Invoice + templates          |       ❌       |          ❌          |        ✅        |
| **Seats**                    | **11 + admin** |   **Pay per seat**   |  **26 + admin**  |
| **Price**                    |  **14 days**   | **$20 + $3.99/seat** | **$100/mo flat** |

> Trial gets everything Business gets for 14 days, with 11 free seats included.

---

## Why Enterprise is the better deal at scale

A Business customer with 26 employees pays `$20 + (26 × $3.99) = $123.74/mo` with no reports, no AI, no CSV export. Enterprise at $100 flat is cheaper and gets everything.

---

## Stripe Implementation

### Schema (Organization)

```prisma
plan                    String    @default("trial") // "trial" | "business" | "enterprise" | "cancelled"
seat_count              Int       @default(1)
trial_ends_at           DateTime?
stripe_customer_id      String?   @unique
stripe_subscription_id  String?   @unique
stripe_base_item_id     String?
stripe_seat_item_id     String?
```

### Price IDs (`configs/stripe.config.ts`)

```ts
export const STRIPE_PRICES = {
	business: {
		base: { monthly: "price_xxx", annual: "price_xxx" }, // $20/mo
		per_seat: { monthly: "price_xxx", annual: "price_xxx" }, // $4.99/seat
	},
	enterprise: {
		base: { monthly: "price_xxx", annual: "price_xxx" }, // $100/mo flat
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

### Feature gating (`lib/utils/plan-gate.ts`)

```ts
// Business + Enterprise + Trial
"dashboard" | "employees" | "departments" | "bulk_operations";
"ticket_requests" | "ticket_templates" | "work_schedule";
"attachments" | "audit_logs" | "time_manager";

// Enterprise only
"reports" | "performance" | "csv_export" | "ai" | "sms_ticket" | "email_ticket";
```
