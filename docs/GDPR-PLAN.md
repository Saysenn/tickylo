# GDPR & PECR Implementation Plan

Reference: `docs/GDPR-PECR.md` for the compliance guide.
Codebase: Next.js 15, Supabase, Prisma, PostgreSQL.

---

## Current State Summary

**Already compliant:** HTTPS/HSTS, HttpOnly session cookies, MFA, RBAC, Zod validation, Prisma ORM
(no raw SQL), security headers (CSP, X-Frame-Options), no third-party analytics or tracking.

**PECR verdict:** Only strictly-necessary Supabase `sb-*` auth cookies are set → **no consent
banner needed** today. Add one if Stripe JS or any analytics is ever added.

**Gaps to fix (6 tracks, 4 phases):**

---

## Phase 1 — Legal Foundation + Consent at Signup

*No backend logic, minimal DB change. Ship first before any UK users onboard.*

### 1.1 Create legal pages

| File | Content |
|------|---------|
| `app/(public)/privacy/page.tsx` | Privacy policy (placeholder skeleton — legal team to populate) |
| `app/(public)/terms/page.tsx` | Terms of service (placeholder) |
| `app/(public)/cookies/page.tsx` | List `sb-*` cookies, purpose, HttpOnly/Secure, no analytics |
| `app/(public)/layout.tsx` | Minimal layout — no auth wrapper, no sidebar |

Cookie policy content for `cookies/page.tsx`:
```
Cookie         | Purpose               | Duration  | Type
sb-access-token | Authentication JWT   | Session   | Strictly necessary
sb-refresh-token | Session refresh     | 1 year    | Strictly necessary
```

### 1.2 Add footer links

Modify `app/(auth)/layout.tsx` and root dashboard layout — add a small footer:
```tsx
<footer className="text-xs text-ink-3 text-center py-4 border-t border-border/20">
  <Link href="/privacy">Privacy Policy</Link> ·
  <Link href="/terms">Terms</Link> ·
  <Link href="/cookies">Cookie Policy</Link>
</footer>
```

### 1.3 Consent at registration

**Schema change** (`prisma/schema.prisma`):
```prisma
// Add to model User:
accepted_privacy_at  DateTime?
accepted_terms_at    DateTime?
privacy_version      String?
terms_version        String?
```

**API change** (`app/api/v1/auth/register/route.ts`):
- Add `acceptedPrivacy: z.literal(true)` and `acceptedTerms: z.literal(true)` to Zod schema
- On success: `prisma.user.update({ accepted_privacy_at: new Date(), privacy_version: "1.0" })`
- Return 400 if either flag is false

**UI change** (`components/auth/register-form.tsx`):
- Add two required checkboxes below the password field:
  ```tsx
  <Checkbox required id="privacy" />
  <Label htmlFor="privacy">
    I agree to the <Link href="/privacy">Privacy Policy</Link>
  </Label>

  <Checkbox required id="terms" />
  <Label htmlFor="terms">
    I agree to the <Link href="/terms">Terms of Service</Link>
  </Label>
  ```
- Disable submit button until both are checked

**New config** (`configs/gdpr.config.ts`):
```ts
export const GDPR = {
  privacyPolicyVersion: "1.0",
  termsVersion: "1.0",
  retention: {
    timeEntriesDays: 365 * 3,   // 3 years
    leaveRecordsDays: 365 * 7,  // 7 years (UK statutory)
    tasksDays: 365 * 3,
    deletedUserGraceDays: 30,
  },
} as const;
```

---

## Phase 2 — Data Subject Rights

*Core GDPR obligations. Art 15 (access), Art 17 (erasure), Art 20 (portability).*

### 2.1 Right to Access + Portability

**New file:** `app/api/v1/users/export/route.ts`
```ts
// GET /api/v1/users/export
// Auth: requireUser() — user gets own data only
// Returns: all personal data as JSON attachment
export async function GET(req: Request) {
  const user = await requireUser(req);
  const [meta, timeEntries, tasks, leaves] = await Promise.all([
    prisma.userMetaData.findUnique({ where: { user_id: user.id } }),
    prisma.timeEntry.findMany({ where: { user_id: user.id } }),
    prisma.task.findMany({ where: { user_id: user.id } }),
    prisma.leave.findMany({ where: { user_id: user.id } }),
  ]);
  const payload = { user, metadata: meta, time_entries: timeEntries, tasks, leaves };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="my-data-${new Date().toISOString().slice(0,10)}.json"`,
    },
  });
}
```

Add to `lib/infra/api.ts`:
```ts
users: {
  export: () => axiosService.get("/v1/users/export", { responseType: "blob" }),
}
```

**UI:** Add to `components/dashboard/settings/profile-meta-section.tsx`:
```tsx
<Button variant="outline" size="sm" onClick={handleExport}>
  Download my data
</Button>
```

### 2.2 Right to Erasure (with 30-day grace period)

**Schema change** (`prisma/schema.prisma`):
```prisma
model DeletionRequest {
  id            String    @id @default(uuid())
  user_id       String    @unique
  user          User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  requested_at  DateTime  @default(now())
  scheduled_for DateTime  // requested_at + 30 days
  status        String    @default("pending") // pending | completed | cancelled
  completed_at  DateTime?
  created_at    DateTime  @default(now())
}

// Also add to model User:
deleted_at       DateTime?          // soft-delete for grace period
deletion_request DeletionRequest?
```

**New files:**
- `app/api/v1/users/deletion-request/route.ts`
  - `POST` → create DeletionRequest (`scheduled_for = now + 30d`), return `{ scheduledFor }`
  - `DELETE` → cancel pending request (must be within grace period)
- `app/api/v1/admin/deletion-requests/route.ts`
  - `GET` → list pending deletion requests (admin only)
  - `POST /[id]/process` → execute early deletion

**Scheduled task** (`lib/tasks/retention.ts`):
```ts
export async function runRetention() {
  // Hard-delete users past grace period
  const due = await prisma.deletionRequest.findMany({
    where: { status: "pending", scheduled_for: { lte: new Date() } }
  });
  for (const req of due) {
    await supabaseAdmin.auth.admin.deleteUser(req.user_id); // cascades Prisma records
    await prisma.deletionRequest.update({
      where: { id: req.id },
      data: { status: "completed", completed_at: new Date() }
    });
  }
}
```
Wire to a Supabase Edge Function with a daily cron, or call from an API route protected by a cron secret.

**UI in settings:**
```tsx
<Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
  Request account deletion
</Button>
// Dialog: explains 30-day grace period, what gets deleted, "Cancel" + "Confirm"
```

---

## Phase 3 — Audit Logging

*Accountability principle (Art 5(2)). Admin access to employee personal data must be logged.*

### 3.1 Schema + utility

**Schema change** (`prisma/schema.prisma`):
```prisma
model AuditLog {
  id          String   @id @default(uuid())
  actor_id    String
  actor_role  String
  action      String   // CREATE | READ | UPDATE | DELETE | EXPORT
  target_type String   // User | UserMetaData | Leave | TimeEntry | Task | DeletionRequest
  target_id   String
  fields      String[]
  before_json Json?
  after_json  Json?
  ip_address  String?
  created_at  DateTime @default(now())
}
```

**New utility** (`lib/utils/audit.ts`):
```ts
import { prisma } from "@/lib/infra/prisma";

interface AuditParams {
  actor_id: string;
  actor_role: string;
  action: "CREATE" | "READ" | "UPDATE" | "DELETE" | "EXPORT";
  target_type: string;
  target_id: string;
  fields?: string[];
  before?: object;
  after?: object;
  ip?: string;
}

export async function auditLog(params: AuditParams) {
  await prisma.auditLog.create({ data: { ...params, fields: params.fields ?? [] } });
}
```

### 3.2 Add audit calls to these routes

| Route file | Action | What to log |
|------------|--------|-------------|
| `app/api/v1/employees/route.ts` POST | CREATE | new user id |
| `app/api/v1/employees/[id]/route.ts` GET | READ | target user id, all fields |
| `app/api/v1/employees/[id]/route.ts` PATCH | UPDATE | changed fields, before/after |
| `app/api/v1/employees/[id]/route.ts` DELETE | DELETE | full snapshot before deletion |
| `app/api/v1/request/[id]/approve` and reject | UPDATE | leave id, old→new status |
| `app/api/v1/users/export/route.ts` GET | EXPORT | actor id + target user id |
| `app/api/v1/users/deletion-request/route.ts` POST | DELETE | user id, scheduled_for |

Extract IP from request headers: `req.headers.get("x-forwarded-for") ?? "unknown"`

### 3.3 Admin audit log viewer

**New endpoint:** `app/api/v1/admin/audit-logs/route.ts`
```ts
// GET /api/v1/admin/audit-logs?target_id=&action=&from=&to=&page=
// Auth: requireAdmin()
// Returns: paginated AuditLog records, newest first
```

**New page:** `app/(protected)/dashboard/audit/page.tsx`
- Admin-only, add to RBAC config
- Table columns: Time, Actor, Action, Target, Fields changed
- Filter by action type and date range
- Link from the admin sidebar or Settings page

---

## Phase 4 — Special Category Data Protection + Retention

### 4.1 Encrypt passport + visa fields

**New utility** (`lib/utils/encrypt.ts`):
```ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex"); // 32-byte hex

export function encryptField(value: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptField(stored: string): string {
  const [ivHex, tagHex, encHex] = stored.split(":");
  const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(encHex, "hex")) + decipher.final("utf8");
}
```

Add to `.env.example`:
```
# 32-byte hex string for AES-256-GCM encryption of special-category data
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=
```

**Apply encryption in:**
- `app/api/v1/employees/[id]/route.ts` (PATCH) — encrypt before Prisma write
- `app/api/v1/users/meta/route.ts` (PATCH) — encrypt before Prisma write
- `app/api/v1/employees/[id]/route.ts` (GET) — decrypt after Prisma read
- `app/api/v1/users/meta/route.ts` (GET) — decrypt after Prisma read

Fields to encrypt: `passport_number`, `visa_status`, `visa_expiry`

### 4.2 Restrict sick leave reason

In `app/api/v1/request/route.ts` (admin list query), exclude `reason` from the select:
```ts
// Admin list view — omit reason to minimise health data exposure
select: {
  id: true, start: true, end: true, type: true, status: true,
  user: { select: { id: true, name: true, email: true } },
  // reason intentionally excluded from list — available on single-record GET only
}
```

Add audit log call when admin fetches a sick-type leave record individually.

### 4.3 Data retention

Soft-delete — add to `prisma/schema.prisma`:
```prisma
// In model User:
deleted_at DateTime?
```

Update `GET /api/v1/employees` query:
```ts
where: { deleted_at: null, ...existingFilters }
```

Extend `lib/tasks/retention.ts` (from Phase 2) with retention cleanup:
```ts
// Delete time entries older than 3 years
await prisma.timeEntry.deleteMany({
  where: { created_at: { lt: subDays(new Date(), GDPR.retention.timeEntriesDays) } }
});
// Delete leave records older than 7 years
await prisma.leave.deleteMany({
  where: { created_at: { lt: subDays(new Date(), GDPR.retention.leaveRecordsDays) } }
});
```

---

## Files to Create

| File | Phase |
|------|-------|
| `app/(public)/privacy/page.tsx` | 1 |
| `app/(public)/terms/page.tsx` | 1 |
| `app/(public)/cookies/page.tsx` | 1 |
| `app/(public)/layout.tsx` | 1 |
| `configs/gdpr.config.ts` | 1 |
| `app/api/v1/users/export/route.ts` | 2 |
| `app/api/v1/users/deletion-request/route.ts` | 2 |
| `app/api/v1/admin/deletion-requests/route.ts` | 2 |
| `lib/tasks/retention.ts` | 2 |
| `lib/utils/audit.ts` | 3 |
| `app/api/v1/admin/audit-logs/route.ts` | 3 |
| `app/(protected)/dashboard/audit/page.tsx` | 3 |
| `lib/utils/encrypt.ts` | 4 |

## Files to Modify

| File | Change | Phase |
|------|--------|-------|
| `prisma/schema.prisma` | Add AuditLog, DeletionRequest; extend User with consent + soft-delete fields | 1-4 |
| `components/auth/register-form.tsx` | Add privacy + terms checkboxes | 1 |
| `app/api/v1/auth/register/route.ts` | Validate consent, record accepted_privacy_at | 1 |
| `app/(auth)/layout.tsx` | Add legal footer | 1 |
| `lib/infra/api.ts` | Add `users.export()` | 2 |
| `components/dashboard/settings/profile-meta-section.tsx` | Add export + deletion request buttons | 2 |
| `app/api/v1/employees/route.ts` | auditLog() on CREATE | 3 |
| `app/api/v1/employees/[id]/route.ts` | auditLog() on GET/PATCH/DELETE; encrypt/decrypt | 3, 4 |
| `app/api/v1/request/route.ts` | Omit sick leave reason from admin list | 4 |
| `app/api/v1/users/meta/route.ts` | Encrypt/decrypt passport + visa on read/write | 4 |
| `.env.example` | Add ENCRYPTION_KEY | 4 |

---

## Implementation Order

```
Phase 1 (Sprint 1)
  └─ Legal pages → footer links → consent DB fields → register form checkboxes → register API

Phase 2 (Sprint 2)
  └─ Export endpoint + UI → DeletionRequest schema → deletion endpoints → deletion UI → retention task

Phase 3 (Sprint 2-3)
  └─ AuditLog schema → audit.ts utility → add calls to employee/leave/export routes → audit viewer page

Phase 4 (Sprint 3-4)
  └─ encrypt.ts → apply to passport/visa routes → restrict sick leave reason → soft-delete → retention cleanup
```

---

## Verification Checklist

- [ ] Register without checking boxes → form does not submit
- [ ] `accepted_privacy_at` + `privacy_version` saved in DB after registration
- [ ] `/privacy`, `/terms`, `/cookies` load without 404; footer links visible in auth + dashboard layouts
- [ ] "Download my data" → JSON file downloads containing all data categories
- [ ] "Request account deletion" → DeletionRequest row created with correct `scheduled_for`
- [ ] Cancel deletion within grace period → status set to `cancelled`
- [ ] Cron task processes overdue DeletionRequests → user hard-deleted, cascade confirmed
- [ ] Admin views employee profile → AuditLog `READ` entry created
- [ ] Admin updates employee salary → AuditLog `UPDATE` with `before_json` + `after_json`
- [ ] `passport_number` in DB is AES-256-GCM ciphertext (not plaintext)
- [ ] Admin list of leave requests does not include `reason` field
- [ ] Sick leave single-record GET does include `reason` (for approver only)
- [ ] Audit log admin page renders with recent entries, actor, action, timestamp
- [ ] `prisma validate` passes clean
- [ ] `tsc --noEmit` passes clean

---

## Sub-processor DPA Checklist

- [ ] Supabase — sign DPA at supabase.com/dpa; confirm project region is EU/UK
- [ ] Stripe — sign DPA at stripe.com/legal/dpa (before activating payments)
- [ ] Vercel / hosting — sign DPA in provider dashboard
- [ ] Register with ICO and pay annual data protection fee (ico.org.uk)
