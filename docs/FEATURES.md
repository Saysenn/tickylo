# Tickworks — Feature Reference

## Leave Requests (`/dashboard/requests`)

### Business Rules
- Only employees can create leave requests
- Admins can approve or reject pending requests
- Employees can cancel or delete their own **pending** requests
- Approval deducts 1 day from the employee's `UserMetaData` leave balance
- Leave types: `sick`, `vacation`, `emergency`
- Statuses: `pending` → `approved` | `rejected` | `cancelled`

### RBAC
| Action         | Admin | Employee |
|----------------|-------|----------|
| View all       | ✅    | ❌ (own only) |
| Create         | ❌    | ✅       |
| Approve/Reject | ✅    | ❌       |
| Cancel         | ❌    | ✅ (pending only) |
| Delete         | ❌    | ✅ (pending only) |

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/v1/request` | List requests (role-aware) |
| POST   | `/api/v1/request` | Create leave request |
| PATCH  | `/api/v1/request/[id]/approve` | Admin approves |
| PATCH  | `/api/v1/request/[id]/reject` | Admin rejects |
| PATCH  | `/api/v1/request/[id]/cancel` | Employee cancels |
| DELETE | `/api/v1/request/[id]` | Employee deletes (pending only) |

---

## Tasks (`/dashboard/tasks`)

### Business Rules
- Only admins can create, update, and delete tasks
- Tasks can be created unassigned (status: `pending`) or assigned at creation (status: `assigned`)
- Employees see only tasks assigned to them + unassigned tasks they can claim
- Employees can claim an unassigned task (direct claim, no approval needed)
- After claiming: employee starts → completes
- Task flow: `pending` → `assigned` → `in_progress` → `completed`

### RBAC
| Action         | Admin | Employee |
|----------------|-------|----------|
| View all       | ✅    | ❌ (assigned to them) |
| Create         | ✅    | ❌       |
| Delete         | ✅    | ❌       |
| Assign         | ✅    | ❌       |
| Claim          | ❌    | ✅ (unassigned tasks) |
| Start          | ❌    | ✅ (assigned to them) |
| Complete       | ❌    | ✅ (in progress by them) |

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/v1/task` | List tasks (role-aware) |
| POST   | `/api/v1/task` | Admin creates task |
| PATCH  | `/api/v1/task/[id]` | Admin updates task |
| DELETE | `/api/v1/task/[id]` | Admin deletes task |
| PATCH  | `/api/v1/task/[id]/assign` | Admin assigns task |
| PATCH  | `/api/v1/task/[id]/claim` | Employee claims unassigned task |
| PATCH  | `/api/v1/task/[id]/start` | Employee starts task |
| PATCH  | `/api/v1/task/[id]/complete` | Employee completes task |

### Schema Notes
- `created_by` — the admin who created the task
- `user_id` — the assigned employee (nullable = unassigned pool)

---

## Time Manager (`/dashboard/time-manager`)

### Business Rules
- Each user manages their own time entries
- Toggle between **week** (last 7 days) and **month** (current calendar month)
- Summary shows: total hours, average per day, days worked
- Bar chart visualization grouped by day

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/v1/time/summary?view=week\|month` | Aggregated summary |
| GET    | `/api/v1/time` | Paginated entry list |
| POST   | `/api/v1/time` | Start timer |
| PATCH  | `/api/v1/time/[id]` | Stop timer (with title/desc) |
| GET    | `/api/v1/time/active` | Get active session |

---

## Employee Detail (`/dashboard/employees/[id]`)

### Business Rules
- Admin-only page
- Click any row in the employees table to navigate here
- Shows: profile, metadata, leave balances/history, assigned tasks, time entries (last 30 days)

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/v1/employees/[id]` | Full employee profile |
| PATCH  | `/api/v1/employees/[id]` | Update name/role |
| DELETE | `/api/v1/employees/[id]` | Remove employee |

---

## Notifications (Planned — Future Sprint)

**Recommendation:** Supabase Realtime + `Notification` DB table (no queue infrastructure needed at MVP scale).

### Trigger Points
- Leave request approved/rejected → notify employee
- Task assigned to employee → notify them
- Task claimed by employee → notify admin

### Implementation Steps (when ready)
1. Add `Notification` model to Prisma
2. Insert rows at the `// notify` comments in API routes
3. Subscribe via Supabase Realtime on the client
4. Bell icon in `header.tsx` with unread badge count

**Why not queues?** Redis is already available but adding BullMQ for simple notifications adds complexity without benefit at this scale. Wire up queues when notification volume demands it.
