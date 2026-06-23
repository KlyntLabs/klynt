# ADR-009: Authorization Service Abstraction

## Status

Accepted

## Date

2026-06-23

## Context

Tenant-scoped actions (managing members, roles, settings, content) require consistent authorization checks across use cases. We need a single place to decide whether a user may perform an action within a tenant, and we must handle the fact that session snapshots can become stale after membership or role changes.

## Decision

### `AuthorizationService` is the single policy engine

- `AuthorizationService` lives in `tenant_service::application` and is constructed from three ports:
  - `MembershipRepository`
  - `PermissionRepository`
  - `RoleRepository`
- It exposes two primary methods:
  - `has_permission(ctx, tenant_id, user_id, permission_name) -> DomainResult<bool>`
  - `ensure_permission(ctx, tenant_id, user_id, permission_name) -> DomainResult<()>`

### Permission checks resolve from the authoritative store

`ensure_permission` / `has_permission` follow a strict chain:

1. Look up the user's membership in the tenant from `MembershipRepository`.
2. Resolve the membership's role name to a `TenantRoleAggregate` via `RoleRepository`.
3. Look up the requested permission by name via `PermissionRepository`.
4. Return `true` only if the role's `permission_ids` contains the permission ID.

Missing membership, missing role, or missing permission all resolve to `false` (or `NotPermitted` for `ensure_permission`). This keeps the policy engine fail-closed.

### Sessions are re-verified on every tenant-scoped request

- The auth middleware validates the bearer token via `SessionService::validate_access` on every request.
- The tenant-context middleware (`require_tenant_membership`) then resolves the tenant from the URL slug and calls `TenantService::ensure_member` against `MembershipRepository`, re-verifying membership against Postgres.
- `AuthorizationService` also queries `MembershipRepository` directly instead of trusting the session's `tenant_memberships` JSON snapshot.
- This means role or permission changes take effect immediately; a compromised or stale session snapshot cannot bypass authorization.

### Session snapshots are updated for performance, not authority

- `SessionStore` stores `tenant_memberships` snapshots on active sessions.
- When a user joins, changes role, or leaves a tenant, `add_membership` / `update_membership_for_user` update or invalidate snapshots across all active sessions.
- These snapshots are used to populate lightweight request context only; authorization decisions still hit the repository.

## Alternatives Considered

### Trust session snapshots for authorization
- Rejected: snapshots would need eager invalidation on every role/permission change and would still be vulnerable to stale data if invalidation failed. Database lookups are the source of truth.

### Push roles/permissions into the JWT/session payload
- Rejected: Klynt uses opaque bearer tokens tied to server-side sessions. Embedding authorization claims would complicate revocation and force session invalidation on every role change.

### Inline authorization checks in each use case
- Rejected: centralizing in `AuthorizationService` prevents drift, makes policy testing easier, and keeps use-case handlers thin.

## Consequences

- Authorization logic is centralized, testable, and fail-closed.
- Role/permission changes are effective immediately for all callers.
- Every tenant-scoped authorization check incurs a few small Postgres lookups; this is acceptable for correctness.
- Session snapshots remain useful for UX (listing current tenants) but are never the final authority.
