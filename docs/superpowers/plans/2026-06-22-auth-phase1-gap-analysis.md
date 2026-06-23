# Phase 1 Core Auth Foundation — Gap Analysis

> **Context:** Phase 1 was completed with a significantly refactored architecture. The original plan assumed crates named `klynt-domain`, `klynt-application`, `klynt-infrastructure`, `klynt-api`, and `klynt-server`. The current codebase uses a different crate layout (`base`, `domain`, `persistence`, `gateways`, `services/*`, `server`). This document assesses what from Phase 1 is actually present, what is missing, and what should be closed before or during Phase 2.

---

## 1. Current Crate Layout (Post-Refactor)

| Original Plan Crate | Current Crate | Responsibility |
|---|---|---|
| `klynt-domain` | `backend/crates/shared/domain` | Domain entities, value objects, errors, contracts/DTOs |
| `klynt-application` | `backend/crates/services/auth_service`, `user_service`, `session_service` | Use cases and service orchestration |
| `klynt-infrastructure` | `backend/crates/infra/persistence`, `infra/config`, `infra/observability` | PostgreSQL repositories, Redis, email, config, tracing, metrics, health |
| `klynt-api` | `backend/crates/gateways` | Axum router, handlers, middleware, error mapping |
| `klynt-server` | `backend/crates/server` | Binary entrypoint and telemetry initialization |
| — | `backend/crates/base` | Canonical ports/traits (`UserRepository`, `SessionStore`, `TokenStore`, `AuditLogger`, `RateLimiter`, `EmailSender`, `PasswordHasher`, `Clock`), `ExecutionContext`, `RequestContext`, `HttpError`, testkit fakes |

---

## 2. What Phase 1 Planned vs. What Exists Now

### ✅ Delivered in Phase 1

| Deliverable | Status | Location |
|---|---|---|
| Migration infrastructure + initial schema | ✅ | `backend/migrations/0001_initial_schema.sql`, `0002_add_audit_table.sql`, `0003_add_user_role_and_institution.sql`, `0004_add_user_deleted_at.sql` |
| User registration with email verification | ✅ | `services/auth_service/src/application/use_cases/registration.rs`, `email_verification.rs` |
| Secure password reset (hashed tokens) | ✅ | `services/auth_service/src/application/use_cases/password_reset.rs` |
| Enhanced login (new session per login) | ✅ | `services/auth_service/src/application/use_cases/login.rs` |
| Session store (Postgres) | ✅ | `infra/persistence/src/repositories/session.rs` |
| Audit logging infrastructure | ✅ | `infra/observability/src/audit.rs`, `infra/persistence/src/repositories/audit_event.rs` |
| Redis-backed rate limiter | ✅ | `infra/persistence/src/rate_limiter.rs` |
| Bearer-token auth middleware | ✅ | `gateways/src/middleware/auth.rs` |
| Security headers middleware | ✅ | `gateways/src/middleware/security_headers.rs` |
| OpenAPI spec | ✅ | `gateways/src/routes/openapi.rs` / `backend/openapi.yaml` |
| Tests with coverage | ✅ | Unit + integration tests across crates; Playwright E2E for registration |

### ❌ Missing or Incomplete from Phase 1

#### Critical / Functional Gaps

| # | Gap | Original Plan / Design Spec | Current State | Priority |
|---|---|---|---|---|
| 1 | **Rate limiter not wired into HTTP layer** | Redis-backed sliding-window rate limiting on auth endpoints, `429` with `Retry-After` | `RedisRateLimiter` exists and is unit tested, but no middleware or route layer applies it. Only `AuthError::RateLimited` mapping exists in `gateways/src/error.rs`. | 🔴 High |
| 2 | **No Redis read-through session cache** | Postgres-authoritative sessions with Redis read-through cache; rehydrate on miss; invalidate on permission changes | `Services::from_config` only creates `PgSessionStore`. `redis_url` is parsed but unused for sessions. | 🔴 High |
| 3 | **No cookie-based SSO session** | Cross-subdomain SSO via `session_token=.klynt.dev; HttpOnly; Secure; SameSite=Lax; Domain=.klynt.dev` | Login returns JSON bearer tokens only. `access_token` and `refresh_token` are identical. No `Set-Cookie` header. | 🔴 High |
| 4 | **No readiness / metrics endpoints** | `GET /health/live`, `/health/ready` (with per-component latency), `GET /metrics` Prometheus | Only `GET /health` exists as a trivial liveness probe. `observability::ports::HealthCheck` trait exists but is unused. No metrics route. | 🟡 Medium-High |
| 5 | **`remember_me` ignored** | Request field `remember_me` should extend session lifetime | Field exists in DTO and OpenAPI but is ignored. Session duration is hard-coded to 24h. | 🟡 Medium |
| 6 | **No distinct refresh token / rotation** | Separate opaque refresh token with rotation | `access_token` and `refresh_token` are the same UUID session token. | 🟡 Medium |
| 7 | **No session management endpoints** | `GET /auth/sessions`, `DELETE /auth/sessions/:id` | Not present. | 🟢 Low (Phase 2+) |
| 8 | **No real email provider** | Configurable provider (SendGrid/SES) | Only `MockEmailService` exists; prints to stderr. | 🟢 Low (Operational) |

#### Schema / Data Model Gaps

| # | Gap | Current State |
|---|---|---|
| 9 | `users.global_role` and `users.email_verified_at` exist in DB but are not mapped to `domain::User` | `domain::User` only has `id`, `email`, `full_name`, `password_hash`, `status`, `role`, `created_at`, `updated_at`, `deleted_at`. |
| 10 | `users.institution_id` is unused | Column exists with no FK and is always `NULL`. `Role::Teacher`/`Admin::requires_institution()` exists but is never enforced. |
| 11 | `audit_events.actor_ip_address` uses `VARCHAR(45)` | Original plan specified `INET` for IP storage/querying. |
| 12 | No explicit `CREATE EXTENSION IF NOT EXISTS "pgcrypto"` | Migration uses `gen_random_uuid()` but does not enable the extension explicitly. Works on modern Postgres but is a portability gap. |
| 13 | `users.name` is `NOT NULL` but code maps `None` full name to `""` | Functional but inconsistent with treating name as required. |

#### Security / Compliance Gaps

| # | Gap | Current State |
|---|---|---|
| 14 | **No Content-Security-Policy header** | `security_headers.rs` omits CSP. |
| 15 | **No rate-limit regression tests at HTTP layer** | Rate limiter has unit tests; gateway integration tests do not exercise it. |
| 16 | **No explicit session-fixation regression test** | Login always creates a new UUID, but there is no explicit test asserting the session ID changes on login. |
| 17 | **Audit events lack before/after snapshots** | Audit events log actor/action/resource but no `before_data`/`after_data` for user updates, password changes, etc. |
| 18 | **`sessions.tenant_memberships` is a placeholder** | JSONB column exists but is always empty; no code reads/writes it. Expected to be used in Phase 2. |

#### Frontend Gaps

| # | Gap | Current State |
|---|---|---|
| 19 | **No login UI** | Only registration flow exists. Auth store expects a token but no `/login` page renders. |
| 20 | **No password reset / email verification UI** | Backend endpoints exist; frontend has no pages. |
| 21 | **No tenant/organization UI** | No org switcher, team management, or tenant creation UI. |

---

## 3. Impact on Phase 2

Several Phase 1 gaps block or weaken Phase 2:

1. **Tenant isolation middleware** depends on a session cache and a way to attach tenant context to the request. Without the Redis session cache and cookie-based SSO, tenant context propagation will be slower and cross-subdomain tenant switching will not work.
2. **Permission re-verification** depends on the session store reflecting current memberships. The `sessions.tenant_memberships` placeholder must be populated and invalidated correctly, which requires the session cache invalidation path.
3. **Rate limiting on tenant-scoped endpoints** requires the rate limiter to be wired into the gateway first.
4. **Readiness/metrics** are expected for any production multi-tenant deployment.
5. **`global_role` / `institution_id` decisions** affect how platform-level admins and tenant owners are modeled in Phase 2/3.

---

## 4. Recommendation

Close the **Phase 1 critical gaps** (rate limiter wiring, Redis session cache, cookie SSO, health/metrics) **before** starting Phase 2 tenant entities. These are production-readiness prerequisites, not optional polish. The remaining Phase 1 gaps (`remember_me`, refresh-token rotation, session-management endpoints, real email provider, CSP) can be done in parallel with Phase 2 or deferred to Phase 2+.

Two implementation plans are written to cover this:

- `2026-06-22-auth-phase1-completion-plan.md` — close the critical Phase 1 gaps.
- `2026-06-22-multi-tenant-auth-phase2-core-plan.md` — build the multi-tenancy core, including wiring the session cache into tenant membership snapshots.

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-22
