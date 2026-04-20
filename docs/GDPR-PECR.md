# UK GDPR & UK PECR Compliance Guide

Applies to: Tickworks and any Next.js / Node.js web application handling UK user data.

---

## What These Regulations Are

**UK GDPR** (Data Protection Act 2018) — governs how you collect, store, use, and delete personal
data for individuals in the UK. Enforced by the ICO. Max fine: £17.5 million or 4% of global turnover.

**UK PECR** (Privacy and Electronic Communications Regulations 2003) — governs cookies, electronic
marketing, and communications. Sits alongside UK GDPR. Primarily relevant for cookie consent and
marketing emails.

---

## PECR — Cookie Compliance

### When you DO NOT need a consent banner
- Your cookies are **strictly necessary** (session auth, load balancing, fraud prevention)
- Example: Supabase `sb-*` auth cookies — no consent needed

### When you DO need a consent banner
- Analytics cookies (Google Analytics, Mixpanel, PostHog)
- Marketing / retargeting pixels (Meta, Google Ads)
- Embedded third-party content (YouTube, Intercom chat)
- Any cookie that persists beyond the session for non-functional purposes

### What you always need
- A **Cookie Policy page** listing every cookie, its purpose, duration, and whether it is strictly
  necessary or optional
- Link to that page in the site footer

### Cookie banner implementation (when required)
- Show on first visit, before non-essential scripts load
- Store consent choice (accept / reject / preferences) in a strictly-necessary cookie
- Respect the choice on every subsequent page load — do not load non-essential scripts unless
  consent is recorded as accepted
- Provide a way to withdraw consent at any time (e.g. "Cookie settings" link in footer)

---

## UK GDPR — The 8 Principles (Art 5)

| # | Principle | Plain meaning |
|---|-----------|---------------|
| 1 | Lawfulness, fairness, transparency | You have a legal reason to process. Users know about it. |
| 2 | Purpose limitation | Only use data for the stated purpose. |
| 3 | Data minimisation | Collect only what you actually need. |
| 4 | Accuracy | Keep data correct and up-to-date. |
| 5 | Storage limitation | Delete data when you no longer need it. |
| 6 | Integrity & confidentiality | Protect data from breach, loss, or unauthorised access. |
| 7 | Accountability | Be able to prove you comply. Document everything. |
| 8 | (Cross-border) | Only transfer outside UK to countries with adequate protection. |

---

## Lawful Basis Cheat-Sheet (Art 6 + Art 9)

Use this to decide which basis applies before collecting each data category.

| Data type | Use this basis |
|-----------|---------------|
| Name, email, job role (employee) | **Contract** — needed to perform the employment contract |
| Time tracking, task assignments, performance metrics | **Legitimate interests** — employer managing workforce |
| Date of birth, phone, address | **Contract** or **Legitimate interests** (e.g. payroll, emergency contact) |
| Salary | **Contract** (payroll) or **Legal obligation** (tax, employment law) |
| Sick leave, health-related absence | **Special category — Explicit consent** (Art 9(2)(a)) or **Legal obligation** |
| Passport number, visa / immigration status | **Legal obligation** (right-to-work checks) — document the legal requirement |
| Marketing emails | **Consent** — explicit opt-in required; easy opt-out always available |
| Analytics / behavioural tracking | **Consent** (via cookie banner) |

> **Special-category data** (health, immigration, biometrics, etc.) requires **both** a Art 6 basis
> AND an Art 9 condition. Explicit consent is the safest for optional fields.

---

## Technical Compliance Checklist

### 1. Legal pages
- [ ] `/privacy` — privacy policy covering: who you are, what data, why, how long, user rights, contact
- [ ] `/terms` — terms of service
- [ ] `/cookies` — cookie disclosure (see PECR section above)
- [ ] Footer links to all three on every page (auth + app)

### 2. Consent at sign-up
- [ ] Checkbox: "I agree to the Privacy Policy" (required, not pre-ticked)
- [ ] Checkbox: "I agree to the Terms of Service" (required, not pre-ticked)
- [ ] Store `accepted_privacy_at`, `accepted_terms_at`, and policy version in DB
- [ ] Update consent record if policy version changes and user logs in

### 3. Right to Access + Portability (Art 15, 20)
- [ ] `GET /api/users/export` — returns all personal data as JSON
  - Include: profile, metadata, behavioural data (time entries, tasks), sensitive records (leaves)
  - Response header: `Content-Disposition: attachment; filename="my-data-YYYY-MM-DD.json"`
- [ ] "Download my data" button in account settings, calls the above endpoint

### 4. Right to Erasure (Art 17)
- [ ] User can request deletion from account settings
- [ ] Implement a **grace period** (30 days recommended) before hard-deleting
  - Create a `DeletionRequest` table: `user_id`, `requested_at`, `scheduled_for`, `status`
  - Allow user to cancel within the grace period
- [ ] After grace period: hard-delete user and cascade to all personal data
- [ ] Scheduled job (cron / edge function) that runs the hard-delete daily
- [ ] Admin can see and process deletion requests

### 5. Right to Rectification (Art 16)
- [ ] Users can edit their own personal data (name, phone, address, etc.)
- [ ] Document this capability in the privacy policy

### 6. Audit log for admin actions
Required for accountability (Art 5(2)). Admins can access large volumes of employee personal data.
- [ ] `AuditLog` table: `actor_id`, `actor_role`, `action`, `target_type`, `target_id`, `fields[]`,
  `before_json`, `after_json`, `created_at`
- [ ] Log on: employee profile READ, UPDATE, DELETE; leave approval; data export; deletion request
- [ ] Admin-only UI page to view the audit log
- [ ] Utility: `auditLog({ actor, action, target, fields, before, after })`

### 7. Encrypt special-category data at rest
Fields that are Article 9 (health, immigration) or high-sensitivity (government IDs, salary):
- [ ] Encrypt before writing to DB: `passport_number`, `visa_status`, `visa_expiry`
- [ ] Decrypt on read; never return raw ciphertext to the client
- [ ] Use AES-256-GCM; key stored in environment variable (`ENCRYPTION_KEY`)
- [ ] Do not log decrypted values anywhere

### 8. Data retention schedule
- [ ] Define retention periods per data category (example: employment records → 3 years,
  statutory leave records → 7 years per UK employment law)
- [ ] Add `deleted_at` to User for soft-delete; filter `WHERE deleted_at IS NULL` in queries
- [ ] Scheduled cleanup task that deletes records past their retention date

### 9. Restrict health data access
- [ ] Sick leave `reason` field: omit from bulk admin list responses; only expose on single-record
  fetch to the approving manager
- [ ] Log any admin access to sick leave records in the audit log

### 10. Security baseline
- [ ] HTTPS enforced everywhere (HSTS header)
- [ ] `HttpOnly`, `Secure`, `SameSite` on session cookies
- [ ] Input validation on all API endpoints (Zod or equivalent)
- [ ] Parameterised queries / ORM (no raw SQL string concatenation)
- [ ] RBAC — least-privilege access to each endpoint
- [ ] CSP, X-Frame-Options, X-Content-Type-Options security headers
- [ ] MFA available to users

---

## Tickworks — Current Gaps

| Requirement | Status | Priority |
|-------------|--------|----------|
| Privacy / Terms / Cookie pages | Missing | P0 |
| Consent checkboxes at registration | Missing | P0 |
| Data export endpoint | Missing | P1 |
| User-initiated deletion + grace period | Missing | P1 |
| Audit log for admin actions | Missing | P1 |
| Encrypt passport, visa fields | Missing | P1 |
| Restrict sick leave reason in list view | Missing | P1 |
| Data retention schedule | Missing | P2 |
| Soft-delete for Users | Missing | P2 |
| Footer legal links | Missing | P0 |
| HTTPS / security headers | **Done** | — |
| HttpOnly session cookies | **Done** | — |
| MFA support | **Done** | — |
| RBAC | **Done** | — |
| Input validation (Zod) | **Done** | — |
| No third-party analytics | **Done** | — |

---

## Sub-processors & DPA

Every third-party service that processes personal data on your behalf needs a **Data Processing
Agreement (DPA)**.

| Service | Role | DPA available? | Action needed |
|---------|------|----------------|---------------|
| **Supabase** | Auth + database | Yes (supabase.com/dpa) | Confirm UK/EU data residency in Supabase dashboard; sign DPA |
| **Stripe** | Payments | Yes (stripe.com/legal/dpa) | Sign DPA before activating payments |
| **Vercel / hosting** | Infrastructure | Yes | Sign DPA |
| Redis Cloud (if used) | Cache | Varies by provider | Confirm provider; sign DPA |

Keep a **sub-processor register** (a simple table in docs or a spreadsheet):
`Processor | Purpose | Data transferred | DPA signed | Region | Last reviewed`

---

## Common Myths — What You Don't Need

| Myth | Reality |
|------|---------|
| "All apps need a cookie consent banner" | Only needed for non-essential cookies. Strictly-necessary auth cookies are exempt. |
| "You need consent for all data processing" | Consent is just one of six lawful bases. Contract and legitimate interests often apply to employee data. |
| "GDPR only applies to EU companies" | UK GDPR applies if you target UK users, regardless of where your company is based. |
| "GDPR requires you to delete data immediately on request" | You have one month to respond to erasure requests. A grace period before deletion is lawful if justified. |
| "Anonymised data is still personal data" | Truly anonymised data (cannot be re-identified) is outside GDPR scope. Pseudonymised data (can be re-identified with a key) is still in scope. |

---

## ICO Resources

- Register with ICO (required if you process personal data in the UK): ico.org.uk
- Data Protection Fee: payable annually (most SMEs pay Tier 1: £40/year)
- Report a data breach within 72 hours: ico.org.uk/report-a-concern
- DPIA (Data Protection Impact Assessment) required if high-risk processing (biometrics, large-scale
  health data, systematic monitoring of employees at scale)
