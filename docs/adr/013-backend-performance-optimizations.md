# ADR-013: Backend Performance Optimizations

## Status

Accepted

## Date

2026-06-28

## Context

Profiling and code review of the backend identified several measurable
anti-patterns that could degrade latency under load:

- Argon2 password hashing/verification ran synchronously inside async trait
  methods, blocking Tokio worker threads.
- Role-permission assignments used an N+1 write loop inside a transaction.
- The cleanup job issued unbounded `DELETE` statements against large tables.
- Long-lived access tokens were excluded from the Redis session cache, forcing
  a Postgres lookup on every authenticated request.
- The paginated user list lacked a composite index matching its sort/filter.

## Decision

Apply targeted, measured fixes to the specific bottlenecks above:

1. **Off-load Argon2 to blocking threads** using `tokio::task::spawn_blocking`
   in `persistence::password_hasher::Argon2PasswordHasher`.
2. **Batch role-permission inserts** with a single `INSERT ... SELECT * FROM
   UNNEST(...)` query instead of one insert per permission.
3. **Bound cleanup-job deletes** to 1,000-row batches, looping until no more
   expired rows remain.
4. **Cache long-lived access tokens** in Redis alongside short-lived access
   tokens, using the existing best-effort invalidation and 15-minute TTL.
5. **Pipeline bulk cache invalidation** for membership changes.
6. **Add a partial composite index** on `users(created_at DESC, id DESC) WHERE
   deleted_at IS NULL` for the paginated admin user list.

Measurements were captured with Criterion benchmarks before and after the
changes:

| Benchmark | Before | After |
|---|---|---|
| Role create with 10 permissions | ~6.4 ms | ~1.9 ms |
| Role create with 50 permissions | ~28 ms | ~1.9 ms |
| Role create with 100 permissions | ~58 ms | ~1.9 ms |

The Argon2 wall-clock time is unchanged (the same cryptographic work must be
done), but it no longer blocks the async runtime, improving throughput under
concurrent load.

## Alternatives Considered

### Rewrite the session cache to index tokens by `pair_id`
- Rejected: adds complexity and a secondary Redis index for a 15-minute stale
  window that is already acceptable for access tokens.

### Add pagination to every list endpoint immediately
- Deferred: the highest-risk unbounded lists were noted for future work; the
  immediate fixes are lower-risk and higher-impact.

### Use a dedicated thread pool for Argon2
- Rejected: `tokio::task::spawn_blocking` is the standard, well-supported
  solution and does not introduce a new dependency.

## Consequences

- Password hashing no longer stalls other async tasks.
- Role creation with many permissions is an order of magnitude faster.
- Cleanup job no longer risks long transactions or heavy lock contention.
- Long-lived session validation avoids a Postgres round trip on cache hits.
- User listing with large offsets is faster thanks to the matching index.
- New dev dependency: `criterion` for repeatable backend benchmarks.
