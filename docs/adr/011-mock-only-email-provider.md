# ADR 011: Mock-Only Email Provider in Development

## Status

Accepted

## Context

The auth service sends transactional emails for email verification and password reset. For the current foundation phase we do not yet integrate a real email provider (AWS SES, SendGrid, Postmark, etc.).

## Decision

Use `MockEmailService` as the only email sender in local development and tests. It records every "sent" email so integration tests can read verification/reset tokens directly without needing a real mailbox.

The SMTP/Mailpit setup that was used temporarily to exercise the browser email-verification flow has been removed.

## Consequences

- Tests stay deterministic and fast: tokens are read from `MockEmailService::sent_emails`.
- New contributors need only Postgres and Redis running locally.
- A real email provider adapter will be introduced later behind explicit configuration when we move beyond foundation-phase development.

## References

- `backend/crates/infra/persistence/src/email.rs` — `MockEmailService`
- `backend/crates/gateways/src/state/services.rs` — composition root wiring
