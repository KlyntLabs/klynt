# ADR-001: Redis Read-Through Session Cache

## Status

Accepted

## Date

2026-06-22

## Context

Phase 1 requires a session store that:
- Keeps Postgres authoritative for session durability.
- Reduces read latency for frequently validated access tokens.
- Supports tenant membership snapshots in Phase 2 without re-querying Postgres on every request.
- Degrades gracefully when Redis is unavailable.

## Decision

Add a `CachedSessionStore` adapter in `infra/persistence` that wraps `PgSessionStore` and caches access-token sessions (including long-lived "remember me" tokens) in Redis with a 15-minute TTL. Refresh tokens are not cached to keep invalidation simple and security-sensitive tokens out of Redis.

Redis failures are logged and fall back to Postgres; they never fail the user request.

Bulk invalidation uses a Redis pipeline instead of sequential `DEL` calls to reduce round trips when membership changes affect many active sessions.

## Alternatives Considered

### Write-through cache
- Rejected: adds latency to login and complicates revocation across a cluster.

### Redis as primary session store
- Rejected: Postgres remains the source of truth for durability, backups, and audit consistency.

### Cache refresh/long-lived tokens
- Rejected: refresh tokens are low-read and high-impact if leaked; direct Postgres lookups are acceptable.

## Consequences

- Access-token validation is faster when Redis is healthy.
- Login/logout must invalidate the Redis cache best-effort.
- A Redis outage only adds latency; availability is preserved.
- New dependency: `redis` (already used for rate limiting and idempotency).
