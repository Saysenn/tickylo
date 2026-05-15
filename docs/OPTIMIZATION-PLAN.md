# Optimization Plan

Addresses performance degradation under user growth. Covers database, API, background jobs, and caching layers.

---

## The Problem

As org size and concurrent users grow, three things degrade:

1. **Slow queries** — `listTickets` joins 4 tables + computes time sums per row. `getReports` fetches all time entries for the month in memory and reduces in JS.
2. **Blocking API routes** — all heavy computation runs synchronously inside Next.js route handlers, tying up Node.js threads during every request.
3. **No caching** — every page load re-fetches counts, summaries, and employee lists that change infrequently.

---

## Layer 1 — Database Indexes (Do First, Zero Risk)

Indexes already exist on `org_id`, `status`, `user_id`, `due_date`. The gaps:

### Missing composite indexes on `tasks` (Ticket model)

```prisma
// Most list queries filter by org + status, org + user, org + due_date simultaneously
@@index([org_id, status, created_at])   // ticket list default sort
@@index([org_id, user_id, status])      // employee view filter
@@index([org_id, due_date])             // overdue filter
@@index([org_id, priority])             // priority filter
```

### Missing on `time_entries`

```prisma
@@index([org_id, start_time, end_time]) // team-summary range queries
@@index([user_id, start_time])          // per-employee summary
```

### Missing on `task_comments`

```prisma
@@index([task_id, created_at])          // comment list sort
```

**How to apply:** Add the indexes to `prisma/schema.prisma` then run `npx prisma db push`. No data loss, Postgres builds indexes online.

---

## Layer 2 — Fix the Expensive Queries

### `getReports` — replace findMany with aggregate

Currently fetches every time entry for the month into Node memory and reduces with JS:

```ts
// CURRENT (bad) — pulls all rows into memory
const timeThisMonth = await prisma.timeEntry.findMany({ where: { ...orgFilter, start_time: { gte: startOfMonth } } });
const totalMs = timeThisMonth.reduce(...);

// BETTER — single SQL SUM, nothing in memory
const agg = await prisma.timeEntry.aggregate({
  where: { ...orgFilter, start_time: { gte: startOfMonth }, end_time: { not: null } },
  _sum: { duration_ms: true },   // requires storing duration_ms on close
});
```

Alternative without schema change: use `$queryRaw` with `EXTRACT(EPOCH ...)` to compute the sum in Postgres.

### `listTickets` — replace timeEntries include with pre-aggregated field

Currently for each of the 10 paginated tickets, Prisma loads all time entries and sums them in JS. Replace with a raw subquery or a stored `total_time_ms` column updated on timer stop:

```ts
// Option A — raw subquery (no schema change)
// Add a Prisma $queryRaw that does a LEFT JOIN with SUM(EXTRACT(EPOCH...))

// Option B — denormalized column (best long-term)
// Add total_time_ms Int @default(0) on Ticket
// Increment it in the stopTimer service call
// Remove the timeEntries include from listTickets entirely
```

Option B removes the join completely. Ticket list queries become a single table scan.

---

## Layer 3 — Redis Caching (Already Have Infrastructure)

Redis is already set up (see `docs/REDIS-WORKER-SETUP.md`). Use it for reads that are expensive but change infrequently.

### What to cache

| Data | TTL | Invalidate on |
|---|---|---|
| `getReports` summary | 2 min | Any ticket/leave/time mutation |
| `task/stats` counts | 1 min | Ticket status change |
| Employee list | 5 min | Employee create/update/delete |
| Performance report | 5 min | Ticket complete, timer stop |
| Work schedule config | 10 min | Admin saves schedule |

### Implementation pattern

```ts
// lib/infra/cache.ts
import { redis } from "./redis";

export async function cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit) as T;
  const result = await fn();
  await redis.set(key, JSON.stringify(result), "EX", ttlSeconds);
  return result;
}

export async function invalidate(...keys: string[]) {
  if (keys.length) await redis.del(...keys);
}
```

```ts
// In getReports:
return cached(`reports:${orgId}`, 120, async () => {
  // existing query logic
});

// In createTicket / completeTicket onSuccess:
await invalidate(`reports:${orgId}`, `task-stats:${orgId}`);
```

Use `orgId` as part of every cache key so orgs never share cached data.

---

## Layer 4 — BullMQ Background Jobs

Move work that doesn't need to be synchronous out of API routes. Already have BullMQ set up.

### Candidates for background processing

| Task | Current | After |
|---|---|---|
| Email notifications (new ticket, assignment, comment) | Blocking in route handler | BullMQ `notifications` queue, worker sends async |
| Audit log writes | Synchronous DB insert on every action | Fire-and-forget queue, batch insert every 5s |
| Stale ticket detection (cron) | Already on cron — keep | Keep |
| Report generation (CSV export) | Synchronous, blocks for large orgs | Queue job, stream result or email link |
| Storage cleanup (orphaned attachments) | Not implemented | Nightly BullMQ cron job |

### Notification queue (highest priority)

```ts
// queues/notification.queue.ts
export const notificationQueue = new Queue("notifications", { connection: redis });

// In ticket.service.ts addComment — replace blocking sendEmail with:
await notificationQueue.add("comment", { ticketId, commentId, authorId, orgId });

// workers/notification.worker.ts
new Worker("notifications", async (job) => {
  // fetch data, send email/push — failure retries automatically
}, { connection: redis, concurrency: 5 });
```

---

## Layer 5 — API Route Hardening at Scale

### Connection pooling

Supabase (Postgres) has a connection limit per plan. With many concurrent Next.js serverless invocations, each creates its own Prisma client and connection. Fix:

- Use **PgBouncer** (already available in Supabase dashboard under Database → Connection Pooling)
- Switch connection string to the pooled URL (`port 6543` in Supabase) for all non-transaction queries
- Keep direct connection (`port 5432`) only for migrations

```env
# .env
DATABASE_URL="postgresql://...@db.xxx.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://...@db.xxx.supabase.co:5432/postgres"
```

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### Rate limiting

Add per-IP and per-org rate limits on expensive endpoints using Redis:

```ts
// middleware.ts or per-route
const key = `ratelimit:${orgId}:reports`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 60);
if (count > 30) return errorResponse("Too many requests", 429);
```

Priority endpoints to protect: `/api/v1/reports`, `/api/v1/time/team-summary`, `/api/v1/task/stats`.

---

## Layer 6 — Frontend Query Optimization

### Stale-while-revalidate tuning

Most React Query calls use default `staleTime: 0` — every focus refetches. For slow-changing data:

```ts
// Reports, summaries, employee list — don't need fresh on every tab focus
useQuery({ queryKey: ["task-stats"], staleTime: 60_000 })      // 1 min
useQuery({ queryKey: ["reports"], staleTime: 120_000 })         // 2 min
useQuery({ queryKey: ["employees", page], staleTime: 300_000 }) // 5 min
```

### Pagination over infinite scroll

All list views are paginated — good. Ensure `ROWS_PER_PAGE` stays ≤ 20. Never fetch more than needed.

### Avoid query waterfalls

The ticket detail page likely triggers sequential queries (ticket → comments → attachments → watchers). Use `Promise.all` in the API route to fetch these in parallel, or consolidate into a single endpoint.

---

## Priority Order

| Priority | Item | Effort | Impact |
|---|---|---|---|
| 1 | Composite DB indexes | Low | High — immediate query speedup |
| 2 | Fix `getReports` aggregate | Low | High — eliminates full table scan |
| 3 | PgBouncer connection pooling | Low | High — prevents connection exhaustion |
| 4 | Redis cache for reports/stats | Medium | High — near-zero latency for summaries |
| 5 | BullMQ notification queue | Medium | Medium — frees route handlers |
| 6 | Denormalized `total_time_ms` on Ticket | Medium | Medium — removes per-ticket join |
| 7 | Frontend staleTime tuning | Low | Medium — fewer redundant fetches |
| 8 | Rate limiting on heavy endpoints | Low | Medium — protects under spike load |
| 9 | CSV report generation via queue | High | Low (for now) — only hurts at large orgs |

Items 1–3 can be done in an afternoon with no architectural risk. Items 4–6 require the Redis worker to be running in production.
