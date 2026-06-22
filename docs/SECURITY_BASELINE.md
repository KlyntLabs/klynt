# Security Baseline

This document captures the security-relevant behaviors and configuration options that operators must understand before deploying Klynt.

## Content Security Policy (CSP)

The gateway emits a `Content-Security-Policy` header on every response. The default policy is:

```text
default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

- `script-src 'self'` blocks inline scripts and scripts from third-party origins.
- `object-src 'none'` disallows plugins such as Flash.
- `frame-ancestors 'none'` prevents the application from being embedded in frames.

Because strict CSP rules can break frontend code that relies on inline styles or scripts, the policy can be served in report-only mode via the `KLYNT_CSP_REPORT_ONLY` environment variable. When set to `true`, the gateway sends `Content-Security-Policy-Report-Only` instead of enforcing the policy. Use this mode to safely evaluate a new or custom directive before enforcing it.

The directive string itself is configurable via `KLYNT_CSP_DIRECTIVE`. The value is validated as a valid HTTP header value at config load time; an invalid value prevents the application from starting.

## Metrics Endpoint

The Prometheus-compatible `/metrics` endpoint is exposed on the gateway by default. It is intended for internal monitoring only. Before production deployment, restrict access to authorized monitoring infrastructure (for example, by placing the gateway behind a reverse proxy that denies external access to `/metrics`).

## Session Cookies and SSO

Session cookies use a domain attribute configured by `KLYNT_COOKIE_DOMAIN`. A leading dot (such as `.klynt.edu`) enables cross-subdomain single sign-on (SSO). In production, `KLYNT_COOKIE_SECURE` must be set to `true` so that session cookies are only sent over HTTPS. Leaving it `false` in production exposes users to session hijacking.

## Audit Snapshots

Audit events can include `before_data` and `after_data` snapshots for compliance and incident response. Snapshots must never contain secrets, credentials, or personally identifiable information. For example, password-change events record only a `changed` flag, not password hashes or plaintext passwords. Profile-update events record only non-sensitive change metadata such as `full_name_changed`.
