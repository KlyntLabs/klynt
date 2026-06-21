# klynt-infrastructure

Shared infrastructure components used across Klynt services.

## Contents

- **Repositories**: Database repository implementations
  - `pg_user` — Postgres user storage
  - `pg_session` — Postgres session storage
  - `sqlx_token_repo` — Postgres token storage
  - `sqlx_audit_repo` — Postgres audit event storage
  - `redis_idempotency` — Redis idempotency store
- **Services**: Email, password hashing, token generation
  - `email` — Email service implementations
  - `password_hasher` — Argon2 password hashing
  - `token_generator` — Secure token generation
- **Utilities**: Config loading, health checks, rate limiting
  - `config` — Configuration loading
  - `health` — Health check abstractions
  - `rate_limiter_redis` — Redis-backed rate limiter

## Usage

Services use these via adapters in their infrastructure layer.
