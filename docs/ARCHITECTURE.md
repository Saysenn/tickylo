# Tickworks — Architecture Reference

> Workforce & IT Service Management SaaS. Multi-tenant, role-based, ITIL-style ticket workflows.

---

## Senior thinking

"This is an internal operations tool for companies. Multiple orgs share one database — isolation is critical. Approval chains must be airtight. Employees and admins have completely different views of the same data."

Design goal:

> safe multi-tenant RBAC + ITIL-style ticket workflows + real-time UI without page reloads

---

## Architecture style

- **Fullstack Monolith** — Next.js 15 App Router (frontend + API routes in one repo)
- **No separate backend server** — API routes under `/app/api/v1/` serve as the REST layer
- **Service layer** — all business logic lives in `services/*.service.ts`, routes are thin transport wrappers
- **Modular by domain** — each feature (tickets, time, requests, employees) is self-contained

Why monolith? The team is small, deployment is one unit, and Next.js collocates API + UI naturally. Splitting into microservices adds ops overhead with no benefit at this scale.

---

## Code structure

```
app/
  (auth)/               — Login, register, forgot password pages
  (protected)/
    dashboard/
      tickets/          — Ticket list + detail pages
      employees/        — Team management (admin only)
      requests/         — Leave request management
      time-manager/     — Time tracking
      performance/      — Admin performance view
      reports/          — Admin reports
      settings/         — Profile + 2FA
  api/
    v1/
      ticket/           — CRUD + all action sub-routes (canonical)
      task/             — Legacy alias (re-exports from ticket/)
      employees/        — Employee management
      request/          — Leave requests
      time/             — Time entries + timer
      notifications/    — In-app notification system
      dashboard/        — Role-aware dashboard data
      department/       — Department CRUD
      performance/      — Metrics aggregation
      reports/          — Admin report generation
      users/            — Profile + metadata

services/               — ALL business logic lives here
  ticket.service.ts     — Tickets, comments, subtasks, watchers, bulk ops, reopen/transfer/due-date request flows
  request.service.ts    — Leave requests + bulk delete
  employees.service.ts  — Employee CRUD + workload
  time.service.ts       — Timer start/stop, entry CRUD, bulk delete, merge
  notifications.service.ts — Notification list, read, mark-all-read, bulk delete
  department.service.ts — Department CRUD
  analytics.service.ts  — Performance metrics + reports aggregation
  dashboard.service.ts  — Role-aware dashboard stats (admin + employee views)
  users.service.ts      — User metadata get + upsert

components/
  dashboard/
    tasks/              — Ticket table, form, subtasks, thread, types
    time-tracker/       — Timer widget, entry list, summary
    requests/           — Leave request table + dialogs
    employees/          — Employee table, detail panels
    notifications/      — Bell + notification panel
  ui/                   — Radix-based component library (Button, Dialog, Select...)

lib/
  infra/
    api.ts              — ALL API URLs (single source of truth)
    axios.ts            — Singleton HTTP client (auto 401 redirect)
    prisma.ts           — Prisma singleton (global scope in dev)
    redis.ts            — Redis client
  auth/
    require-user.ts     — Supabase session check (any authenticated user)
    require-admin.ts    — Role check (admin only)
  utils/
    format.ts           — ALL date/time/number formatters (DRY rule)
    response.ts         — ok(), errorResponse() builders
    create-notification.ts — Notification factory (createNotification, notifyAdmins, notifyEmployees, notifyWatchers)
    audit.ts            — Fire-and-forget auditLog() for tracking who did what
    org-filter.ts       — withOrg() helper — enforces org_id on every Prisma where clause
    cn.ts               — Tailwind class merge

configs/
  rbac.config.ts        — ROLES constants + route permission map
prisma/
  schema.prisma         — Single source of DB truth
store/
  auth-slice.ts         — Redux: user role + org_id
providers/              — React context wrappers (QueryClient, Redux, UserProvider)
```

---

## Route → Service contract

Routes are pure transport: authenticate → validate input (Zod) → call service → return response.
Services own all business logic: Prisma queries, notifications, audit logs, state machine enforcement.

```ts
// Route (transport only)
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const validated = schema.safeParse(await req.json());
  if (!validated.success) return errorResponse(validated.error.issues[0]?.message, 400);

  const result = await TicketService.createTicket(user, validated.data);
  return ok(result, 201);
}

// Service (business logic)
export async function createTicket(caller: Caller, data: CreateTicketData) {
  // status machine, org scoping, notifications, audit log
}
```

---

## Database design (PostgreSQL via Supabase)

Senior rule applied:

> "Org isolation via `org_id` on every entity — not separate schemas"

**Core models:**

| Model | DB Table | Purpose |
|---|---|---|
| `User` | `users` | Supabase-managed auth; extended via `UserMetaData` |
| `UserMetaData` | `user_meta_data` | Employee profile fields (salary, leave balances, visa, etc.) |
| `Ticket` | `tasks` | The ticket entity |
| `TicketComment` | `task_comments` | Comments thread per ticket |
| `TicketWatcher` | `task_watchers` | Who is subscribed to a ticket |
| `TicketSubtask` | `task_subtasks` | Checklist items per ticket |
| `TimeEntry` | `time_entries` | Clock-in/out records, linked optionally to a ticket |
| `Leave` | `leaves` | Employee leave requests with approval flow |
| `Notification` | `notifications` | In-app notification inbox |
| `DueDateRequest` | `due_date_requests` | Employee requests to change ticket due date |
| `ReopenRequest` | `reopen_requests` | Employee requests to reopen a ticket |
| `TransferRequest` | `transfer_requests` | Employee requests to transfer ticket to another person |
| `AuditLog` | `audit_logs` | Immutable record of who did what and when |
| `Department` | `departments` | Org departments for employee grouping |

**Key design decisions:**

- `org_id` on every model — single-DB multi-tenancy, filtered at query level via `withOrg()`
- `user_id` nullable on Ticket — null = unassigned pool; assigned = specific employee
- Approval states as separate tables (`DueDateRequest`, `ReopenRequest`, `TransferRequest`) — preserves full history, allows concurrent request tracking
- `pending_actions: string[]` computed at list query time — avoids N+1, gives frontend a single signal for the amber badge indicator
- All timestamps in UTC; client passes `tz_offset` for display conversion only
- Prisma model names match domain language (`Ticket`, not `Task`) — DB table names preserved via `@@map()` for zero-migration rename

---

## Ticket workflow (ITIL-style state machine)

```
[Created by admin]        [Created by employee]
     ↓                          ↓
  pending                  needs_approval
  assigned                      ↓ (admin approves)
     ↓                       pending
  [employee claims]             ↓
  assigned ──────────────→  assigned
     ↓
  in_progress
     ↓
  completed ←──── [admin can reopen] ←── reopen_request (employee)
     ↓
  [admin can mark stale]
  stale
     ↓
  on_hold  ←── [admin can hold at any stage]
```

Each state transition is a **dedicated route** (`/claim`, `/start`, `/complete`, `/hold`, `/reopen`, `/stale`) — not a generic PATCH with `{ status }`. This enforces the state machine at the API layer and in service functions.

**Approval chains:**
- Due date change — employee requests → admin approves/rejects (atomic: updates due_date + closes request)
- Reopen — employee requests → admin approves/rejects (atomic: updates status + closes request)
- Transfer — employee requests → admin picks new assignee (atomic: reassigns + closes request)
- Ticket creation by employee — goes to `needs_approval` first

---

## Auth & RBAC

```
Browser request
  → middleware.ts
    → Supabase session valid? → No → redirect /login
    → MFA enrolled? → AAL2 required? → redirect /mfa-challenge
    → RBAC config check → route allowed for this role?
    → Yes → handler
      → requireUser() or requireAdmin() (second check inside handler)
      → service call
```

Roles: `admin` | `employee` — stored in Supabase `app_metadata.role` (JWT claim, zero DB lookup at middleware).
`org_id` also in `app_metadata` — every service call extracts it and passes it through `withOrg()`.

---

## Audit log

Every write operation that touches sensitive data calls `auditLog()` fire-and-forget:

```ts
auditLog({
  org_id, actor_id, actor_role,
  action: "APPROVE",          // CREATE | READ | UPDATE | DELETE | APPROVE | REJECT | CLAIM | COMPLETE | HOLD | REOPEN | TRANSFER
  entity_type: "ticket",      // ticket | employee | leave_request | time_entry
  entity_id: id,
  before: { status: "pending" },
  after: { status: "approved" },
});
```

Never blocks the main response — write failure is silently swallowed. Table: `audit_logs`.

---

## Notification system

**Design:** Supabase Realtime subscription on the `Notification` table — no WebSocket server needed.

```
Service action (e.g. approveTicket)
  → createNotification({ user_id, type, title, body, link })  [fire-and-forget]
  → Supabase Realtime broadcasts INSERT event
  → Client NotificationProvider receives event
  → Bell badge increments instantly
  → Panel shows new notification
```

`notifyAdmins()` and `notifyEmployees()` bulk-insert to all users of that role in the org.
`notifyWatchers()` notifies all ticket watchers, excluding a specified set of already-notified users.

---

## Time tracking

```
POST  /api/v1/time          → startTimer() — creates open TimeEntry; auto-transitions ticket to in_progress
GET   /api/v1/time/active   → getActiveTimer() — open entry for current user (drives global timer widget)
PATCH /api/v1/time/:id      → stopTimer() — sets end_time; auto-reverts ticket to assigned
PUT   /api/v1/time/:id      → updateEntry() — edit title/description/timestamps on completed entry
DELETE /api/v1/time/:id     → deleteEntry()
DELETE /api/v1/time/bulk    → bulkDelete()
POST  /api/v1/time/merge    → mergeEntries() — collapses N entries into one, summing durations
```

The global timer widget polls `active` on mount and subscribes to React Query invalidation. Starting/stopping from any page updates the widget everywhere via cache.

---

## Testing strategy

**Current:** No automated tests (startup phase — manual QA via dev server)

**Target approach:**

- Unit: service functions only (`services/*.service.ts`) — pure input/output, no HTTP, no mocking needed
- Integration: API routes with a test DB — seed org, run full request cycle, assert DB state
- E2E (future): Playwright — employee flow (login → claim ticket → start → complete) + admin flow (create → assign → approve → close)

**Why not mock Prisma?** Test DB is safer — mocked tests have passed while prod migrations broke. Always test against real DB schema.

---

## Deployment

```
Vercel (Next.js fullstack)
  └── App Router handles both UI + API routes
  └── Edge middleware for auth + RBAC

Supabase (managed)
  └── PostgreSQL (primary DB)
  └── Auth (JWT, OAuth, MFA)
  └── Realtime (notification delivery)
  └── Storage (future: attachments)

Redis (Upstash or self-hosted)
  └── BullMQ job queue (cron jobs, heavy background tasks)
  └── Rate limiting (future)
```

CI/CD via GitHub Actions:
1. `tsc --noEmit` — type check
2. `prisma validate` — schema check
3. `next build` — build check
4. Deploy to Vercel on merge to `main`

---

## Monitoring (current → target)

| Signal | Current | Target |
|---|---|---|
| Runtime errors | `console.error` only | Sentry |
| Slow DB queries | None | Prisma query events + threshold alert |
| Auth failures | Supabase logs | Forward to dashboard |
| API latency | None | Vercel Analytics or Datadog |
| Audit trail | `audit_logs` table | Admin UI + export |
| Stripe events | Stripe dashboard | Webhook + internal log |

Key metrics to track:
- Ticket creation → completion average time (SLA proxy)
- Timer sessions per day (product health)
- Failed approval actions (workflow health)
- Leave request volume by type (capacity planning)

---

## Scaling decisions

| Concern | Risk | Mitigation |
|---|---|---|
| Ticket list with complex filters | Slow at 10k+ tickets | Add composite indexes on `(org_id, status, created_at)` |
| `notifyAdmins()` fan-out | Slow if org has 50+ admins | Move to BullMQ background job |
| Real-time notifications | Supabase Realtime has connection limits | Upgrade plan or move to dedicated WS |
| Read-heavy endpoints (dashboard, employee list) | Repeated identical queries | Add Redis cache layer |
| Multi-tenant query isolation | `org_id` filter must never be missed | `withOrg()` enforced in every service; Prisma middleware as future safety net |

**Future extraction candidates (when justified):**
- Notification service → extract when volume exceeds synchronous threshold
- Analytics/reporting → extract to read replica queries
- AI performance insights → separate service (Claude/Bedrock API)

---

## Architecture invariants

1. **Every Prisma query in a service uses `withOrg()`** — cross-tenant data leak is never possible by accident
2. **Routes never contain business logic** — auth check + input parsing only; all logic in services
3. **State transitions are named endpoints** — never a raw `{ status: "..." }` PATCH
4. **Approval operations are atomic** — always inside `prisma.$transaction()`
5. **Notifications are fire-and-forget** — `.catch(() => {})` — never block a response on notification delivery
6. **Audit log is fire-and-forget** — same rule — failure must never surface to the user
7. **All API URLs in `lib/infra/api.ts`** — never hardcoded in components
8. **All formatters in `lib/utils/format.ts`** — never inlined in components
