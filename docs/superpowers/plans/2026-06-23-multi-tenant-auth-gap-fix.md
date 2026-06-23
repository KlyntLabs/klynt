# Multi-Tenant Auth Phase 1–3 Gap-Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the entire auth/user flow work end-to-end in the `dev` environment: register → verify email → login → create/join tenant → manage roles/permissions → manage members → view/revoke sessions → logout, while aligning backend/frontend contracts and dev CORS/cookie wiring.

**Architecture:** Fix dev wiring first (CORS, cookie domain, env docs), then align backend API contracts to the frontend and spec, complete missing frontend screens, bring the DB schema in line with the spec, and finally clean up i18n/ADRs/Clean-Architecture violations.

**Tech Stack:** Rust (Axum/SQLx), React 19 + Vite + TypeScript + Tailwind v4 + TanStack Query, PostgreSQL, Redis, Biome, Vitest, cargo nextest.

---

## File Structure Map

### Backend files that will change
| File | Responsibility |
|---|---|
| `backend/.env.example` | Dev CORS/cookie defaults |
| `backend/crates/gateways/src/middleware/cors.rs` | Allow `PATCH`, credentials, dynamic origin validation |
| `backend/crates/gateways/src/routes/auth.rs` | Add `/auth/sessions`, `DELETE /auth/sessions/:id`, rename forgot endpoint or alias |
| `backend/crates/gateways/src/routes/tenants.rs` | Add `GET/PATCH/DELETE /tenants/:slug` full payloads |
| `backend/crates/gateways/src/routes/roles.rs` | Ensure snake_case responses |
| `backend/crates/shared/domain/src/contracts/auth.rs` | `remember_me` field |
| `backend/crates/shared/domain/src/tenant.rs` | Add `max_members`, `max_owners`, `settings` |
| `backend/crates/shared/domain/src/tenant_role.rs` | Add `is_custom` |
| `backend/crates/services/auth_service/src/core/password_policy.rs` | Align to spec (8 chars, upper+lower+number) |
| `backend/crates/services/auth_service/src/application/use_cases/login.rs` | Session fixation: invalidate pre-login cookie |
| `backend/crates/services/cleanup_job/src/lib.rs` | Correct retention windows |
| `backend/migrations/0010_fix_membership_and_tenants.sql` | Add missing columns/tables |
| `backend/crates/infra/observability/src/audit/logger_impl.rs` | Audit role/permission events |

### Frontend files that will change
| File | Responsibility |
|---|---|
| `frontend/.env.example` | Dev API base URL, cookie notes |
| `frontend/src/core/api/api-client.ts` | Case transform interceptor or snake_case payloads |
| `frontend/src/core/auth/hooks/use-login.ts` | Send `remember_me`, consume response correctly |
| `frontend/src/features/auth/schemas/login-schema.ts` | i18n error messages |
| `frontend/src/features/auth/schemas/forgot-password-schema.ts` | i18n error messages |
| `frontend/src/core/auth/hooks/use-register.ts` | i18n toast/error |
| `frontend/src/core/auth/hooks/use-forgot-password.ts` | i18n toast/error |
| `frontend/src/core/auth/hooks/use-verify-email.ts` | i18n toast/error |
| `frontend/src/core/auth/hooks/use-reset-password.ts` | i18n toast/error |
| `frontend/src/features/tenant/types.ts` | Align to backend snake_case |
| `frontend/src/features/tenant/api/tenant-api.ts` | Add detail/update/delete calls |
| `frontend/src/features/tenant/pages/tenant-settings-page.tsx` | New |
| `frontend/src/features/tenant/members/` | New member-management feature |
| `frontend/src/features/auth/sessions/` | New session-management feature |
| `frontend/src/features/auth/pages/onboarding-page.tsx` | New post-verification onboarding |
| `frontend/src/routes/` | Wire new routes |
| `frontend/src/test/msw/handlers/*.ts` | Align mocks to backend snake_case |
| `frontend/src/locales/en.json`, `vi.json`, `cn.json` | Add missing keys |

---

## Ordering & Dependencies

**Do not skip Module 0.** Until CORS and cookie domain work, real login/tenant flows will fail in the browser even if all code is "correct."

1. **Module 0 — Dev Wiring** (prerequisite for everything)
2. **Module 1 — Backend Contract Alignment** (prerequisite for frontend features)
3. **Module 2 — Database Schema Alignment** (prerequisite for member invites/status)
4. **Module 3 — Frontend Feature Completion**
5. **Module 4 — Standards & Architecture Cleanup** (can be done in parallel with Module 3 after Module 1)

---

## Module 0: Dev Wiring (Prerequisite)

### Task 0.1: Fix backend CORS defaults for local development

**Files:**
- Modify: `backend/.env.example`
- Modify: `backend/crates/gateways/src/middleware/cors.rs`

**Why:** Frontend runs on `http://localhost:5173`, backend on `http://localhost:3001`. The current `.env.example` leaves `KLYNT_API__ALLOWED_ORIGINS` commented, which makes the backend default to `*` and omit `Access-Control-Allow-Credentials`, breaking cookie auth. Also `PATCH` is not in allowed methods.

- [ ] **Step 1: Update `backend/.env.example`**

Add documented defaults above the existing commented block:

```bash
# Local development: allow the Vite dev server to send credentials
KLYNT_API__ALLOWED_ORIGINS='["http://localhost:5173"]'
# Empty or '[]' disables CORS credentials and falls back to '*'
# KLYNT_API__ALLOWED_ORIGINS='[]'

# Cookie domain: use empty string for localhost, '.klynt.dev' for production SSO
KLYNT_COOKIE_DOMAIN=
KLYNT_COOKIE_SECURE=false
KLYNT_COOKIE_SAMESITE=Lax
```

Keep the existing production example below it.

- [ ] **Step 2: Add `PATCH` to allowed methods and ensure credentials are allowed**

In `backend/crates/gateways/src/middleware/cors.rs`, change the method list to include `PATCH`:

```rust
let methods = [
    Method::GET,
    Method::POST,
    Method::PUT,
    Method::PATCH,
    Method::DELETE,
    Method::OPTIONS,
];
```

Ensure `allow_credentials(true)` is called when `allowed_origins` is non-empty.

- [ ] **Step 3: Verify**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo clippy -p gateways --all-targets --all-features -- -D warnings
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/.env.example backend/crates/gateways/src/middleware/cors.rs
git commit -m "fix(cors): allow PATCH and document local dev credentials config"
```

---

### Task 0.2: Fix cookie domain for localhost

**Files:**
- Modify: `backend/crates/gateways/src/middleware/cookie_config.rs` (or wherever cookie domain is read)
- Modify: `backend/.env.example`

**Why:** `KLYNT_COOKIE_DOMAIN=.klynt.edu` causes browsers to reject the cookie on `localhost`. An empty domain means "current host" and works for local dev.

- [ ] **Step 1: Treat empty `KLYNT_COOKIE_DOMAIN` as `None`**

Find where the cookie domain is parsed (likely in auth/cookie config). Ensure:

```rust
let domain = env::var("KLYNT_COOKIE_DOMAIN").ok().filter(|s| !s.is_empty());
```

The cookie builder should skip `.domain(...)` when `domain` is `None`.

- [ ] **Step 2: Verify with a local curl login**

```bash
curl -i -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!","username":"testuser"}'
```

Expected: `Set-Cookie` header present, no `Domain=.klynt.edu`.

- [ ] **Step 3: Commit**

```bash
git add backend/
git commit -m "fix(cookie): allow empty cookie domain for localhost dev"
```

---

### Task 0.3: Align frontend API client payload casing

**Files:**
- Modify: `frontend/src/core/api/api-client.ts`

**Why:** Frontend currently sends camelCase (`rememberMe`, `permissionIds`) but backend expects snake_case (`remember_me`, `permission_ids`). The cleanest fix is a request/response transform interceptor.

**Decision:** Use `humps` (or write a small recursive snake/camel transformer). Adding `humps` is small and well-known. If the team prefers zero new deps, implement a 20-line recursive helper.

- [ ] **Step 1: Add `humps` dependency**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/frontend
bun add humps
bun add -D @types/humps
```

- [ ] **Step 2: Add transform interceptor**

```typescript
import axios from "axios";
import { camelizeKeys, decamelizeKeys } from "humps";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  if (config.data) {
    config.data = decamelizeKeys(config.data);
  }
  return config;
});

apiClient.interceptors.response.use((response) => {
  if (response.data) {
    response.data = camelizeKeys(response.data);
  }
  return response;
});
```

- [ ] **Step 3: Update MSW handlers to return snake_case**

Modify `frontend/src/test/msw/handlers/permissions.handlers.ts`, `tenant.handlers.ts`, `users.handlers.ts` to return snake_case field names (`permission_ids`, `is_system`, `joined_at`).

- [ ] **Step 4: Verify**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/frontend
bun run typecheck
bun run test
```

Expected: typecheck passes, tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/bun.lockb frontend/src/core/api/api-client.ts frontend/src/test/msw/handlers/
git commit -m "feat(api): auto-transform request/response between camelCase and snake_case"
```

---

## Module 1: Backend Contract Alignment

### Task 1.1: Add `GET /auth/sessions` and `DELETE /auth/sessions/:id`

**Files:**
- Create: `backend/crates/services/auth_service/src/application/use_cases/list_sessions.rs`
- Create: `backend/crates/services/auth_service/src/application/use_cases/revoke_session.rs`
- Modify: `backend/crates/gateways/src/routes/auth.rs`
- Modify: `backend/crates/services/auth_service/src/lib.rs` or builder

**Why:** Spec requires session list/revoke; frontend needs these for the session-management screen.

- [ ] **Step 1: Add `ListSessionsUseCase`**

```rust
use klynt_domain::session::SessionSummary;

pub async fn list_sessions(
    &self,
    user_id: Uuid,
) -> Result<Vec<SessionSummary>, AuthError> {
    self.session_repo.list_active_by_user(user_id).await
}
```

- [ ] **Step 2: Add `RevokeSessionUseCase`**

```rust
pub async fn revoke_session(
    &self,
    user_id: Uuid,
    session_id: Uuid,
) -> Result<(), AuthError> {
    // Ensure user can only revoke their own sessions
    let session = self.session_repo.find_by_id(session_id).await?;
    if session.user_id != user_id {
        return Err(AuthError::Forbidden);
    }
    self.session_repo.revoke(session_id).await?;
    Ok(())
}
```

- [ ] **Step 3: Wire routes**

In `gateways/src/routes/auth.rs`:

```rust
.route("/sessions", get(list_sessions))
.route("/sessions/:session_id", delete(revoke_session))
```

- [ ] **Step 4: Add integration tests**

Create `backend/crates/gateways/tests/session_routes_test.rs`:

```rust
#[tokio::test]
async fn list_and_revoke_sessions() {
    // register + login, then GET /auth/sessions, then DELETE one
}
```

- [ ] **Step 5: Verify**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo nextest run -p gateways --all-features
```

Expected: new + existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/crates/services/auth_service backend/crates/gateways/src/routes/auth.rs backend/crates/gateways/tests/session_routes_test.rs
git commit -m "feat(auth): add session list and revoke endpoints"
```

---

### Task 1.2: Align password policy to spec

**Files:**
- Modify: `backend/crates/services/auth_service/src/core/password_policy.rs`
- Modify: tests that assert the 12-character rule

**Why:** Spec says min 8 chars, at least 1 uppercase, 1 lowercase, 1 number. Current policy requires 12 chars + special char.

- [ ] **Step 1: Update policy**

```rust
pub fn validate(password: &str) -> Result<(), PasswordError> {
    if password.len() < 8 {
        return Err(PasswordError::TooShort);
    }
    let has_upper = password.chars().any(|c| c.is_ascii_uppercase());
    let has_lower = password.chars().any(|c| c.is_ascii_lowercase());
    let has_digit = password.chars().any(|c| c.is_ascii_digit());
    if !(has_upper && has_lower && has_digit) {
        return Err(PasswordError::MissingCharacterTypes);
    }
    // Optional: keep common-password / user-data checks
    Ok(())
}
```

- [ ] **Step 2: Update affected tests**

Find tests that use 12-char passwords and reduce to valid 8-char passwords where the test is about policy. Keep longer passwords if testing other things.

- [ ] **Step 3: Verify**

```bash
cargo nextest run -p auth_service --all-features
```

- [ ] **Step 4: Commit**

```bash
git add backend/crates/services/auth_service
git commit -m "fix(auth): align password policy to spec (8 chars, upper+lower+digit)"
```

---

### Task 1.3: Add `remember_me` handling to login

**Files:**
- Modify: `backend/crates/shared/domain/src/contracts/auth.rs`
- Modify: `backend/crates/services/auth_service/src/application/use_cases/login.rs`
- Modify: `backend/crates/gateways/src/routes/auth.rs`

**Why:** Frontend sends `rememberMe`; backend currently ignores it or expects `remember_me`.

- [ ] **Step 1: Update `LoginRequest` DTO**

```rust
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    pub remember_me: Option<bool>,
}
```

- [ ] **Step 2: Use `remember_me` to set session TTL**

If `remember_me == Some(true)`, session max age = 30 days. Otherwise = 24 hours. Ensure cookie `Max-Age` reflects the chosen TTL.

- [ ] **Step 3: Verify with gateway tests**

Add a test asserting cookie `Max-Age` differs when `remember_me: true`.

- [ ] **Step 4: Commit**

```bash
git add backend/crates/shared/domain/src/contracts/auth.rs backend/crates/services/auth_service backend/crates/gateways/src/routes/auth.rs
git commit -m "feat(auth): honor remember_me in login session TTL"
```

---

### Task 1.4: Ensure backend tenant/member/role routes return full payloads

**Files:**
- Modify: `backend/crates/gateways/src/routes/tenants.rs`
- Modify: `backend/crates/gateways/src/routes/roles.rs`
- Modify: `backend/crates/shared/domain/src/tenant.rs`
- Modify: `backend/crates/shared/domain/src/tenant_role.rs`

**Why:** Frontend needs `max_members`, `max_owners`, `settings` on tenant; `is_custom` on role; consistent snake_case.

- [ ] **Step 1: Add missing domain fields**

```rust
pub struct Tenant {
    pub id: Uuid,
    pub slug: String,
    pub name: String,
    pub owner_id: Uuid,
    pub max_members: i32,
    pub max_owners: i32,
    pub settings: serde_json::Value,
    pub status: TenantStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

```rust
pub struct TenantRole {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub is_custom: bool,
    pub is_system: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

- [ ] **Step 2: Update repository queries to select/insert new columns**

Update `infra/persistence/src/repositories/tenant.rs` and `role.rs`.

- [ ] **Step 3: Update route responses**

Ensure `GET /tenants/:slug` returns the full tenant object.

- [ ] **Step 4: Verify**

```bash
cargo nextest run -p gateways -p tenant_service --all-features
```

- [ ] **Step 5: Commit**

```bash
git add backend/crates/shared/domain backend/crates/infra/persistence backend/crates/gateways/src/routes/tenants.rs backend/crates/gateways/src/routes/roles.rs
git commit -m "feat(tenant,roles): expose full tenant and role payloads"
```

---

### Task 1.5: Audit role and permission changes

**Files:**
- Modify: `backend/crates/infra/observability/src/audit/logger_impl.rs`
- Modify: role/member update use cases

**Why:** Spec lists role creation/permission changes and member role changes as non-negotiable audit events.

- [ ] **Step 1: Add `AuditAction` variants**

```rust
pub enum AuditAction {
    RoleCreated,
    RoleUpdated,
    RoleDeleted,
    RolePermissionsUpdated,
    MemberRoleChanged,
}
```

- [ ] **Step 2: Emit audit events in role/member use cases**

Call `audit.log(...)` with `before_state` and `after_state` JSONB.

- [ ] **Step 3: Verify**

Check that `audit_events` rows are created for role/member mutations.

- [ ] **Step 4: Commit**

```bash
git add backend/crates/infra/observability backend/crates/services/tenant_service
git commit -m "feat(audit): log role and member permission changes"
```

---

## Module 2: Database Schema Alignment

### Task 2.1: Add `tenant_invites` table and membership status/role FK

**Files:**
- Create: `backend/migrations/0010_tenant_invites_and_membership_status.sql`

**Why:** Phase 4 in the spec depends on `tenant_invites`, but Phase 2/3 already need `user_tenant_memberships.status` and a real `tenant_role_id` FK for permission checks.

- [ ] **Step 1: Write migration**

```sql
-- Add status and role FK to memberships
ALTER TABLE user_tenant_memberships
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active',
    ADD COLUMN tenant_role_id UUID REFERENCES tenant_roles(id) ON DELETE SET NULL,
    ADD CONSTRAINT chk_membership_status CHECK (status IN ('pending', 'active', 'suspended'));

CREATE INDEX idx_memberships_status ON user_tenant_memberships(status);

-- Add tenant settings columns
ALTER TABLE tenants
    ADD COLUMN max_members INTEGER NOT NULL DEFAULT 100,
    ADD COLUMN max_owners INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN settings JSONB NOT NULL DEFAULT '{}';

-- Add is_custom to tenant_roles
ALTER TABLE tenant_roles
    ADD COLUMN is_custom BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill existing system roles
UPDATE tenant_roles SET is_custom = FALSE WHERE is_system = TRUE;

-- Create tenant_invites table
CREATE TABLE tenant_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    tenant_role_id UUID NOT NULL REFERENCES tenant_roles(id),
    invited_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    token VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invites_tenant ON tenant_invites(tenant_id);
CREATE INDEX idx_invites_email ON tenant_invites(email);
CREATE INDEX idx_invites_token ON tenant_invites(token);
```

- [ ] **Step 2: Run migration locally**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
sqlx migrate run
```

Expected: migration succeeds.

- [ ] **Step 3: Update `.sqlx` query metadata**

```bash
cargo sqlx prepare --workspace
```

- [ ] **Step 4: Verify**

```bash
cargo nextest run --all-features
```

- [ ] **Step 5: Commit**

```bash
git add backend/migrations/0010_tenant_invites_and_membership_status.sql backend/.sqlx/
git commit -m "feat(db): add tenant_invites, membership status/role FK, tenant settings"
```

---

### Task 2.2: Add `users.username`

**Files:**
- Create: `backend/migrations/0011_add_username_to_users.sql`
- Modify: `backend/crates/shared/domain/src/user.rs`
- Modify: register use case and DTO

**Why:** Spec requires `username` unique.

- [ ] **Step 1: Write migration**

```sql
ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE;
CREATE INDEX idx_users_username ON users(username);

-- Backfill from email local-part or name if needed
-- UPDATE users SET username = split_part(email, '@', 1) WHERE username IS NULL;

ALTER TABLE users ALTER COLUMN username SET NOT NULL;
```

- [ ] **Step 2: Update registration to require username**

Add `username` to `RegisterRequest` and validate uniqueness.

- [ ] **Step 3: Verify**

```bash
sqlx migrate run
cargo sqlx prepare --workspace
cargo nextest run --all-features
```

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/0011_add_username_to_users.sql backend/.sqlx backend/crates/
git commit -m "feat(db,auth): add users.username and enforce uniqueness"
```

---

## Module 3: Frontend Feature Completion

### Task 3.1: Add session-management screen

**Files:**
- Create: `frontend/src/features/auth/sessions/api/session-api.ts`
- Create: `frontend/src/features/auth/sessions/hooks/use-sessions.ts`
- Create: `frontend/src/features/auth/sessions/hooks/use-revoke-session.ts`
- Create: `frontend/src/features/auth/sessions/pages/sessions-page.tsx`
- Modify: `frontend/src/routes/` to add `/settings/sessions` or similar

**Why:** Spec requires view/revoke sessions.

- [ ] **Step 1: Create API module**

```typescript
import { apiClient } from "@/core/api/api-client";

export interface Session {
  id: string;
  createdAt: string;
  expiresAt: string;
  userAgent?: string;
  ipAddress?: string;
}

export const sessionApi = {
  list: () => apiClient.get<{ data: { sessions: Session[] } }>("/auth/sessions"),
  revoke: (id: string) => apiClient.delete(`/auth/sessions/${id}`),
};
```

- [ ] **Step 2: Create hooks**

```typescript
export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: () => sessionApi.list().then((r) => r.data.data.sessions),
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sessionApi.revoke,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
  });
}
```

- [ ] **Step 3: Create page**

A table listing sessions with a "Revoke" button. Mark the current session.

- [ ] **Step 4: Add route**

Add `/settings/sessions` under authenticated layout.

- [ ] **Step 5: Add tests**

```typescript
it("lists sessions and allows revocation", async () => { ... });
```

- [ ] **Step 6: Verify**

```bash
bun run test src/features/auth/sessions
bun run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/auth/sessions frontend/src/routes/
git commit -m "feat(auth): add session management UI"
```

---

### Task 3.2: Add member-management screen

**Files:**
- Create: `frontend/src/features/tenant/members/api/member-api.ts`
- Create: `frontend/src/features/tenant/members/hooks/use-members.ts`
- Create: `frontend/src/features/tenant/members/hooks/use-update-member-role.ts`
- Create: `frontend/src/features/tenant/members/hooks/use-remove-member.ts`
- Create: `frontend/src/features/tenant/members/pages/members-page.tsx`
- Create: `frontend/src/features/tenant/members/components/InviteMemberDialog.tsx`
- Modify: `frontend/src/routes/`
- Modify: MSW handlers

**Why:** Backend has member endpoints; frontend needs UI to use them.

- [ ] **Step 1: Create API module**

```typescript
export const memberApi = {
  list: (slug: string) => apiClient.get(`/tenants/${slug}/members`),
  invite: (slug: string, payload: { email: string; roleId: string }) =>
    apiClient.post(`/tenants/${slug}/members`, payload),
  updateRole: (slug: string, payload: { email: string; roleId: string }) =>
    apiClient.patch(`/tenants/${slug}/members`, payload),
  remove: (slug: string, email: string) =>
    apiClient.delete(`/tenants/${slug}/members`, { data: { email } }),
};
```

- [ ] **Step 2: Create hooks and page**

Follow the same TanStack Query pattern as roles.

- [ ] **Step 3: Add route**

`/tenants/:slug/members`.

- [ ] **Step 4: Add MSW handlers and tests**

- [ ] **Step 5: Verify**

```bash
bun run test src/features/tenant/members
bun run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/tenant/members frontend/src/routes/ frontend/src/test/msw/handlers/
git commit -m "feat(tenant): add member management UI"
```

---

### Task 3.3: Add tenant settings/detail page

**Files:**
- Modify: `frontend/src/features/tenant/api/tenant-api.ts`
- Create: `frontend/src/features/tenant/pages/tenant-settings-page.tsx`
- Modify: `frontend/src/routes/`

**Why:** Backend has `GET/PATCH/DELETE /tenants/:slug`; frontend currently only creates/lists tenants.

- [ ] **Step 1: Add API methods**

```typescript
export const tenantApi = {
  create: ..., // existing
  list: ...,   // existing
  get: (slug: string) => apiClient.get(`/tenants/${slug}`),
  update: (slug: string, payload: Partial<TenantInput>) =>
    apiClient.patch(`/tenants/${slug}`, payload),
  remove: (slug: string) => apiClient.delete(`/tenants/${slug}`),
};
```

- [ ] **Step 2: Create settings page**

Allow editing name/slug and deleting the tenant (with confirmation).

- [ ] **Step 3: Add route**

`/tenants/:slug/settings`.

- [ ] **Step 4: Add tests**

- [ ] **Step 5: Verify**

```bash
bun run test src/features/tenant/pages
bun run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/tenant
git commit -m "feat(tenant): add tenant settings and detail page"
```

---

### Task 3.4: Add post-verification onboarding flow

**Files:**
- Create: `frontend/src/features/auth/pages/onboarding-page.tsx`
- Modify: `frontend/src/core/auth/hooks/use-verify-email.ts`
- Modify: `frontend/src/routes/`

**Why:** Spec requires onboarding with "Create first tenant" or "Join existing tenant by invite code."

- [ ] **Step 1: Create onboarding page**

Two tabs:
- Create tenant: reuse `CreateTenantForm`
- Join tenant: invite code input → `POST /tenants/invites/:token/accept`

- [ ] **Step 2: Redirect after verification**

After successful email verification, redirect to `/onboarding` instead of `/login`.

- [ ] **Step 3: Add route and tests**

- [ ] **Step 4: Verify**

```bash
bun run test src/features/auth/pages/onboarding-page.test.tsx
bun run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/pages/onboarding-page.tsx frontend/src/core/auth/hooks/use-verify-email.ts frontend/src/routes/
git commit -m "feat(auth): add post-verification onboarding flow"
```

---

### Task 3.5: i18n hardcoded strings cleanup

**Files:**
- Modify: `frontend/src/features/auth/schemas/login-schema.ts`
- Modify: `frontend/src/features/auth/schemas/forgot-password-schema.ts`
- Modify: `frontend/src/core/auth/hooks/use-login.ts`
- Modify: `frontend/src/core/auth/hooks/use-register.ts`
- Modify: `frontend/src/core/auth/hooks/use-forgot-password.ts`
- Modify: `frontend/src/core/auth/hooks/use-verify-email.ts`
- Modify: `frontend/src/core/auth/hooks/use-reset-password.ts`
- Modify: `frontend/src/locales/en.json`, `vi.json`, `cn.json`

**Why:** AGENTS.md requires all user-facing strings use i18n and be mirrored across `en/vi/cn`.

- [ ] **Step 1: Add validation keys**

```json
{
  "validation": {
    "emailRequired": "Email is required",
    "passwordRequired": "Password is required",
    "usernameRequired": "Username is required"
  }
}
```

Mirror in `vi.json` and `cn.json`.

- [ ] **Step 2: Update schemas**

```typescript
import i18n from "@/core/i18n/config";

export const loginSchema = z.object({
  email: z.string().min(1, i18n.t("validation.emailRequired")).email(),
  password: z.string().min(1, i18n.t("validation.passwordRequired")),
});
```

- [ ] **Step 3: Update hooks to use i18n toasts/errors**

- [ ] **Step 4: Verify**

```bash
bun run typecheck
bun run test
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/schemas frontend/src/core/auth/hooks frontend/src/locales/
git commit -m "i18n(auth): replace hardcoded auth strings with i18n keys"
```

---

## Module 4: Standards & Architecture Cleanup

### Task 4.1: Write ADRs for tenant, permissions, and roles

**Files:**
- Create: `docs/adr/0007-tenant-and-membership-storage.md`
- Create: `docs/adr/0008-permission-and-role-model.md`
- Create: `docs/adr/0009-authorization-service-abstraction.md`

**Why:** AGENTS.md Definition of Done requires ADRs for new dependencies, storage strategies, and core abstractions.

- [ ] **Step 1: Write ADR 0007**

Explain why tenants are slug-addressed, ownership limit enforced via DB trigger, and memberships store `tenant_role_id` FK.

- [ ] **Step 2: Write ADR 0008**

Explain 3-tier permission model, system vs custom roles, and seed data strategy.

- [ ] **Step 3: Write ADR 0009**

Explain `AuthorizationService` interface, permission checks, and session re-verification approach.

- [ ] **Step 4: Verify**

```bash
just check
```

- [ ] **Step 5: Commit**

```bash
git add docs/adr/
git commit -m "docs(adr): add ADRs for tenant storage, permission model, and authorization"
```

---

### Task 4.2: Reduce application-crate Axum/SQLx surface (Clean Architecture)

**Files:**
- Modify: `backend/crates/services/auth_service/Cargo.toml`
- Modify: `backend/crates/services/tenant_service/Cargo.toml`
- Modify: `backend/crates/services/user_service/Cargo.toml`
- Modify: error modules in those crates
- Modify: builder modules

**Why:** AGENTS.md says application crates should depend only on domain; Axum/SQLx/persistence belong in API/infrastructure layers.

**Decision:** This is a larger refactor. The pragmatic approach is:
1. Remove `axum` from service crate dependencies.
2. Move `axum::http::StatusCode` mapping to `klynt-api` error mapping.
3. Replace direct `sqlx::PgPool` references with a `Database` port trait or accept the pool only in builder wiring.

- [ ] **Step 1: Remove `axum` from service `Cargo.toml` files**

- [ ] **Step 2: Replace StatusCode usage with domain errors**

Change service error types to return semantic errors (`NotFound`, `Conflict`, etc.) and let `klynt-api` map them to HTTP status codes.

- [ ] **Step 3: Introduce repository traits in domain**

If not already present, define `trait UserRepository`, `trait TenantRepository`, etc. in `klynt-domain`. Have application services depend on `Arc<dyn Trait>`.

- [ ] **Step 4: Verify**

```bash
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo nextest run --all-features
```

- [ ] **Step 5: Commit**

```bash
git add backend/crates/services backend/crates/gateways backend/crates/shared/domain
git commit -m "refactor(backend): remove axum/sqlx from application service crates"
```

---

## Final Verification

After all modules:

```bash
just check
just test-coverage
```

Expected:
- `just check` passes (fmt, clippy, biome, typecheck)
- Backend coverage ≥ 84%
- Frontend coverage ≥ 92%
- All new integration tests pass

Manual smoke test in browser:
1. `just dev`
2. Register → verify email → onboarding → create tenant
3. Invite a member → accept invite → change member role
4. Create a custom role → assign permissions
5. View sessions → revoke one
6. Logout → login still works

---

## Spec Coverage Self-Check

| Spec Section | Covered By |
|---|---|
| Cross-tenant SSO cookie config | Module 0 (CORS/cookie) |
| Register/verify/login/logout | Already implemented; Module 0 fixes real dev use |
| Password policy | Task 1.2 |
| Session list/revoke | Task 1.1 + 3.1 |
| Tenant creation/management | Task 1.4 + 3.3 |
| Member management | Task 3.2 + DB migration |
| 3-tier roles/permissions | Already implemented; Task 3.2 exposes it |
| Audit logging | Task 1.5 |
| Rate limiting matrix | Partial; not fully addressed in this plan (see below) |
| Cleanup retention | Task 1.x (optional; spec says immediate/lazy also acceptable) |

**Not fully covered in this plan:**
- Full rate-limiting matrix (per-email forgot, per-user general, global). The existing login/register IP limits cover the critical paths; add a follow-up plan if abuse testing requires the full matrix.
- Cross-subdomain frontend routing logic. The cookie-based SSO works automatically once CORS/cookie domain are correct; explicit subdomain redirects can be added later.

---

## Execution Choice

**Plan saved to:** `docs/superpowers/plans/2026-06-23-multi-tenant-auth-gap-fix.md`

**Two execution options:**

1. **Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach would you like to use?
