# Stripe Integration Plan

---

## Pricing

| Plan | Price |
|---|---|
| Business | $20/mo + $4.99/seat/mo |
| Enterprise | $100/mo flat (25 seats included) |

---

## Architecture Principles

1. Stripe secret key — server only, never in client bundle
2. Webhook signature verified on every event — unsigned requests rejected
3. Stripe IDs never sent to client — only `plan`, `seat_count`, `trial_ends_at` exposed
4. Card data never touches our servers — Stripe hosts the form
5. Plan always read from DB server-side — client state is display only
6. Seat enforcement at service layer — not just API route
7. `requireAdmin()` on all billing endpoints — employees cannot trigger billing actions
8. Webhook is the only source of truth — DB never updated from checkout redirect

---

## Org Status Flow

```
"pending"    → application submitted, awaiting super admin approval
"unpaid"     → approved, billing link emailed, card not yet entered
"trial"      → card saved, 14-day trial active (not charged yet)
"business"   → subscribed, Business plan, charged
"enterprise" → subscribed, Enterprise plan, charged
"cancelled"  → cancelled or payment failed after all retries
```

---

## Full Flows

### First time
```
1. Admin submits /apply
2. Super admin approves → org plan = "unpaid"
   → Approval email sent with one-time /billing link
3. Admin opens /billing
   → Chooses Business or Enterprise
   → Chooses seat count (Business only)
   → Enters card (Stripe SetupIntent — saved, not charged)
4. plan = "trial", trial_ends_at = now + 14 days
   → Org fully unlocked
   → Banner: "Trial ends Feb 15 — $X charged automatically"
5. Day 14 → Stripe auto-charges saved card
   → Success → plan = "business" or "enterprise"
   → Failure → Stripe retries 3× over 7 days → all fail → plan = "cancelled"
6. Monthly auto-renewal from there
```

### Cancel before day 14
```
Admin cancels → zero charge → plan = "cancelled"
→ Org + all employee seats locked immediately
→ Admin re-applies → super admin approves
→ Same card detected → NO second trial → charged immediately on approval
→ Org reactivated
```

### Cancel after paying
```
Admin cancels mid-subscription
→ Access continues until end of current billing period
→ Period ends → plan = "cancelled" → org + all seats locked
→ Re-apply → same card → no trial → charged immediately
```

### Payment failure
```
Day 14 or monthly renewal fails
→ Stripe retries 3× over 7 days, email each attempt
→ All retries fail → plan = "cancelled" → org locked
→ Admin updates card in Stripe Portal → manual retry → unlocked
```

---

## Schema (Organization)

```prisma
plan                   String    @default("pending")
seat_count             Int       @default(1)
trial_ends_at          DateTime?
stripe_customer_id     String?   @unique
stripe_subscription_id String?   @unique
stripe_base_item_id    String?
stripe_seat_item_id    String?
next_billing_date      DateTime?
had_trial              Boolean   @default(false) // prevents second trial on re-apply
```

---

## Stripe Config (configs/stripe.config.ts)

```ts
export const STRIPE_PRICES = {
  business: {
    base:         process.env.STRIPE_BUSINESS_BASE_PRICE_ID     ?? "", // $20/mo
    per_seat:     process.env.STRIPE_BUSINESS_SEAT_PRICE_ID     ?? "", // $4.99/seat
    base_annual:  process.env.STRIPE_BUSINESS_BASE_ANNUAL_ID    ?? "",
    seat_annual:  process.env.STRIPE_BUSINESS_SEAT_ANNUAL_ID    ?? "",
  },
  enterprise: {
    base:         process.env.STRIPE_ENTERPRISE_BASE_PRICE_ID   ?? "", // $100/mo
    base_annual:  process.env.STRIPE_ENTERPRISE_BASE_ANNUAL_ID  ?? "",
  },
};
```

### .env.local additions
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BUSINESS_BASE_PRICE_ID=price_...
STRIPE_BUSINESS_SEAT_PRICE_ID=price_...
STRIPE_BUSINESS_BASE_ANNUAL_ID=price_...
STRIPE_BUSINESS_SEAT_ANNUAL_ID=price_...
STRIPE_ENTERPRISE_BASE_PRICE_ID=price_...
STRIPE_ENTERPRISE_BASE_ANNUAL_ID=price_...
```

---

## API Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/webhooks/stripe` | POST | Stripe signature | Handle all Stripe events |
| `/api/v1/billing/setup` | POST | requireAdmin | Save card via SetupIntent, start trial |
| `/api/v1/billing/portal` | POST | requireAdmin | Open Stripe Customer Portal |
| `/api/v1/billing/seats` | PATCH | requireAdmin | Add/remove seats with proration |
| `/api/v1/billing/status` | GET | requireUser | Return plan info (no Stripe IDs) |

---

## Webhook Events

| Event | Action |
|---|---|
| `setup_intent.succeeded` | Save payment method, create subscription, set plan = "trial" |
| `customer.subscription.updated` | Update plan, seat_count, next_billing_date |
| `customer.subscription.deleted` | Set plan = "cancelled", lock org |
| `invoice.payment_succeeded` | Set plan = "business"/"enterprise", clear any lock |
| `invoice.payment_failed` | Log failure, email admin |

---

## Pages

| Page | Who sees it | Purpose |
|---|---|---|
| `/billing` | Unpaid/cancelled admins | Choose plan, enter card |
| `/billing/success` | After setup | Confirm trial started, redirect to dashboard |
| `/dashboard/settings/subscription` | Admin only | Manage seats, view billing date, open portal |

---

## Protected Layout Logic

```ts
const locked = ["unpaid", "cancelled", "pending"].includes(org.plan);
if (locked && !pathname.startsWith("/billing")) redirect("/billing");
```

---

## Seat Enforcement (employees.service.ts)

```ts
const activeCount = await prisma.user.count({ where: { org_id, deleted_at: null } });
if (activeCount >= org.seat_count) {
  throw { status: 403, message: "Seat limit reached. Buy more seats in Settings → Subscription." };
}
```

---

## No Second Trial Rule

```ts
// On approval, check had_trial before starting trial
if (org.had_trial) {
  // charge immediately, skip trial
} else {
  // start 14-day trial, set had_trial = true
}
```

---

## Enterprise Feature Gates

Add `requirePlan(org, "enterprise")` to:
- `POST /api/v1/upload` — file uploads
- `GET/DELETE /api/v1/attachment/[id]` — attachments
- `PUT /api/v1/org/storage` — storage config
- (future) SMS webhook
- (future) Email inbound webhook
- (future) 2FA enforcement

---

## Stripe Dashboard Setup (Manual)

1. Create products + prices → copy IDs to `.env.local`
2. Add webhook endpoint → `https://yourdomain.com/api/webhooks/stripe`
3. Select events: `setup_intent.succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
4. Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`
5. Enable Customer Portal in Stripe Dashboard → Billing → Customer Portal

---

## Files to Create/Modify

| Action | File |
|---|---|
| Modify | `prisma/schema.prisma` |
| Modify | `configs/stripe.config.ts` |
| **Create** | `lib/utils/plan-gate.ts` |
| **Create** | `app/api/webhooks/stripe/route.ts` |
| **Create** | `app/api/v1/billing/setup/route.ts` |
| **Create** | `app/api/v1/billing/portal/route.ts` |
| **Create** | `app/api/v1/billing/seats/route.ts` |
| **Create** | `app/api/v1/billing/status/route.ts` |
| **Create** | `app/(protected)/billing/page.tsx` |
| **Create** | `app/(protected)/billing/success/page.tsx` |
| **Create** | `app/(protected)/dashboard/settings/subscription/page.tsx` |
| Modify | `app/(protected)/layout.tsx` |
| Modify | `services/employees.service.ts` |
| Modify | `lib/infra/api.ts` |
| Modify | `app/(protected)/dashboard/settings/layout.tsx` |
| Modify | `app/api/v1/org/storage/route.ts` |
| Modify | `app/api/v1/upload/route.ts` |
| Modify | `app/api/v1/attachment/[id]/route.ts` |
| Modify | `app/(protected)/super-admin/applications` — flag had_trial on re-apply |
