# ADR-005: Access and Refresh Token Separation

## Status

Accepted

## Date

2026-06-22

## Context

Originally `access_token` and `refresh_token` in the login response were the same UUID session token. This conflates short-lived API access with long-lived refresh credentials and complicates token rotation.

## Decision

- Login creates two separate sessions: an access session and a refresh session.
- Each session has a `kind` (`access`, `long_lived`, `refresh`) and a shared `pair_id` linking the access and refresh tokens created during the same login.
- Access tokens authorize API requests; refresh tokens are rejected by the auth middleware.
- Logout revokes the entire pair.
- `remember_me` extends the access-token lifetime to the configured long-session duration.
- Session lifetimes are centralized in `SessionConfig` and configurable via `KLYNT_SESSION__*` env vars.

## Alternatives Considered

### Separate refresh token table
- Rejected: adds schema complexity; a `kind` column on `sessions` is sufficient and keeps foreign-key integrity simple.

### Keep single token
- Rejected: no way to distinguish short-lived access from long-lived refresh, and no path to rotation.

## Consequences

- The `sessions` table has new `kind` and `pair_id` columns.
- The `SessionStore` port gained `create_with_kind` while preserving the original `create` signature.
- Access tokens may be cached in Redis; refresh tokens are not cached.
