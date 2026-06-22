# ADR-002: Per-IP Rate Limiting with Proxy-Aware Client IP Extraction

## Status

Accepted

## Date

2026-06-22

## Context

Auth endpoints (login, register) need per-IP rate limiting to mitigate brute-force and abuse. The gateway runs behind load balancers/reverse proxies in production, so the immediate TCP peer is the proxy, not the end user.

## Decision

- Implement per-action rate limiting (`Login`, `Register`, `PasswordReset`, `EmailVerification`) keyed by client IP + action.
- Extract the client IP from `X-Forwarded-For` using a right-to-left traversal, skipping trusted proxies configured via `KLYNT_API__TRUSTED_PROXIES`.
- Support IPv4 and IPv6 CIDR matching using the `ipnet` crate.
- Normalize IPv4-mapped IPv6 addresses (`::ffff:192.168.1.1`) to IPv4 before matching.
- Return HTTP 429 with `Retry-After` when the limit is exceeded.
- Fail open on Redis errors; require `REDIS_URL` when rate limiting is enabled.

## Alternatives Considered

### Single global IP bucket
- Rejected: login and register have different abuse patterns and should be limited independently.

### Trust all `X-Forwarded-For` entries
- Rejected: clients can prepend spoofed IPs. Right-to-left traversal against trusted proxies prevents this.

### Use `Forwarded` header (RFC 7239)
- Rejected: our current proxy stack emits `X-Forwarded-For`. Can be added later.

## Consequences

- Operators must configure `KLYNT_API__TRUSTED_PROXIES` correctly in production.
- IPv4-mapped IPv6 and native IPv6 proxies are supported.
- New dependency: `ipnet` for CIDR parsing.
