# ADR-006: Content Security Policy and Audit Snapshots

## Status

Accepted

## Date

2026-06-22

## Context

Phase 1 has two security/compliance gaps: no `Content-Security-Policy` header, and audit events for password/profile changes lack before/after snapshots.

## Decision

- Add a restrictive CSP header by default:
  `default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`.
- Make the directive configurable via `KLYNT_CSP_DIRECTIVE` and add a report-only mode via `KLYNT_CSP_REPORT_ONLY`.
- Validate the directive as a legal HTTP header value at config load time.
- Extend `AuditLogger` to accept typed `before`/`after` snapshots for `log_password_changed` and `log_profile_updated`.
- Snapshots must not contain secrets, password hashes, or PII; they record only change metadata (e.g., `changed: true`, `full_name_changed: true`).

## Alternatives Considered

### Permissive CSP with `'unsafe-inline'`
- Rejected: weakens XSS protection. Start restrictive and relax as needed.

### Raw JSON snapshots
- Rejected: typed snapshot structs (`PasswordChangeSnapshot`, `ProfileUpdateSnapshot`) prevent accidental secret leakage at compile time.

## Consequences

- Frontend must not rely on inline scripts/styles unless CSP is explicitly relaxed.
- Audit events now carry non-sensitive before/after metadata.
- New dependency: `http` for `HeaderValue` validation.
