# ADR 012: SessionCoordinator Membership Synchronization

## Status

Accepted

## Date

2026-06-27

## Context

Tenant membership mutations (create tenant, add member, update role, remove member, accept invite) need to be reflected in active sessions so that authorization decisions and tenant listings stay consistent without requiring a fresh login. The tenant service was originally going to call `SessionStore` directly, which would couple tenant domain logic to session persistence details and make it hard to disable or replace the sync mechanism.

## Decision

Introduce `SessionCoordinator`, a dedicated service in `backend/crates/services/session_coordinator` that listens to `MembershipEvent` and updates session state through the existing `SessionStore` port.

### Event semantics

`MembershipEvent` is an enum with three variants:

- `Added { tenant_id, user_id, role }` — a user joined a tenant.
- `Updated { tenant_id, user_id, role }` — a user's role in a tenant changed.
- `Removed { tenant_id, user_id }` — a user left or was removed from a tenant.

The coordinator maps each event to the corresponding `SessionStore` operation (`add_membership`, `update_membership`, `remove_membership`). Events carry only identifiers and the tenant role; they do not contain personal information.

### `enabled` toggle

`SessionCoordinatorConfig` exposes an `enabled` boolean, driven by the `KLYNT_SESSION_SYNC_ENABLED` environment variable. When disabled, `handle_membership_event` returns `Ok(())` immediately without touching the session store. This lets operators turn off session synchronization during recovery or maintenance without changing tenant service code.

### Decoupling

The tenant service depends on the `SessionCoordinator` trait/struct, not on `SessionStore` directly. The coordinator is the only production code that bridges membership events and session persistence. Other services that need to affect session membership should emit `MembershipEvent` through the coordinator rather than calling `SessionStore` directly.

## Consequences

- Tenant service no longer depends on `SessionStore` for membership synchronization.
- Session sync can be disabled at runtime via `KLYNT_SESSION_SYNC_ENABLED`.
- New membership-changing flows can reuse the coordinator by emitting events.
- A failure in session synchronization surfaces as `TenantError::SessionCoordinator` and maps to an HTTP 500, distinct from other internal errors.

## References

- `backend/crates/services/session_coordinator/src/coordinator.rs`
- `backend/crates/services/session_coordinator/src/event.rs`
- `backend/crates/services/tenant_service/src/error.rs`
