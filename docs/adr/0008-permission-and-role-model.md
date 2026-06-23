# ADR-008: Permission and Role Model

## Status

Accepted

## Date

2026-06-23

## Context

Tenant-level authorization requires a flexible permission system. Different tenants need different default roles, and owners must be able to define custom roles without code changes. We also need platform-level permissions for global administration.

## Decision

### Three-tier permission model

Permissions are grouped into categories that match the product surface area:

1. **Tenant** — manage the tenant itself (`tenant.view`, `tenant.manage_settings`, `tenant.manage_members`, `tenant.manage_roles`, `tenant.delete`).
2. **Content** — create and curate learning material (`content.view`, `content.create`, `content.edit`, `content.delete`, `content.publish`).
3. **Platform** — super-admin capabilities (`platform.manage_users`, `platform.manage_tenants`, `platform.view_analytics`, `platform.manage_billing`).

Well-known permission names are constants in `domain::permission` and mirrored in `all_permission_names()` so tests can seed a deterministic catalog.

### Global permission catalog in Postgres

- `permissions` table stores the canonical catalog: `id`, `name`, `description`, `category`.
- The catalog is global (not per-tenant) so permission names and IDs are stable across the platform.
- Migration `0009_add_permissions_and_roles.sql` seeds the catalog with `ON CONFLICT (name) DO NOTHING` so migrations are idempotent.

### System roles vs custom roles

- Every tenant gets four system roles created automatically: `owner`, `admin`, `member`, `guest`.
- System roles are marked with `is_system = TRUE` and `is_custom = FALSE`; they cannot be deleted and their names are reserved.
- Custom roles are `is_system = FALSE` and `is_custom = TRUE`; they are created by tenant admins through `tenant.manage_roles` and can be updated or deleted.
- Role permissions are stored in the many-to-many `role_permissions` table.

### Default system role permissions

- `owner` — all tenant and content permissions.
- `admin` — all tenant and content permissions except `tenant.delete`.
- `member` — `tenant.view`, `content.view`, `content.create`, `content.edit`.
- `guest` — `tenant.view`, `content.view`.

Platform permissions are not granted to tenant-scoped system roles; they are reserved for platform-wide admin flows.

### Seed strategy

- Migration `0009_add_permissions_and_roles.sql` seeds permissions and backfills system roles for all existing tenants.
- New tenant creation (`PgTenantRepository::create`) runs `seed_system_roles` in the same transaction, inserting the four system roles and assigning their default permissions.
- Test fakes derive the permission catalog from `all_permission_names()` so unit/integration tests do not depend on a live database seed.

## Alternatives Considered

### Hard-code roles as an enum only
- Rejected: an enum (`TenantRole`) is sufficient for system roles but cannot represent custom roles or future role editing.

### Per-tenant permission catalog
- Rejected: would fragment permission IDs and make platform-wide analytics, reporting, and role synchronization harder.

### Denormalize permission names onto roles
- Rejected: normalizing permissions through `role_permissions` lets us rename descriptions and audit role grants without schema changes.

## Consequences

- Custom roles are first-class and editable without code changes.
- Permission names are stable across tenants and tests.
- New tenants are self-contained: creation transactionally seeds roles and permissions.
- Platform permissions remain separate from tenant permissions, keeping super-admin authorization explicit.
