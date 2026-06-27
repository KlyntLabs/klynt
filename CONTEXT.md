# Context — Klynt Education Platform

## Domain Glossary

### User
A user account in the Klynt platform. Users have:
- **Email** — Unique identifier and contact method
- **Password** — Hashed for authentication
- **Role** — Global (`admin`, `user`) or institution-scoped (`teacher`, `student`, `admin`)
- **Status** — `pending`, `active`, `suspended`, or deleted via `deleted_at`

### Session
An authenticated user session. Created on login, expires after a configured duration, can be revoked.

### Token
Short-lived verification token for email verification or password reset.

### Repository
Persistence interface port. Canonical definitions live in `base::ports`.

### Service
Business logic layer. `auth_service`, `session_service`, and `user_service` provide deep interfaces and depend only on `base` ports and `domain` types.

## Architecture Vocabulary

- **Module** — A crate or focused directory with a clear, single responsibility
- **Interface** — Public API surface of a module
- **Depth** — Ratio of interface complexity to implementation complexity; a deep module hides much behind a small API
- **Seam** — Dependency boundary where implementations can be swapped
- **Adapter** — Translates a canonical port into a concrete implementation (e.g., Postgres `UserRepository`)
- **Leverage** — Value added per unit of interface complexity
- **Locality** — Related concepts living together; the goal that led to replacing `klynt_common` with focused `domain` modules

## Canonical Ports

All services use canonical ports from `base::ports`:

| Port | File | Purpose |
|---|---|---|
| `UserRepository` | `ports/repository.rs` | User CRUD and paginated listing |
| `SessionStore` | `ports/session.rs` | Session create / find / revoke |
| `TokenStore` | `ports/token.rs` | Verification-token save / consume |
| `AuditLogger` | `ports/audit.rs` | Audit-event logging |
| `EmailSender` | `ports/email.rs` | Transactional email delivery |
| `PasswordHasher` | `ports/password_hasher.rs` | Password hashing / verification |
| `Clock` | `ports/clock.rs` | Time abstraction for testability |
| `HttpError` | `ports/http_error.rs` | Gateway-facing error mapping |

## Test Support Fakes

Use canonical fakes from `base::testkit`:

| Fake | File | Purpose |
|---|---|---|
| `FakeUserRepository` | `testkit/repository.rs` | In-memory user store |
| `FakeSessionStore` | `testkit/session.rs` | In-memory session store |
| `FakeTokenStore` | `testkit/token.rs` | In-memory token store |
| `TestClock` | `testkit/clock.rs` | Deterministic time for tests |
| `TestPasswordHasher` | `testkit/crypto.rs` | No-op hashing for fast tests |
| `sample_user` / `sample_active_user` | `testkit/domain.rs` | Ready-made domain fixtures |
| `test_ctx` | `testkit/context.rs` | Request context fixture |

## Crate Map

```
backend/crates/
├── base                    # Canonical ports + testkit fakes
├── shared/
│   └── domain              # Domain types and contracts
├── infra/
│   ├── persistence         # Postgres / Redis adapters
│   ├── telemetry           # Tracing, audit, metrics, health
│   └── config              # Configuration loading
├── services/
│   ├── auth_service        # Registration, login, email verification, password reset
│   ├── session_service     # Session lifecycle
│   └── user_service        # Profiles, password changes, user listing, soft delete
├── gateways/               # HTTP handlers, middleware, composition root
└── server                  # Binary entrypoint
```

## Frontend Deep Modules

The frontend surface is organized around a small number of deep modules. Each module hides its implementation (React Query, Zustand, axios, host parsing) behind a narrow public API and replaces the previous shallow wrappers.

| Module | File | Responsibility | Primary exports |
|---|---|---|---|
| Auth | `frontend/src/core/auth/auth-module.ts` | Hydrate the current user, expose identity/session state, and provide logout/session actions. | `useAuthModule()`, `useAuthRole()` |
| Permissions | `frontend/src/features/tenant/permissions/permissions-module.ts` | Resolve the user's role for a tenant and answer permission checks against the catalog. | `usePermissions(tenantSlug)`, `usePermission(tenantSlug, permissionName)` |
| Window manager | `frontend/src/features/desktop/window-manager/window-module.ts` | Own desktop window state: open, close, focus, move, minimize, maximize, restore, plus z-index compaction. | `useWindowManager(desktopId)`, `useDesktopWindows(desktopId)`, `useActiveWindowId(desktopId)` |
| Subdomain router | `frontend/src/core/routing/subdomain-router.ts` | Build subdomain URLs and classify the current host (apex, tenant, login, admin, profile). | `buildTenantUrl`, `buildLoginUrl`, `buildAdminUrl`, `buildApexUrl`, `buildProfileUrl`, `buildSubdomainUrl`, `getHostContext`, `isApexHost`, `isTenantHost`, `isProfileHost` |
| API | `frontend/src/core/api/api-module.ts` | Provide the configured API client, typed React Query wrappers, idempotent mutations, query-client factory, and auth interceptor wiring. | `useApiQuery`, `useApiMutation`, `useIdempotentMutation`, `apiClient`, `ApiError`, `createApiError`, `generateIdempotencyKey`, `createQueryClient`, `registerAuthInterceptor`, `createAuthInterceptorDeps` |

Shallow wrappers that previously spread this logic across `auth-identity`, `use-me`, permission hooks, the desktop store, `subdomain-url`, and `query-client` have been removed; consumers now import directly from the deep modules above.

## Notes

- `klynt_common` was removed. Its domain types moved to `domain`; ports and test fakes moved to `base`.
- Dependency direction: services → `base` + `domain`; infrastructure → implements `base` ports.
