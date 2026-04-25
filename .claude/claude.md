# Workflow Orchestration

## 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

## 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

## 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

## 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

## 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

## 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

# Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

# Project Services & Conventions

## Pre-built Folders — Check these before creating anything new

| Folder                | Purpose                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `lib/infra/axios.ts`  | Singleton HTTP client — reusable `get`, `post`, `put`, `delete` with auto 401 redirect                   |
| `lib/infra/api.ts`    | **All API URLs live here**, grouped by domain. Add new endpoints here, never hardcode URLs in components |
| `lib/utils/format.ts` | **ALL** formatting/conversion helpers go here — dates, durations, initials, input converters, ms→hours, etc. NEVER define these inline in components |
| `lib/utils/cn.ts`     | Tailwind class merging ONLY (`cn`) — not for general utilities                                           |
| `configs/`            | App-wide constants (RBAC rules, auth routes, etc.)                                                       |
| `providers/`          | React context providers — check here before writing a new one                                            |

## Key utility functions already in `lib/utils/format.ts`

Date helpers: `toDateStr`, `todayDateStr`, `daysAgoDateStr`, `startOfMonthDateStr`, `startOfLastMonthDateStr`, `endOfLastMonthDateStr`
Display formatters: `formatDate`, `formatTime`, `formatDuration` (HH:MM:SS), `formatDurationBetween` (compact "2h 30m", seconds rounded), `formatDurationMs` (accurate "Xh Ym Zs" from ms), `formatDayLabel` (weekday label), `formatInitials`
Number/time: `msToHours`, `avgHours`
Input helpers: `toDateInput` (ISO → `<input type="date">` value), `toIntInput` (number|null → string)

**DRY rule**: Before writing any formatting/conversion function in a component, check `lib/utils/format.ts` first. If it doesn't exist there, add it there — never inline it.

## UI Components — Always use shadcn/ui wrappers, never raw HTML equivalents

| Need                | Use (from `@/components/ui/`)                                                      |
| ------------------- | ---------------------------------------------------------------------------------- |
| Dropdown/select     | `SelectRoot`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`        |
| Dialog/modal        | `DialogRoot`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`      |
| Button              | `Button` — supports `variant`, `size`, `isLoading` props                           |
| Text input          | `Input` — never raw `<input>` except inside shadcn components                      |
| Label               | `Label` — pairs with `htmlFor`                                                     |
| Card layout         | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`                |

**Never use raw `<select>`, `<input>` (standalone), or `<button>` directly in page/feature components.**

## HTTP Requests — Layer order: api.ts → axios.ts → React Query

- **NEVER** import `axios` directly in components
- **ALL API URLs** must be defined in `lib/infra/api.ts` — never hardcode in components
- `axios.ts` baseURL is `/api` — so paths in `api.ts` start with `/v1/...` (not `/api/v1/...`), and direct axiosService calls use `/auth/...` (not `/api/auth/...`)
- **Import React Query directly** from `@tanstack/react-query` — no wrapper:
  - `useQuery({ queryKey, queryFn: () => APIService.x.list() })` — for GET
  - `useMutation({ mutationFn: (data) => APIService.x.create(data), onSuccess })` — for mutations
  - `useQueryClient` — import from `@tanstack/react-query` directly
  - `isAxiosError` from `axios` is acceptable for error type-checking only

# Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

# Real-Time Data & State Updates

Every CRUD operation **must** reflect immediately in the UI without a page reload. This is non-negotiable.

## React Query invalidation after mutations

After every `useMutation` `onSuccess`, invalidate the relevant query keys:

```ts
const { mutateAsync } = useMutation({
  mutationFn: (data) => APIService.x.update(id, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["resource", id] });
    queryClient.invalidateQueries({ queryKey: ["resources"] }); // list view
  },
});
```

- Always invalidate **both** the detail query (`["resource", id]`) and the list query (`["resources"]`) when updating a single resource.
- If a mutation affects multiple resources (e.g. approve writes to two models), invalidate all affected query keys.

## Controlled vs uncontrolled inputs

**Never use `defaultValue` for inputs that display server-fetched data.** `defaultValue` is uncontrolled — React ignores prop changes after mount, so data updated via mutations will silently not reflect.

- Use `defaultValue` only for truly static defaults that never change.
- For inputs displaying server data that can change, either:
  - Use controlled `value` + `onChange` state
  - Or add `key={serverValue ?? "fallback"}` to force a remount when the value changes (acceptable for simple inline edit inputs)

```tsx
// WRONG — won't update when ticket.due_date changes after approve mutation
<input type="datetime-local" defaultValue={toDatetimeInput(ticket.due_date)} />

// CORRECT — remounts when due_date changes, picking up the new defaultValue
<input key={ticket.due_date ?? "none"} type="datetime-local" defaultValue={toDatetimeInput(ticket.due_date)} />
```

## Architecture for scalable ticket-level signals

When adding a new pending action type (e.g. a new approval flow, a transfer request):

1. **Backend** (`app/api/v1/task/route.ts` GET handler): include the new model in findMany, push a new string identifier into the `pending_actions` array.
2. **Types** (`components/dashboard/tasks/types.ts`): `pending_actions` is already typed as `string[]` — no change needed.
3. **Table** (`tasks-table.tsx`): the amber `Clock` dot appears automatically because it checks `pending_actions.length > 0`.
4. **Detail page** (`tickets/[id]/page.tsx`):
   - Add to the `pendingActions` derived array.
   - Add a new section inside the "Pending Actions" sidebar card (follow the existing due-date section as a template).
   - The header badge count updates automatically.
