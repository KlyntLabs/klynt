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
infrastructure while keeping the in-memory adapters available for fast, hermetic tests.

## Decision

We will use:

- **PostgreSQL** as the primary durable store, accessed through `sqlx` with migration
  files in `backend/migrations/`.
- **Redis** as the optional backing store for the rate limiter, using a Lua-based
  fixed-window counter.
- **Migration-driven schema evolution**: each schema change is an incremental SQL file
  applied automatically on startup by `sqlx::migrate!`.

The production composition root (`klynt-server::composition::build_production_app`)
connects to Postgres, runs pending migrations, and wires Postgres-backed repositories.
If `REDIS_URL` is configured, it uses `RedisRateLimiter`; otherwise it falls back to the
in-memory rate limiter.

The existing `build_app` / `build_app_with_email_service` synchronous composition roots
remain unchanged for fast integration tests.

## Consequences

- **Positive**: Real persistence and shared rate limiting are now available for
  production deployments.
- **Positive**: In-memory adapters keep the default `cargo test` fast and hermetic.
- **Positive**: Migrations are version-controlled and applied automatically, reducing
  drift between environments.
- **Negative**: Running the full backend coverage gate now requires a Postgres and Redis
  instance; the `test-coverage` recipe therefore runs ignored infrastructure tests with
  `--include-ignored`.
- **Negative**: `PgUnitOfWork` currently uses a no-op transaction wrapper; full
  multi-repository transactions are deferred to a later phase.
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
