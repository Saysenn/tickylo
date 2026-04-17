# Multi-Tenancy Plan (performai SaaS)

## Context

The app is currently single-tenant — all data is global, filtered only by `user_id` and `role` (admin/employee). The goal is to evolve into a full SaaS where each subscribing company is an **Organization**, data is isolated per org, and a **super admin** can manage all orgs globally.

**Key insight:** Adding `org_id` while the DB is small is a one-time cheap migration. Doing it after 50 companies are live is exponentially harder.

---

## Current State

| Area | Detail |
|---|---|
| Roles | `admin` + `employee` — stored in Supabase `app_metadata.role` and synced to `User.role` in Prisma |
| Tenant boundary | **None** — `department_id` exists on `User` but is never used for scoping |
| Registration | First signup → `admin`. All others → `employee`. No org concept. |
| Employees API | Uses Supabase `auth.admin.listUsers()` — not filtered by company |
| Data routes | Filtered by `user_id` only. Admin sees ALL rows globally. |
| Payments | Stripe config exists (`Pro`, `Enterprise`) but routes not yet built |

---

## Role Hierarchy

```
super_admin        global — manages all orgs, no org_id
    └── admin      org-level — manages one org
        └── employee  belongs to one org
```

Stored in Supabase `app_metadata`:
```json
{ "role": "admin", "org_id": "org_abc123" }
```

Super admin has `org_id: null` — bypasses all org filters.

---

## Phase 1 — Foundation (Do Now, While DB Is Small)

### 1A. Add `Organization` model to Prisma

```prisma
model Organization {
  id                     String   @id @default(cuid())
  name                   String
  slug                   String   @unique   // e.g. "acme-corp" — future subdomain
  plan                   String   @default("free")  // free | pro | enterprise
  stripe_customer_id     String?
  stripe_subscription_id String?
  subscription_status    String?  // active | trialing | past_due | cancelled

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  users         User[]
  tasks         Task[]
  timeEntries   TimeEntry[]
  leaves        Leave[]
  departments   Department[]
  notifications Notification[]

  @@map("organizations")
}
```

### 1B. Add `org_id` to every data model

Models that need it: `User`, `Task`, `TimeEntry`, `Leave`, `Department`, `Notification`

```prisma
org_id  String
org     Organization @relation(fields: [org_id], references: [id])
@@index([org_id])
```

`TaskComment` is excluded — it's always accessed through `Task` which carries `org_id`.

### 1C. Backfill script (`scripts/seed-org.ts`)

1. Create one seed Organization `{ name: "Default", slug: "default" }`
2. Set `org_id` on all existing `User`, `Task`, `TimeEntry`, `Leave`, `Notification` rows
3. Update all existing Supabase users' `app_metadata` with `org_id` via admin client
4. After backfill: make `org_id` non-nullable on all models

---

## Phase 2 — Registration Flow (Before First External Company)

**New company signup creates a new Organization + its first admin.**

Current flow:
```
register(name, email, password) → first user ever → admin, else employee
```

New flow:
```
register(name, email, password, company_name)
  → create Organization({ name: company_name, slug: slugify(company_name) })
  → create admin user: app_metadata = { role: "admin", org_id: org.id }
  → upsert Prisma User with org_id
```

**Employee creation inherits org:**
```
POST /api/v1/employees (called by admin)
  → reads caller's org_id from app_metadata
  → new user gets: app_metadata = { role: "employee", org_id: caller.org_id }
  → Prisma User.org_id = caller.org_id
```

---

## Phase 3 — API Filtering (Apply After Phase 1)

### New auth helper

```typescript
// lib/auth/require-org-user.ts
export async function requireOrgUser() {
  const user = await requireUser();
  if (!user) return null;
  const orgId = user.app_metadata?.org_id as string | undefined;
  return { user, orgId };
}
```

### Filtering pattern on every route

```typescript
// Before:
const where = isAdmin ? {} : { user_id: user.id };

// After:
const where = isAdmin
  ? { org_id: orgId }                      // admin sees all within their org
  : { org_id: orgId, user_id: user.id };   // employee sees own within their org

// Super admin bypass:
const isSuperAdmin = user.app_metadata?.role === "super_admin";
const where = isSuperAdmin ? {} : { org_id: orgId, ...roleFilter };
```

---

## Phase 4 — Super Admin (When You Have 2+ Orgs)

- New role: `super_admin` in `configs/rbac.config.ts`
- No `org_id` — bypasses all org filters
- Separate layout: `/super-admin/` (new Next.js route group)
- Capabilities: list all orgs, impersonate admins, deactivate orgs, view billing
- New auth guard: `requireSuperAdmin.ts`
- **Created manually via Supabase dashboard or seed script — never via public registration**

---

## Phase 5 — Billing (Before Charging Customers)

**The Organization owns the Stripe subscription, not individual users.**

```
Admin → "Upgrade" button
  → POST /api/v1/payments/checkout
  → Stripe Checkout with org's stripe_customer_id
  → Stripe webhook → update Organization.plan + subscription_status
```

Feature gating:
```typescript
const org = await prisma.organization.findUnique({ where: { id: orgId } });
if (org.plan === "free" && featureRequiresPro) {
  return errorResponse("Upgrade your plan to access this feature", 402);
}
```

Stripe config already exists at `configs/stripe.config.ts` with `Pro` and `Enterprise` plans.

---

## Phase 6 — Row Level Security (At Scale, 50+ Orgs)

Add Supabase RLS policies as a defense-in-depth layer once application-level filtering is proven stable. Not needed now — adds complexity without benefit at current scale.

---

## Phasing Summary

| Phase | When | What |
|---|---|---|
| **1 — Foundation** | Now | `Organization` model + `org_id` on all tables + backfill script |
| **2 — Registration** | Before first external company | Signup creates org; employees inherit org from admin |
| **3 — API Filtering** | With Phase 1 | Add `org_id` to all WHERE clauses |
| **4 — Super Admin** | When 2+ orgs exist | New role, bypass filters, global dashboard |
| **5 — Billing** | Before charging | Stripe webhook updates `Organization.plan` |
| **6 — RLS** | At scale (50+ orgs) | Supabase Row Level Security |

---

## Files to Touch (Phase 1)

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `Organization` model; add `org_id` to all models |
| `scripts/seed-org.ts` | Create default org, backfill all rows, patch Supabase metadata |
| `lib/auth/require-user.ts` | Expose `org_id` from `app_metadata` |
| `configs/rbac.config.ts` | Add `SUPER_ADMIN: "super_admin"` constant |
| All `app/api/v1/**` routes | Add `org_id` to every WHERE clause |
| `app/api/v1/employees/route.ts` | Store `org_id` in Supabase `user_metadata`; filter list by org |
