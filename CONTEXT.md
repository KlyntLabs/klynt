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
Persistence interface port. Canonical definitions live in `klynt_base::ports`.

### Service
Business logic layer. `auth_service`, `session_service`, and `user_service` provide deep interfaces and depend only on `klynt_base` ports and `klynt_domain` types.

## Architecture Vocabulary

- **Module** — A crate or focused directory with a clear, single responsibility
- **Interface** — Public API surface of a module
- **Depth** — Ratio of interface complexity to implementation complexity; a deep module hides much behind a small API
- **Seam** — Dependency boundary where implementations can be swapped
- **Adapter** — Translates a canonical port into a concrete implementation (e.g., Postgres `UserRepository`)
- **Leverage** — Value added per unit of interface complexity
- **Locality** — Related concepts living together; the goal that led to replacing `klynt_common` with focused `klynt_domain` modules

## Canonical Ports

All services use canonical ports from `klynt_base::ports`:

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

Use canonical fakes from `klynt_base::testkit`:

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
├── klynt_base              # Canonical ports + testkit fakes
├── shared/
│   └── klynt_domain        # Domain types and contracts
├── infrastructure/
│   ├── klynt_persistence   # Postgres / Redis adapters
│   ├── klynt_telemetry     # Tracing, audit, metrics, health
│   └── klynt_config        # Configuration loading
├── services/
│   ├── auth_service        # Registration, login, email verification, password reset
│   ├── session_service     # Session lifecycle
│   └── user_service        # Profiles, password changes, user listing, soft delete
├── gateways/gateways       # HTTP handlers, middleware, composition root
└── klynt-server            # Binary entrypoint
```

## Notes

- `klynt_common` was removed. Its domain types moved to `klynt_domain`; ports and test fakes moved to `klynt_base`.
- Dependency direction: services → `klynt_base` + `klynt_domain`; infrastructure → implements `klynt_base` ports.
