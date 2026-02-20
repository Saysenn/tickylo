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

| Folder | Purpose |
|---|---|
| `services/axios.ts` | Singleton HTTP client — reusable `get`, `post`, `put`, `delete` with auto 401 redirect |
| `services/api.ts` | **All API URLs live here**, grouped by domain. Add new endpoints here, never hardcode URLs in components |
| `utils/` | Generic reusable helpers (date/string formatting, etc.) — if it's not component-specific, it goes here |
| `lib/utils.ts` | Tailwind class merging ONLY (`cn`) — not for general utilities |
| `configs/` | App-wide constants (RBAC rules, auth routes, etc.) |
| `hooks/` | Custom React hooks — check here before writing a new one |

## HTTP Requests — Layer order: api.ts → axios.ts → React Query
- **NEVER** import `axios` directly in components
- **ALL API URLs** must be defined in `services/api.ts` — never hardcode in components
- `axios.ts` baseURL is `/api` — so paths in `api.ts` start with `/v1/...` (not `/api/v1/...`), and direct axiosService calls use `/auth/...` (not `/api/auth/...`)
- **Import React Query directly** from `@tanstack/react-query` — no wrapper:
  - `useQuery({ queryKey, queryFn: () => APIService.x.list() })` — for GET
  - `useMutation({ mutationFn: (data) => APIService.x.create(data), onSuccess })` — for mutations
  - `useQueryClient` — import from `@tanstack/react-query` directly
  - `isAxiosError` from `axios` is acceptable for error type-checking only

## Utility Functions
- Generic helpers (formatters, string/date utils) → `utils/` folder
- `lib/utils.ts` is for `cn` (Tailwind) only
- Never write a reusable utility inline inside a component

## Patterns to follow
- Check `services/`, `hooks/`, `lib/`, `configs/`, `utils/` before creating anything — it likely exists
- Follow existing file naming conventions (kebab-case for files, PascalCase for components)
- Read the file before editing it

# Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.