# Tickylo — Security Checklist

> Last updated: 2026-05-14

---

## Must-Have Security Items

1. ✅ HTTP security headers — CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
2. ✅ Supabase session cookies — httpOnly, secure, SameSite=Lax
3. ✅ Auth middleware — all protected routes require valid session via `requireUser()` / `requireAdmin()`
4. ✅ Role-based access control (RBAC) — role enforced at middleware + handler level from JWT claim
5. ✅ Multi-tenant org isolation — `withOrg()` on every Prisma query; cross-tenant leak structurally impossible
6. ✅ Input validation — Zod schema on every route before any service call
7. ✅ SQL injection prevention — zero raw queries; all Prisma parameterized
8. ✅ XSS prevention — no `dangerouslySetInnerHTML` in application code
9. ✅ Secret exposure — no sensitive keys with `NEXT_PUBLIC_` prefix; `SUPABASE_SERVICE_ROLE_KEY` server-only
10. ✅ Safe error messages — routes return generic errors to client; no stack traces leaked
11. ✅ Cron job auth — `Authorization: Bearer <CRON_SECRET>` required
12. [ ] Rate limiting on public auth endpoints — `POST /api/auth/apply`, `POST /api/auth/join`, `GET /api/auth/join/check` (brute force / credential stuffing risk)
13. [ ] Rate limiting on authenticated write routes — all `POST` / `PATCH` / `DELETE /api/v1/*` (per-user throttle)
14. [ ] Pagination bounds — cap `limit` to 100 on all list endpoints (unbounded DB query risk)
15. [ ] Bulk array bounds — cap bulk ID arrays at 500 on all bulk routes (`bulkDelete`, `bulkMarkRead`, `bulkTicketAction`)
16. [ ] Request body size limit — cap JSON payload size on comment and bulk routes
17. [ ] Fail2ban / IP blocking — Cloudflare proxy (free) or Vercel WAF for sustained attack mitigation
18. [ ] Audit log full coverage — add `auditLog()` to all unlogged write operations (deleteTicket, completeTicket, holdTicket, stopTimer, deleteEntry, mergeEntries, cancelRequest, deleteComment, etc.)
19. [ ] Audit log UI — admin-only view at `/dashboard/audit-logs`; super_admin sees all orgs, admin sees their org only
20. [ ] Explicit CORS policy — declare `Access-Control-Allow-Origin` in `next.config.ts` (currently implicit same-origin only)
21. [ ] CSP nonce — replace `unsafe-inline` with nonce-based CSP in `middleware.ts`
22. [ ] Supabase service role key audit — confirm `lib/supabase/admin.ts` is never imported in client components
23. [ ] `.env` hygiene — `.env.local` in `.gitignore`, `.env.example` with placeholders, no secrets logged in CI
24. [ ] Cron secret rotation schedule — rotate `CRON_SECRET` quarterly; log cron invocations to audit log
