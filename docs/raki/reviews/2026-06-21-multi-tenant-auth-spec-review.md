# Spec Review — Multi-Tenant Authentication System Design

**Spec:** `docs/superpowers/specs/2024-06-20-multi-tenant-auth-design.md` (1228 lines, Status: Approved, v1.0)
**Review date:** 2026-06-21
**Reviewer:** reviewing-specs skill (high effort — 6 finder agents + verifier + architecture sweep)
**Verdict:** **NO-GO** — revise before planning

---

## Verdict: NO-GO

This spec cannot proceed to implementation planning without revision. It contains **8 CRITICAL findings**, including internal contradictions, code that cannot compile/run, an architecture that contradicts the actual implemented codebase, missing enforcement for the headline security features, and compliance claims with no backing controls. The spec's "Approved" status is not earned.

The design shows genuine security thought (hashed email-verification tokens, atomic single-use consumption, session fixation prevention, Argon2id parameters), but the verified findings show the spec was not reconciled against itself or against the codebase it modifies. Several defects (plaintext reset tokens, the broken ownership trigger, the fictional Redis session layer) would ship directly into production if implemented as written.

**Required before re-review:**
1. Fix all 8 CRITICAL findings.
2. Reconcile the spec against the existing `backend/crates/` implementation and migrations (the spec describes a parallel, conflicting stack).
3. Either build the COPPA compliance controls or retract the COPPA compliance claim.
4. Decide the authz enforcement architecture (middleware + DB-layer isolation) and show concrete call sites.

---

## Severity Summary

| Severity | Count | Findings |
|----------|-------|----------|
| CRITICAL | 8 | C1–C8 |
| MAJOR | 11 | M1–M11 |
| MINOR | 2 | N1–N2 |
| **Total verified** | **21** | 0 refuted |

---

## CRITICAL Findings (8)

### C1. Plaintext reset/invite tokens contradict the hashed-token security section
**Section:** Database Schema — Core Identity Tables (line 144) vs Password Reset Token Security (line 555)
**Quote (line 144):** `token VARCHAR(255) NOT NULL UNIQUE,`
**Quote (line 555):** `token_hash VARCHAR(255) NOT NULL UNIQUE,  -- SHA-256(token)`

`password_reset_tokens` is defined **twice** with contradictory columns and no reconciliation. A developer transcribing the canonical "Core Identity Tables" into forward-only migrations creates the **plaintext** table; the later "Password Reset Token Security" section redefines it as **hashed**. The `consume_token()` function (line 499) queries `WHERE token_hash = $1`, which fails against the line-144 schema. `tenant_invites` (line 197) also stores `token VARCHAR(255)` in plaintext with no hashing section anywhere, while `email_verification_tokens` (line 131) correctly uses `token_hash`. On a DB read-breach, plaintext reset tokens enable **mass account takeover** within their 15–60 min validity window; plaintext invite tokens enable arbitrary-role tenant infiltration.

**Fix:** Remove the line-144 plaintext definition. Ensure exactly one `CREATE TABLE password_reset_tokens` with `token_hash VARCHAR(255) NOT NULL UNIQUE`. Apply the same hashing to `tenant_invites.token`. Add a migration test asserting no plaintext token column exists.

---

### C2. Ownership-limit trigger is broken — blocks all tenant creation
**Section:** Atomic Ownership Limit (Database Enforcement)
**Quote (line 955):** `SELECT max_owned_tenants FROM user_limits WHERE user_id = NEW.owner_id`

The trigger is broken in two independent ways. (1) It queries `user_limits`, a table **never defined** anywhere in the schema (grep confirms a single occurrence — that line). The trigger raises `relation "user_limits" does not exist` on every tenant INSERT, **blocking all tenant creation**. (2) It does `SELECT COUNT(*) FROM tenants WHERE owner_id = NEW.owner_id` inside a `BEFORE INSERT` trigger with no `FOR UPDATE`/advisory lock; two concurrent `POST /tenants` requests both see COUNT=1 < 2 and both insert — the exact race the spec claims to "prevent atomically." The serializable-txn alternative (line 970) works but is presented as equivalent without flagging the trigger is non-functional, and it omits required retry-on-serialization-failure handling.

**Fix:** Delete the trigger approach and mandate the serializable-transaction path with retry logic, OR (a) define the `user_limits` table, (b) use `SELECT ... FOR UPDATE` or advisory lock, (c) add a concurrency test asserting exactly one of two simultaneous requests succeeds.

---

### C3. Spec describes a session architecture that contradicts the implemented codebase
**Section:** Session Store Consistency / Database Schema
**Quote (line 665):** `**Persistence Strategy:** Postgres-authoritative with Redis as read-through cache.`

The entire Redis-cache session layer is **greenfield fiction** relative to the repository. The implemented `klynt_domain::session::SessionStore` (`pg_session.rs`) and composition root are **Postgres-only**; ADR-0001 states Redis is wired solely for the rate limiter and idempotency, not sessions. The spec's `sessions` schema (`user_id_cached`, `email_cached`, `last_verified_at`, `version`) conflicts with live migration 0001 (`token UUID` PK + `tenant_memberships JSONB`, no cached/version columns). The `users` schema also conflicts (live table has `name`, `status`, `terms_*`, `TEXT password_hash`, `email_verified_at`; spec has `username`, `email_verified bool`, `VARCHAR(255) password_hash`). The spec is marked "Approved v1.0" but never references the existing migrations, ports, or ADR. An implementer would attempt `CREATE TABLE users` that collides with the existing table and build a Redis session layer against a `SessionStore` port that has no caching seam.

**Fix:** Re-base the spec on the actual `SessionStore` port and migrations. Decide explicitly: (1) extend the existing Postgres-only `SessionStore` and delete the dual-write/consistency section, or (2) introduce a new caching seam as a real new port with a migration. Mark the spec status as superseding the current implementation.

---

### C4. Permission enforcement chokepoint is missing — authz defaults to allow-all
**Section:** Permission Model / Trust Boundaries
**Quote (line 845):** `Access to tenant-internal data (courses, grades, student records) **always requires explicit tenant membership**.`

The spec defines a 3-tier permission model and a trust-boundary policy but **never specifies where authorization is enforced**. There is no Axum middleware, no `require_permission()` call site, no handler-level guard, and no domain-layer check shown anywhere — not even a sketch. Every endpoint in the API tree (`/tenants`, `/tenants/:id/members`, `/roles`, `DELETE /auth/sessions/:id`) is described without a single authorization precondition. The request-flow example (lines 77–88) has no auth-middleware step. Grep confirms every "enforce/enforcement" hit refers to other concerns (token replay, ownership limit, user-deletion FK); the only "Authorization" hit is the CORS header name. A permission model with no enforced chokepoint **defaults to allow-all**; one missed check on a tenant member/role endpoint leaks cross-tenant data. The spec itself labels tenant isolation "Critical for Education Platforms" (line 843) under FERPA/COPPA/GDPR.

**Fix:** Add an explicit, mandatory authorization layer with concrete call sites: an Axum middleware/extractor (e.g. `RequirePermission("tenant.manage_members")`) on every protected route, plus a tenant-context resolver that derives `tenant_id` from the request and verifies membership before the handler runs. Make deny-by-default the documented invariant and add a negative test (non-member → 403) for every tenant-scoped endpoint.

---

### C5. COPPA compliance is claimed but no controls exist
**Section:** Registration Flow / Security Design (Audit Logging)
**Quote (line 624):** `**Critical for FERPA/COPPA/GDPR compliance.** All security-relevant mutations must be logged immutably.`

The spec repeatedly claims COPPA/FERPA compliance, yet this is a foundation-phase **education** platform with: no minor/student user type, no age gate in registration, no verifiable parental consent (a COPPA legal requirement for under-13), and no guardian/parent data model. The `users` table has no DOB/age/parent linkage. Tenant-internal roles explicitly include "Student" (line 837), implying minors. "Consent management" is deferred to "Future Considerations" (line 1214) — but for an education platform serving children, parental consent is a **launch-blocker**, not a future enhancement. You cannot ship COPPA-compliant auth by logging events alone; audit logging neither establishes age nor obtains consent. A team implementing this spec believing the compliance claim would ship a product that is both non-compliant and falsely advertised as compliant, with real FTC penalty exposure.

**Fix:** Either (a) add a DOB/age declaration at registration, block under-13 self-registration, and implement verifiable parental consent before any minor account is activated; or (b) explicitly restrict the platform to 13+ in ToS with technical enforcement (age attestation + hard block) and **remove the COPPA compliance claim** from the spec. Either way, model student/parent/guardian entities before any student data is stored.

---

### C6. Redis HIT path serves revoked sessions — "Postgres wins" is unfulfilled
**Section:** Session Store Consistency / Failure Modes
**Quote (line 698):** `Redis-Postgres inconsistency | Postgres wins, rehydrate Redis`
**Quote (lines 676–680):** `Check Redis first (fast path)` → `If miss, fallback to Postgres`

The consistency guarantee is **contradicted by the documented read path**. On a Redis HIT, Postgres is never consulted. When revocation's Redis delete fails or races, a stale Redis entry for a session already revoked in Postgres is served as valid — the "not revoked" check has no Postgres backing on the hot path. The `sessions` table has no `revoked` flag (revocation = row DELETE), and `last_verified_at` exists in the schema but is never referenced by any logic. The 3-row failure table models neither the stale-Redis-hit direction nor any reconciliation path. The same gap applies to role-change invalidation: `update_member_role` commits Postgres then `redis.delete_pattern(...)`; "Force re-verification on next request" (line 719) only triggers on a Redis miss. This defeats revocation and session-invalidation-on-role-change — core security features — for up to the 7-day session TTL.

**Fix:** Make revocation safe by either (a) making Postgres the revocation authority on the read path (every hit verifies a cheap Postgres flag/version), or (b) version every Redis session entry and reject entries whose version < Postgres's current user-invalidation version. Define the reconciliation path for a stale Redis hit explicitly. Drop the "Postgres wins" claim unless the read path honors it.

---

### C7. Platform-tier RBAC has no backing schema — highest-privilege roles are unenforceable
**Section:** Roles & Permissions Tables / Permission Model
**Quote (line 239):** `role_id UUID NOT NULL REFERENCES tenant_roles(id) ON DELETE CASCADE`
**Quote (line 104):** `global_role VARCHAR(20) NOT NULL DEFAULT 'user'`

The "platform" tier of the 3-tier permission model has **no backing schema**. `role_permissions` joins ONLY to `tenant_roles(id)`; there is no `global_roles` table, no `global_role_permissions` mapping, and `users.global_role` is a bare unconstrained `VARCHAR(20)` with no CHECK/FK/enum. Yet the Permission Model defines Global Owner/Admin/User roles and `platform.manage_users / manage_tenants / view_analytics / manage_billing` permissions, and the trust-boundary section makes load-bearing claims ("Global Owners have break-glass access", "Global Admins can manage users, tenants, billing"). None of this is enforceable: there is no place in the DB that maps `global_role='admin'` to platform permissions, `global_role` accepts any arbitrary string, and there is no seed data or migration. The headline "3-tier permission model" has schema backing for only 2 tiers — the platform tier, the highest-privilege tier, is missing entirely.

**Fix:** Add a `global_roles` table with a CHECK constraint on legal values, plus a `global_role_permissions` mapping, and constrain `users.global_role` with a CHECK or FK. Seed the `platform.*` permission grants in a migration. Alternatively, model platform permissions as a special system tenant reusing the existing `role_permissions` machinery.

---

### C8. No DB-layer multi-tenant isolation — one missed WHERE = cross-tenant leak
**Section:** Database Schema (all multi-tenant tables) / Permission Model → Trust Boundaries
**Quote (line 845):** `Access to tenant-internal data ... **always requires explicit tenant membership**.`

Every tenant's data is co-located in shared tables (`tenants`, `user_tenant_memberships`, `audit_events`, `tenant_roles`, `role_permissions`, future content tables). The spec asserts platform-to-tenant isolation as a non-negotiable invariant but is **completely silent on how it is enforced at the data layer**. There is zero mention of PostgreSQL Row-Level Security, no `tenant_id NOT NULL` + mandatory-predicate pattern, no per-request GUC scheme, and no tenant-scoped repository trait the compiler can enforce. A grep for RLS/`current_setting`/`app.tenant_id`/tenant-scoped returns zero matches. The only DB-layer enforcement in the spec is for unrelated concerns (ownership-limit trigger, atomic token consumption). Isolation is 100% dependent on every single query remembering `WHERE tenant_id = $1` — on a multi-tenant education platform holding FERPA-protected grades/student records, one forgotten predicate is a full cross-tenant data leak, the cardinal multi-tenant failure mode. This is distinct from C4 (request-layer authz chokepoint); a correct middleware does not substitute for DB-layer isolation.

**Fix:** Enable `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` with `USING (tenant_id = current_setting('app.tenant_id')::uuid)` policies on every tenant-scoped table, set the GUC per-request in a middleware/transaction, and add integration tests asserting tenant B's principal cannot read any tenant A row. If RLS is rejected, mandate and lint-enforce a tenant-scoped query wrapper and document it as the single isolation mechanism.

---

## MAJOR Findings (11)

### M1. 3-tier custom-role RBAC is premature (YAGNI)
**Section:** Permission Model / Roles & Permissions Tables / Phase 3
The entire custom-role machinery (`permissions` catalog, `role_permissions` join, `tenant_roles` with `is_custom`/`is_system` flags, 5-endpoint role CRUD, `content.*` permissions) is built for a content system that does not exist. AGENTS.md confirms this is a "foundation scaffold" with no courses, grades, or tenant-internal content. The `content.*` permissions literally cannot be exercised. **Fix:** Cut Phase 3's custom-role CRUD; model fixed platform/tenant roles as Rust enums with hardcoded permission checks. Re-introduce RBAC when a content feature creates a driving requirement.

### M2. No User Stories section
**Section:** General (omission)
There is no "User Stories" section. The Registration Flow and Success Criteria use generic "User" with no persona or value statement. Personas are implied (Teacher, Student, Moderator, TA, Global Admin, Tenant Owner) but never given goals. For an education product with distinct personas (including COPPA-covered minors and guardians), stories are needed to validate the right thing was built. **Fix:** Add a User Stories section covering each persona; map functional requirements back to stories; cover edge personas (anonymous, first-run, churned, parent/guardian, minor student).

### M3. Headline NFRs are unverifiable
**Section:** Non-Functional Requirements / Health & Metrics Endpoints
The NFRs (99.9% uptime, <200ms p95, <10ms Redis) are asserted as success criteria but define zero measurement apparatus. `/metrics` is "Prometheus-style" with no metric names; grep for `alert|threshold|load.?test|k6|locust|synthetic` returns no matches. There is no way to detect a session-invalidation storm, cache-hit-rate collapse, or audit-write failures; the "no gaps in audit_events table" criterion has no completeness checker. **Fix:** Specify a metric catalogue and alert thresholds tied to the NFRs; add a k6/locust load test in CI; add a synthetic cross-subdomain-login monitor as the uptime-SLO probe.

### M4. Email is "(future)" but load-bearing for Phase 1
**Section:** Configuration / Registration Flow
SMTP is flagged `# Email (future)` (line 1142), yet the Phase 1 journey requires it: registration "send[s] verification email," the registration flow makes verification mandatory, and `EMAIL_NOT_VERIFIED` blocks login. The headline Phase 1 journey (register → verify → login → create tenant) cannot complete without an undeclared dependency. No fallback is defined. **Fix:** Promote email/SMTP to a Phase 1 declared dependency with a provider and success criterion, or define an explicit fallback (dev-mode direct-link verification).

### M5. Session invalidation `delete_pattern` is O(n), non-atomic, key layout undefined
**Section:** Session Invalidation on Permission Changes
**Quote (line 717):** `redis.delete_pattern(&format!("session:*:user_id:{}", user_id)).await?;`
`delete_pattern` maps to KEYS/SCAN — O(n) across all session keys, non-atomic (SCAN can miss keys created/rotated mid-scan), blocks/degrades Redis at scale. The Redis key layout that the pattern matches is **never defined** anywhere. There is no per-user reverse index (e.g. a `SET user_sessions:{user_id}`) that would make invalidation O(sessions-of-user). (Verified PLAUSIBLE — HIGH confidence.) **Fix:** Define the concrete Redis key schema; maintain a per-user reverse index or invalidation epoch; state KEYS-vs-SCAN and how concurrent rotation during scan is reconciled.

### M6. ~20 of 23 API endpoints lack contracts
**Section:** API Design
The route tree enumerates 23 endpoints but only 3 (`POST /auth/register`, `POST /auth/login`, `POST /tenants`) have request/response schemas and status codes. The other ~20 — including every permission-gated surface (`/members`, `/roles`), verify-email, forgot/reset-password, `GET /me`, `GET/DELETE /sessions` — have no contract. `INSUFFICIENT_PERMISSIONS` is never mapped to the endpoints that enforce it. The spec simultaneously claims OpenAPI 3.0, client-SDK generation, and contract testing as deliverables. **Fix:** Specify request/response schemas and status codes for every route, or explicitly scope a subset per phase; at minimum define the permission-gated endpoints so the authz model is contractually testable.

### M7. Role-change invalidation fails open on Redis error → 7-day privilege retention
**Section:** Session Invalidation on Permission Changes
`update_member_role` commits Postgres FIRST, then attempts `redis.delete_pattern()`. If Redis fails (transient blip, restart), the function returns `Err` but Postgres is already committed. Sessions remain in Redis with OLD permissions and are served on the fast path for up to `Max-Age=604800` (7 days). There is no Postgres-side epoch/version bump, no retry, no compensating job. Trigger: a Tenant Admin demotes a user while Redis is briefly unreachable — the demoted user retains Owner permissions for 7 days. **Fix:** Add a per-user `permissions_epoch`/`sessions_invalidated_at` column; bump it in the same Postgres transaction as the role change; compare on session validation. Add a test: role change + simulated Redis failure → next request reflects new permissions.

### M8. Registration email-send failure orphans the user
**Section:** Registration Flow / Failure Modes (omission)
The registration flow creates the user in "pending" state, generates a token, then sends the verification email — but never defines what happens if the SMTP send fails. The user row is already committed with `email_verified=FALSE`. The user cannot log in (`EMAIL_NOT_VERIFIED`), cannot verify (no email), cannot re-register (`EMAIL_ALREADY_EXISTS` from the UNIQUE constraint). There is no resend-verification endpoint, no rollback, no retry queue. Trigger: SMTP down during `POST /auth/register` → user permanently locked out. **Fix:** Wrap user+token+email so failure rolls back and returns 503; OR add `POST /auth/resend-verification`; OR enqueue email in a durable outbox. Specify the response code for each failure path; add an integration test with a mocked-failing email service.

### M9. Postgres-served sessions cache stale memberships
**Section:** Session Store Consistency / Session Invalidation on Permission Changes
**Quote (line 118):** `tenant_memberships JSONB NOT NULL DEFAULT '[]',`
The `sessions` table caches `tenant_memberships JSONB`, and the read path falls back to Postgres on Redis miss/unavailability. But `update_member_role` only calls `redis.delete_pattern(...)` — it never updates or purges the `tenant_memberships` JSONB on the Postgres session row, nor forces re-verification of Postgres-served sessions. Result: a demoted/removed Tenant Admin retains elevated permissions in any session served from Postgres until the 7-day expiry. The validation step checks only "not expired, not revoked" — never re-validates cached memberships against the live `user_tenant_memberships` table. This is **privilege retention after revocation in the authoritative store**. **Fix:** Delete/expire all of the user's Postgres `sessions` rows on role change in the same transaction, OR drop `tenant_memberships` from the sessions row and resolve it live from `user_tenant_memberships` on every request (cache only in Redis with short TTL + explicit invalidation). Add a regression test: demote a user, stop Redis, assert the session no longer grants the revoked permission.

### M10. No negative tests for the permission model
**Section:** Testing Strategy / Integration Tests
**Quote (line 1025):** `- Security: SQL injection attempts, XSS in inputs`
The integration test list is almost entirely happy-path plus injection. There are NO enumerated negative tests for: revoked session reuse, expired session/token, permission-denied (`INSUFFICIENT_PERMISSIONS`), the platform→tenant trust-boundary isolation rules ("Global Admin denied tenant-internal data without membership"), or concurrent replay of a single-use reset/verification token. The permission model — the core of the system — has no adversarial test plan, despite every one of these behaviors being labeled "Critical" elsewhere in the spec. **Fix:** Enumerate negative integration tests as first-class scenarios: revoked session → 401; expired session/token rejected; role-change invalidation blocks old-role access; Global Admin denied tenant content without membership and allowed after joining; concurrent double-spend of a token rejected by the atomic UPDATE; rate-limit returns 429 then recovers.

### M11. Tenant ownership is contradictory + transfer operation is undefined
**Section:** Multi-Tenancy Tables / Implementation Phases (Phase 4)
**Quote (line 164):** `max_owners INTEGER NOT NULL DEFAULT 1`
`tenants.owner_id` is a single FK (exactly one owner), yet `max_owners` implies the count can vary — but there is no second-owner representation. The spec requires ownership transfer in three places (User Deletion Policy line 568, the audit list line 651, Phase 4 line 1110) but defines **no API endpoint, no procedure, no validation, no atomic transaction** for it. `max_owners` is an orphaned column the trigger never checks. The user-deletion policy ("must explicitly transfer ownership or delete tenant") is unimplementable as specified. **Fix:** Decide single-owner (drop `max_owners`) or multi-owner (move ownership into `user_tenant_memberships` with an `is_owner` flag). Add `POST /tenants/:id/transfer-ownership` performing `UPDATE tenants` + membership/role swap in one SERIALIZABLE transaction, requiring the recipient to be an existing active member, emitting a dedicated audit event.

---

## MAJOR Findings (continued)

### M12 (sweep). Invite→membership handoff is broken end-to-end
**Section:** Registration Flow / API Design (Member Routes)
**Quote (lines 918–920):** `└─ Option B: "Join an existing tenant" ├─ Enter invite code └─ Join tenant as member (if invite valid)`

The API surface has **no endpoint to accept an invite**. `tenant_invites` stores `token` + `email` + `tenant_role_id`, but `/tenants/:tenant_id/members POST` is owner-side invite creation; there is no `/invites/accept` or `/invites/:token`. The registration flow tells new users to "enter invite code," and integration test #3 asserts "User B accepts → B gets role," but nothing connects the token to a `user_tenant_memberships` row. Invites are sent to an **email** — if that person has no account yet (the common case), there is no defined path. `memberships.tenant_role_id` is NOT NULL with no default; `status` defaults to 'pending' but the pending→active transition is undefined; email normalization for matching is unspecified. **Fix:** Add `POST /api/v1/invites/accept {token}` (and/or a claim-on-register flow keyed by verified email): validate token unexpired/unused, assert `auth_user.email == invite.email` (normalized), INSERT membership atomically, set `accepted_at`, invalidate the token, audit-log it. Define email normalization and the membership status lifecycle.

---

## MINOR Findings (2)

### N1. "Approved" with no approver; author is a placeholder
**Section:** Document header / Changes table
**Quote:** `**Status:** Approved` / `**Author:** Design Document`
Status is "Approved" but no approver is named anywhere, and the author is the placeholder string "Design Document" (and "Design Doc" in the Changes table). For a spec asserting FERPA/COPPA/GDPR compliance, the absence of named signoff — especially from a product owner and legal/compliance — is a governance gap. **Fix:** Name the author and approvers (Product Owner + Legal/Compliance); add a signoff date; if unapproved, set Status to "Draft / Awaiting Review."

### N2. Audit infrastructure is over-scoped for the current POC
**Section:** Security Design > Audit Logging / Permission Trust Boundaries
The spec commits to an immutable append-only `audit_events` table, 7-year retention with cold-storage archival, a daily cleanup job, "non-negotiable" audit writes, a break-glass policy (Platform Owner approval + documented incident + time-bound access), and "court order" language. AGENTS.md explicitly defers regulatory scope: "OWASP ASVS Level 1 now; Level 2 before PII/grades/payments." There is currently no PII beyond email. This is enterprise incident-response infrastructure with no driving requirement at the current stage. **Fix:** For the POC, log auth/security events to structured logs (`tracing`), which AGENTS.md already covers. Defer the dedicated `audit_events` table, 7-year retention, break-glass workflow, and court-order policy until PII/grades enter the system (the ASVS Level 2 gate).

---

## Methodology

High-effort review per the `reviewing-specs` skill (spec touches authentication, data models, public APIs, infrastructure):

1. **Phase 1 — Find (6 concurrent finder agents):** product-requirements, architecture, edge-case, scope-yagni, security-privacy, testability. Each returned ≤4 candidates citing verbatim spec text.
2. **Phase 2 — Verify (17 concurrent `spec-finding-verifier` agents):** one per deduplicated candidate. Results: 16 CONFIRMED, 1 PLAUSIBLE, 0 REFUTED. Verifier downgraded several over-rated severities (S1, PR2, T1, E3: CRITICAL→MAJOR; PR4, S2: MAJOR→MINOR).
3. **Phase 3 — Sweep (1 fresh architecture-reviewer):** hunted holistic gaps; found 4 NEW findings, all verified CONFIRMED.
4. **Phase 4 — Verdict:** ranked by severity; written to this file.

Pre-existing lessons from `.memory.md` were applied: auth/session specs must resolve persistence before routing behavior; FERPA/COPPA/GDPR and RBAC must be first-class; success criteria need measurable outcomes.

---

*Review output of the `reviewing-specs` skill. No findings were refuted. The spec should be revised and re-reviewed (at minimum the 8 CRITICAL findings) before proceeding to `writing-plans`.*
