# ADR-004: Cookie-Based SSO Session

## Status

Accepted

## Date

2026-06-22

## Context

The platform serves multiple subdomains (e.g., `tenant.klynt.edu`, `other.klynt.edu`). Users should authenticate once and remain authenticated across subdomains without requiring JavaScript to manage tokens.

## Decision

- On login, set an `HttpOnly`, `Secure` (configurable), `SameSite=Lax`, `Path=/` cookie named `session_token` scoped to the configured cookie domain (default `.klynt.edu`).
- The auth middleware falls back to the `session_token` cookie when no `Authorization: Bearer` header is present.
- Logout reads the cookie if no body token is provided and clears the cookie with matching attributes.
- The cookie `Max-Age` matches the backend access-token TTL.

## Alternatives Considered

### Bearer-only auth
- Rejected: requires JavaScript to store and send tokens; does not support cross-subdomain SSO.

### `SameSite=None`
- Rejected: requires `Secure` and is more vulnerable to CSRF. `Lax` is sufficient for SSO across subdomains when the domain is scoped to the parent.

## Consequences

- `KLYNT_COOKIE_SECURE` must be `true` in production where TLS is terminated.
- `KLYNT_COOKIE_DOMAIN` must match the deployment's parent domain.
- New dependency: `tower-cookies`.
