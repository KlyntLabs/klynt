# klynt_audit

Audit logging infrastructure for the Klynt platform.

## Contents

- `AuditService` — Service for logging security-relevant events
- `AuditEvent` and supporting types — Audit event model

## Usage

The `AuditService` is wired into the API gateway and used by service audit
adapters to persist audit events to the configured `AuditEventRepository`.
