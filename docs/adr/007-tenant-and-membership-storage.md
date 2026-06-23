# ADR-007: Tenant and Membership Storage

## Status

Accepted

## Date

2026-06-23

## Context

Phase 2/3 introduces multi-tenancy: users can create and belong to organizations (tenants). We need a durable, race-safe storage model for tenants, ownership limits, and per-tenant memberships. Decisions here affect URL design, subscription/billing limits, and authorization correctness.

## Decision

### Tenants are addressed by a canonical slug

- Tenants expose a human-readable, URL-safe slug (`TenantSlug`).
- Validation rules: 3–63 lowercase ASCII characters; letters, digits, and hyphens only; no leading or trailing hyphen.
- The slug is stored as `tenants.slug` with a `UNIQUE` constraint and indexed (`idx_tenants_slug`).
- Public tenant routes are nested under `/api/v1/tenants/:tenant_slug`, so the slug is the primary external identifier.

### Ownership limit is enforced by a database trigger

- A user may own at most **2** active tenants (`status = 'active'`).
- Enforcement lives in the Postgres trigger `tenant_ownership_limit` on `tenants`, which calls `enforce_tenant_ownership_limit()`.
- The trigger runs `BEFORE INSERT OR UPDATE OF owner_id` and raises `check_violation` (`23514`) when the limit is exceeded.
- The repository maps this SQLSTATE to `DomainError::TenantLimitReached` so callers receive a deterministic, localized error.
- We enforce in the database rather than the application because concurrent tenant creations would otherwise race.

### Memberships link users to tenants and reference a role FK

- `user_tenant_memberships` has a composite primary key `(tenant_id, user_id)`.
- `role VARCHAR(50)` stores the canonical role name (`owner`, `admin`, `member`, `guest`) for backward compatibility and fast display.
- Migration `0010_tenant_invites_and_membership_status.sql` adds `tenant_role_id UUID REFERENCES tenant_roles(id) ON DELETE RESTRICT`, allowing the membership row to point to the authoritative role aggregate.
- The `tenant_role_id` column is nullable. The initial owner membership inserted during tenant creation sets `role = 'owner'` but leaves `tenant_role_id` NULL; invite acceptance and role-management flows populate the FK.
- Memberships also carry a `status` (`pending`, `active`, `suspended`) for invite workflows.

### Default tenant limits

- `tenants.max_members` defaults to `100`.
- `tenants.max_owners` defaults to `1`.
- These defaults are mirrored in the domain (`Tenant::create`) so validation is consistent across layers.

## Alternatives Considered

### Use `tenant_id` UUID in URLs instead of slug
- Rejected: slugs are human-readable, bookmark-friendly, and easier to debug. The unique index on slug prevents collisions.

### Enforce ownership limit in application code
- Rejected: application-level checks are vulnerable to race conditions under concurrent tenant creation. The trigger guarantees correctness.

### Store only the role name on memberships
- Rejected: a FK to `tenant_roles` lets role definitions evolve (custom roles, permission changes) without string matching throughout the codebase. The role name column is retained for display and migration safety.

## Consequences

- Tenant URLs are stable and user-friendly.
- Ownership limit is atomic and race-free.
- Membership rows are authoritative for role assignment; session snapshots are kept in sync for UX/listing convenience but are not the source of truth (see ADR-009).
- The ownership trigger must be kept in sync with any future plan-level limit changes.
