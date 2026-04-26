# Mutation Strategy: Optimistic vs Pessimistic

## Optimistic — update UI before server confirms

These are pure toggles or soft state changes. No server-side business logic can reject them for non-trivial reasons. Safe to roll back via toast on failure.

| Operation | Location | Why optimistic |
|---|---|---|
| `watchTicket` / `unwatchTicket` | Ticket detail | Pure toggle, always succeeds for auth'd user |
| `toggleSubtask` (complete/incomplete) | Ticket detail | Pure boolean flip, no business rules |
| `postReaction` / toggle reaction | Thread | Pure toggle per user+emoji |
| `readOne` notification | Notifications panel | Can't fail — just marks a row |
| `readAll` / `bulkRead` notifications | Notifications panel | Same — no validation needed |
| `bulkDelete` notifications | Notifications panel | Soft delete, user-owned data |
| `updateBillable` | Ticket detail | Inline number edit, no gating |

---

## Pessimistic — wait for server, then reflect

### Status transitions
Can be rejected due to current state, race conditions, or role restrictions.

| Operation | Why pessimistic |
|---|---|
| `claimTask` | Race — two employees can try to claim simultaneously |
| `startTask` | Status machine — must be in `assigned` |
| `completeTask` | Can be blocked by open subtasks or permissions |
| `reopenTask` | Gated by role; admin-only path |
| `holdTicket` | Status transition with side effects |
| `staleTicket` | Admin-only status write |
| `approveTicket` / `rejectTicket` | Admin-only, creates notification |
| `adminReopenTask` | Writes status + system comment |
| `requestReopen` / approval / rejection | Creates DB records, notifies users |
| `requestTransfer` / approval / rejection | Reassigns ticket, creates notifications |
| `approveDueDateRequest` / `rejectDueDateRequest` | Writes to two tables + notifications |
| `createDueDateRequest` | Server validates no existing pending request |

### Destructive operations
Irreversible — never optimistic.

| Operation | Why pessimistic |
|---|---|
| `removeTask` | Irreversible |
| `deleteEntry` (time) | Irreversible |
| `bulkDelete` (time) | Irreversible |
| `deleteComment` | Irreversible |
| `clearAllComments` | Irreversible |
| `deleteRequest` (leave) | Irreversible |
| `bulkDelete` (leave requests) | Irreversible |
| `deleteEmployee` | Irreversible |
| `removeSubtask` | Irreversible |

### Timer operations
Server records timestamps — must confirm before reflecting state.

| Operation | Why pessimistic |
|---|---|
| `startTimer` | Server records `start_time = now`; must confirm before showing "active" |
| `stopTimer` | Server sets `end_time`, computes duration; can fail if session expired |

### Approval workflows
Multi-step side effects (balance deduction, email, notifications).

| Operation | Why pessimistic |
|---|---|
| `approveRequest` (leave) | Deducts leave balance, notifies |
| `rejectRequest` (leave) | Creates audit record |
| `cancelRequest` (leave) | Status transition |
| `approveApplication` (super admin) | Creates org + sends email |
| `rejectApplication` (super admin) | Notifies applicant |

### Data writes with validation
Can fail uniqueness checks, schema validation, or org constraints.

| Operation | Why pessimistic |
|---|---|
| `createTask` | Schema validation, org limits possible |
| `updateTicket` | Could fail validation; also used for due date edits |
| `reassignTask` | Admin-only, changes ownership |
| `updateEmployee` / `updateMeta` | Could fail uniqueness constraints |
| `createEmployee` | Email uniqueness check |
| `updateLeaveBalance` | Arithmetic writes |
| `updateMeta` (profile) | Server validates field formats |
| `updateEntry` / `updateTimes` (time) | Overlap validation possible |
| `mergeEntries` (time) | Complex server operation |
| `bulkAction` (tickets) | Mixed operations, partial failure possible |
| `createRequest` (leave) | Validates date range and balance |
| `addSubtask` | Server assigns position |

---

## Implementation notes

- Optimistic pattern: `onMutate` → `setQueryData` → `onError` → rollback + toast → `onSettled` → `invalidateQueries`
- Pessimistic pattern: `mutationFn` → `onSuccess` → `invalidateQueries`
- Always `cancelQueries` before optimistic `setQueryData` to prevent race conditions with in-flight fetches
- Rollback toast is mandatory for optimistic mutations — without it, users silently see their action revert with no explanation
- Recommended toast library: [Sonner](https://sonner.emilkowal.ski/) (`npx shadcn@latest add sonner`)
