# System Architecture — Senior Engineer Playbook

Five reference projects + Tickworks as a real-world case study. Each section covers: system design → code structure → database → deployment → testing → monitoring → scaling → maintenance.

---

# 1) 📚 Learning Management System (LMS) — like your capstone

## 🧠 Senior thinking first

"Schools will grow. Teachers will upload heavy content. Students will peak during exams. System must not break under load spikes."

So the design goal is:

> scalable content delivery + clean role separation + safe progress tracking

---

## 🏗️ Architecture style

* Modular Monolith first (NOT microservices yet)
* Event-driven internally (for progress, notifications)

---

## 📦 Backend structure (Node.js example)

```
/src
  /modules
    /auth
    /users
    /courses
    /classes
    /modules
    /assessments
    /progress
    /notifications
    /announcements

  /shared
    /database
    /middlewares
    /utils
    /errors
    /events

  /config
  /jobs
  /tests
```

---

## 🗄️ Database design (MySQL)

Senior rule:

> "Design around relationships, not screens"

Core tables:

* users
* teachers
* courses
* classes
* modules
* assessments
* submissions
* progress
* announcements
* notifications

Key design decisions:

* foreign keys everywhere
* indexed `user_id`, `class_id`
* separate `progress` instead of embedding inside users

---

## ⚡ Event-driven logic

When student submits assessment:

```
AssessmentSubmittedEvent
   → update progress
   → trigger notification
   → log analytics
```

No tight coupling between modules.

---

## 📬 Notifications system

Senior design:

* queue-based (Redis + BullMQ)

Types:

* email
* in-app notifications
* optional SMS later

---

## 🧪 Testing strategy

* Unit tests: services only
* Integration tests: API + DB
* E2E: student flows (login → submit → grade)

Tools:

* Jest
* Supertest

---

## 🚀 Deployment

* Frontend: Firebase Hosting or Vercel
* Backend: Docker + AWS ECS or EC2
* DB: AWS RDS MySQL

CI/CD:

* GitHub Actions
* steps:

  * lint
  * test
  * build
  * deploy

---

## 📊 Monitoring

* logs: Winston + CloudWatch
* errors: Sentry
* metrics:

  * request latency
  * failed submissions
  * DB slow queries

---

## 🔥 Scaling decision

Senior rule:

> "Don't microservice early"

But later:

* split notification service
* split analytics service

---

# 2) 🧑‍💼 Job Application Tracker (SaaS)

## 🧠 Thinking

"This is a SaaS product. Needs multi-tenancy, data privacy, and fast UX."

---

## 🏗️ Architecture

* Full SaaS backend
* Multi-tenant DB design

---

## 📦 Backend modules

```
auth
users
companies
job_applications
resume_generator
cover_letter_ai
tracking
billing
notifications
```

---

## 🗄️ Database (critical design)

Each table includes:

```
tenant_id
user_id
```

Why?

> to isolate users in same database safely

---

## 🤖 AI features

* resume tailoring (OpenAI API)
* job description parsing
* match scoring system

---

## 📬 Notifications

* application follow-ups
* interview reminders
* weekly progress summary

Queue system required.

---

## 💳 Billing

* Stripe integration
* subscription tiers:

  * free (limited applications)
  * pro (AI features)
  * enterprise (teams)

---

## 🚀 Deployment

* Backend: AWS ECS or Railway
* DB: Postgres (better than MySQL for SaaS)
* Redis: caching + queues

---

## 📊 Monitoring

* Stripe events monitoring
* user funnel tracking
* error tracking (Sentry)
* feature usage analytics

---

## 🔥 Scaling path

* start monolith
* extract AI service later

---

# 3) 🛒 E-commerce Platform

## 🧠 Thinking

"Traffic spikes during sales. Inventory consistency is critical. Payment must never fail silently."

---

## 🏗️ Architecture

* Event-driven + modular services

---

## 📦 Modules

```
auth
products
inventory
cart
orders
payments
shipping
reviews
notifications
admin
```

---

## 🗄️ Database design

Critical design:

* product table separate from inventory
* orders immutable after creation

Key tables:

* products
* stock
* carts
* orders
* order_items
* payments

---

## ⚡ Event flow

Order placed:

```
OrderCreated
  → reserve stock
  → process payment
  → confirm order
  → notify user
```

If payment fails:
→ release stock automatically

---

## 💳 Payments

* Stripe / PayPal
* webhook-based confirmation

Never trust frontend payment success.

---

## 📬 Notifications

* order confirmation
* shipping updates
* delivery tracking

---

## 🚀 Deployment

* frontend: CDN (Cloudflare)
* backend: load balanced (AWS ALB)
* DB: PostgreSQL + read replicas

---

## 📊 Monitoring

* payment failure rate
* checkout conversion
* inventory mismatch alerts

---

## 🔥 Scaling

* cache product catalog (Redis)
* CDN for images
* queue order processing

---

# 4) 📱 Social Media App (Instagram-like)

## 🧠 Thinking

"This is read-heavy + media-heavy system. Focus: performance + storage + feeds."

---

## 🏗️ Architecture

* microservices later
* media pipeline required

---

## 📦 Services

```
auth-service
user-service
post-service
feed-service
media-service
notification-service
```

---

## 🗄️ Database

* users
* posts
* likes
* comments
* follows

---

## 🧠 Feed system (VERY IMPORTANT)

Senior approach:

> Don't query feed live every time

Use:

* precomputed feed (fan-out on write)

OR hybrid:

* cache + ranking algorithm

---

## 📦 Media storage

* S3 (images/videos)
* CDN (CloudFront)

---

## 📬 Notifications

* likes
* comments
* follows

Real-time via:

* WebSockets

---

## 🚀 Deployment

* Kubernetes (later stage)
* autoscaling workers

---

## 📊 Monitoring

* feed latency
* upload failures
* CDN bandwidth usage

---

## 🔥 Scaling challenges

* viral posts → cache explosion
* heavy read traffic → CDN required

---

# 5) 💬 Real-time Chat App (Slack/WhatsApp style)

## 🧠 Thinking

"This is real-time system. Latency is EVERYTHING."

---

## 🏗️ Architecture

* event-driven + WebSockets

---

## 📦 Modules

```
auth
users
chats
messages
presence
notifications
media
```

---

## 🧠 Core design decision

Use:

* WebSockets (Socket.io or native WS)
* Redis pub/sub for scaling sockets

---

## 🗄️ Database

* users
* conversations
* messages
* message_status

---

## ⚡ Message flow

```
User sends message
 → WebSocket server
 → store in DB
 → publish event via Redis
 → deliver to recipient servers
```

---

## 📬 Notifications

* offline users → push notification
* email fallback optional

---

## 🚀 Deployment

* multiple WebSocket servers behind load balancer
* Redis for state sync

---

## 📊 Monitoring

* message latency (<100ms target)
* dropped messages
* connection stability

---

## 🔥 Scaling

* shard conversations
* use Kafka later for message streaming

---

# 6) 🎫 Tickworks — Workforce & IT Service Management SaaS

## 🧠 Senior thinking first

"This is an internal operations tool for companies. Multiple orgs share one database — isolation is critical. Approval chains must be airtight. Employees and admins have completely different views of the same data."

So the design goal is:

> safe multi-tenant RBAC + ITIL-style ticket workflows + real-time UI without page reloads

---

## 🏗️ Architecture style

* **Fullstack Monolith** — Next.js 15 App Router (frontend + API routes in one repo)
* **No separate backend server** — API routes under `/app/api/v1/` serve as the REST layer
* **Modular by domain** — each feature (tickets, time, requests, employees) is self-contained

Why monolith? The team is small, deployment is one unit, and Next.js collocates API + UI naturally. Splitting into microservices would add ops overhead with no benefit at this scale.

---

## 📦 Code structure

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
      ticket/           — CRUD + all action sub-routes
      task/             — Legacy alias (re-exports ticket routes)
      employees/        — Employee management
      request/          — Leave requests
      time/             — Time entries + timer
      notifications/    — In-app notification system
      dashboard/        — Role-aware dashboard data
      performance/      — Metrics aggregation
      reports/          — Admin report generation
      users/            — Profile + metadata

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
    stripe.ts           — Stripe client
  auth/
    require-user.ts     — Supabase session check (any authenticated user)
    require-admin.ts    — Role check (admin only)
  utils/
    format.ts           — ALL date/time/number formatters (DRY rule)
    response.ts         — ok(), errorResponse() builders
    create-notification.ts — Notification factory (createNotification, notifyAdmins, notifyEmployees)
    cn.ts               — Tailwind class merge
  middlewares/
    auth.middleware.ts  — Route protection + MFA enforcement + RBAC

services/               — Business logic layer (planned — see SERVICES.md)
hooks/                  — Custom React hooks (planned)

configs/
  rbac.config.ts        — ROLES constants + route permission map
prisma/
  schema.prisma         — Single source of DB truth
store/
  auth-slice.ts         — Redux: user role + org_id
providers/              — React context wrappers (QueryClient, Redux, UserProvider)
```

---

## 🗄️ Database design (PostgreSQL via Supabase)

Senior rule applied:

> "Org isolation via `org_id` on every entity — not separate schemas"

**Core models:**

| Model | Purpose |
|---|---|
| `User` | Supabase-managed auth; extended via `UserMetaData` |
| `UserMetaData` | Employee profile fields (salary, leave balances, visa, etc.) |
| `Task` | The ticket entity (maps to `tickets` table) |
| `TaskComment` | Comments thread per ticket |
| `TaskWatcher` | Who is subscribed to a ticket |
| `TaskSubtask` | Checklist items per ticket |
| `TimeEntry` | Clock-in/out records, linked optionally to a ticket |
| `LeaveRequest` | Employee leave requests with approval flow |
| `Notification` | In-app notification inbox |
| `DueDateRequest` | Employee requests to change ticket due date |
| `ReopenRequest` | Employee requests to reopen a completed ticket |
| `TransferRequest` | Employee requests to transfer ticket to another person |

**Key design decisions:**

* `org_id` on every model — single-DB multi-tenancy, filtered at query level
* `user_id` nullable on Task — null = unassigned pool; assigned = specific employee
* Approval states modeled as separate tables (`DueDateRequest`, `ReopenRequest`, `TransferRequest`) not as status flags — preserves full history and allows concurrent request tracking
* `pending_actions: string[]` computed at list query time — avoids N+1 and gives the frontend a single signal for the amber badge indicator
* All timestamps in UTC; client passes `tz_offset` for display purposes only

---

## ⚡ Ticket workflow (ITIL-style state machine)

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

Each state transition is a **dedicated route** (`/claim`, `/start`, `/complete`, `/hold`, `/reopen`, `/stale`) — not a generic PATCH with `{ status }`. This enforces the state machine at the API layer.

**Approval chains supported:**
* Due date change — employee requests → admin approves/rejects
* Reopen — employee requests → admin approves/rejects
* Transfer — employee requests → admin picks new assignee (not just approves — must assign atomically)
* Ticket creation by employee — goes to `needs_approval` first

---

## 🔐 Auth & RBAC

```
Browser request
  → middleware.ts
    → Supabase session valid? → No → redirect /login
    → MFA enrolled? → AAL2 required? → redirect /mfa-challenge
    → RBAC config check → route allowed for this role?
    → Yes → handler
      → requireUser() or requireAdmin() (second check inside handler)
      → business logic
```

Roles: `admin` | `employee` — stored in Supabase `app_metadata.role` (JWT claim, zero DB lookup at middleware).

`org_id` also in `app_metadata` — every query filters by org automatically.

---

## 📬 Notification system

**Design:** Supabase Realtime subscription on the `Notification` table — no WebSocket server needed.

```
API route action (e.g. approve ticket)
  → createNotification({ user_id, type, title, body, link })  [fire-and-forget]
  → Supabase Realtime broadcasts INSERT event
  → Client NotificationProvider receives event
  → Bell badge increments instantly
  → Panel shows new notification
```

`notifyAdmins()` and `notifyEmployees()` are helpers that query org users by role and bulk-insert notifications.

Why not queues for notifications? Volume doesn't justify BullMQ overhead yet. Redis is available for the future upgrade path.

---

## ⏱️ Time tracking

```
POST /api/v1/time         → creates TimeEntry with start_time = now (no end_time)
GET  /api/v1/time/active  → returns the open entry (used by timer widget on every page)
PATCH /api/v1/time/:id    → sets end_time + title/description (stop timer)
```

The global timer widget polls `active` on mount and subscribes to query invalidation. Starting/stopping from any page (including ticket detail) updates the widget everywhere via React Query cache.

---

## 🧪 Testing strategy (current + target)

**Current:** No automated tests (startup phase — manual QA via dev server)

**Target approach:**

* Unit: service functions only (`services/*.service.ts`) — pure input/output, no HTTP
* Integration: API routes with a test DB — seed org, run full request cycle, assert DB state
* E2E (future): Playwright — employee flow (login → claim ticket → start → complete) + admin flow (create → assign → approve → close)

**Why not mock Prisma?** Test DB is safer — mocked tests have passed while prod migrations broke. Always test against real DB schema.

---

## 🚀 Deployment

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

Stripe
  └── Subscription billing (Pro plan)
  └── Customer portal
```

CI/CD via GitHub Actions:
1. `tsc --noEmit` (type check)
2. `prisma validate` (schema check)
3. `next build` (build check)
4. Deploy to Vercel on merge to `main`

---

## 📊 Monitoring (current gaps → target)

| Signal | Current | Target |
|---|---|---|
| Runtime errors | `console.error` only | Sentry |
| Slow DB queries | None | Prisma query events + threshold alert |
| Auth failures | Supabase logs | Forward to dashboard |
| API latency | None | Vercel Analytics or Datadog |
| Notification delivery | None | Failed notification log |
| Stripe events | Stripe dashboard | Webhook + internal log |

Key metrics to track:
* Ticket creation → completion average time (SLA proxy)
* Timer sessions per day (product health)
* Failed approval actions (workflow health)
* Leave request volume by type (capacity planning)

---

## 🔥 Scaling decisions

**Current bottlenecks to watch:**

| Concern | Risk | Mitigation |
|---|---|---|
| Ticket list with complex filters | Slow at 10k+ tickets | Add composite indexes on `(org_id, status, created_at)` |
| `notifyAdmins()` fan-out | Slow if org has 50+ admins | Move to BullMQ background job |
| Real-time notifications | Supabase Realtime has connection limits | Upgrade plan or move to dedicated WS |
| Prisma calls in route handlers | No caching layer | Add Redis cache for read-heavy endpoints (employee list, dashboard) |
| Multi-tenant query isolation | `org_id` filter must never be missed | Add Prisma middleware that enforces `org_id` on every query automatically |

**Future extraction candidates (when justified):**
* Notification service → extract when volume exceeds synchronous threshold
* Analytics/reporting → extract to read replica queries
* AI performance insights → separate service (Claude/Bedrock API)

---

## 🏗️ Current architecture gaps (honest assessment)

| Gap | Impact | Priority |
|---|---|---|
| No service layer — business logic in route handlers | Hard to test, hard to reuse | High |
| No DAL — Prisma called directly in routes | Can't swap DB, no query reuse | High |
| Status/priority style maps duplicated across components | Every new status needs 3+ edits | Medium |
| Empty `/services` and `/hooks` dirs | Confusion for new devs | Medium |
| No request audit log | Can't answer "who did what when" | High (GDPR) |
| `task` vs `ticket` naming inconsistency | Cognitive overhead, confuses new devs | Medium |
| No error boundaries in UI | Silent failures on network errors | Medium |
| Optimistic updates only on 7 operations | Perceived slowness on toggles | Low |

See `docs/SERVICES.md` for the services layer refactor plan.
See `docs/GDPR.md` for the compliance roadmap.
See `docs/MUTATIONS.md` for optimistic vs pessimistic mutation strategy.

---

# 🧠 FINAL SENIOR ARCHITECT MINDSET

A senior architect always thinks:

### 1. Start simple

> "Monolith first, split later if needed"

### 2. Design around failure

> "What breaks when traffic spikes?"

### 3. Data is the core

> "UI changes. Data structure survives years."

### 4. Everything is observable

> logs, metrics, traces are not optional

### 5. Decouple everything possible

> services communicate via events, not direct calls

### 6. Applied to Tickworks specifically

> "Org isolation is your #1 invariant. Every query must filter by org_id. Every approval must be atomic. Every state transition must be a named endpoint, not a raw status update."
