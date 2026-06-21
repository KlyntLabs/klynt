# ADR 0001: Postgres and Redis for Phase 1 Persistence and Rate Limiting

## Status

Accepted

## Context

Phase 1 of the Klynt education platform needs durable persistence for user accounts,
sessions, email-verification tokens, password-reset tokens, and audit events. It also
needs rate limiting that can be shared across multiple server instances when the system
scales horizontally.

The existing codebase was built on in-memory adapters for speed and simplicity. Before
introducing real authentication flows, we must wire the application to real
infrastructure.

## Decision

We will use:

- **PostgreSQL** as the primary durable store, accessed through `sqlx` with migration
  files in `backend/migrations/`.
- **Redis** as the backing store for the rate limiter, using a Lua-based
  fixed-window counter.
- **Migration-driven schema evolution**: each schema change is an incremental SQL file
  applied automatically on startup by `sqlx::migrate!`.

The production composition root (`klynt-server::composition::build_app`) connects to
Postgres and Redis, runs pending migrations, and wires Postgres-backed repositories.
It uses `RedisRateLimiter` backed by the configured `REDIS_URL`.

Integration tests that need real infrastructure use `build_app_with_email_service`
with test-scoped Postgres and Redis instances.

## Consequences

- **Positive**: Real persistence and shared rate limiting are now available for
  production deployments.
- **Positive**: Migrations are version-controlled and applied automatically, reducing
  drift between environments.
- **Negative**: Running the full backend coverage gate requires a Postgres and Redis
  instance; the `test-coverage` recipe therefore runs ignored infrastructure tests with
  `--include-ignored`.

> **Update (2026-06-20):** The in-memory adapters and no-op `UnitOfWork` referenced
> in the original ADR have been removed. The composition root now requires
> `DATABASE_URL` and `REDIS_URL` (no fallback). `UserService` holds
> `Arc<dyn UserRepository>` directly — real cross-aggregate transactions, if needed,
> will be introduced as a new seam that spans all repositories.
- **Security note**: `sqlx` transitively depends on `rsa` via `sqlx-mysql`, which
  is flagged by `RUSTSEC-2023-0071`. Klynt only uses sqlx's Postgres feature, so
  the vulnerable RSA path is unused. The advisory is ignored in
  `backend/.cargo/audit.toml` until a fixed version is available.

## Related Files

- `backend/migrations/0001_initial_schema.sql`
- `backend/migrations/0002_add_audit_table.sql`
- `backend/migrations/0003_add_user_role_and_institution.sql`
- `backend/crates/klynt-infrastructure/src/repositories/pg_user.rs`
- `backend/crates/klynt-infrastructure/src/repositories/pg_session.rs`
- `backend/crates/klynt-infrastructure/src/rate_limiter_redis.rs`
- `backend/crates/klynt-server/src/composition.rs`
- `backend/crates/klynt-server/tests/production_smoke.rs`
