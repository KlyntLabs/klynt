# Klynt Backend — Architecture Guide

## Overview

Service-oriented Rust backend following **hexagonal architecture** with **dependency inversion**. Services depend on abstract ports defined in `klynt_base`, not on concrete infrastructure implementations.

## Crate Dependency Graph

```
                     ┌─────────────────┐
                     │   klynt-server  │ (binary)
                     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │     gateways    │ (composition root)
                     └────────┬────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌──────▼───────┐
│ auth_service   │   │ session_service │   │ user_service │
└───────┬────────┘   └────────┬────────┘   └──────┬───────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌──────▼───────┐
│ klynt_base     │   │ klynt_domain    │   │  klynt_*     │
│ (ports+testkit)│   │ (types)          │   │ (infra)      │
└────────────────┘   └─────────────────┘   └──────────────┘
```

**Dependency Direction Rule:** Code at the top depends on code below; never the reverse.

## Architecture Principles

### 1. Hexagonal Architecture
Services are decoupled from infrastructure through **ports** (trait interfaces) defined in `klynt_base::ports`:
- `UserRepository` — User persistence
- `SessionStore` — Session persistence
- `TokenStore` — Verification token storage
- `AuditLogger` — Audit event logging
- `EmailSender` — Transactional email
- `PasswordHasher` — Password hashing/verification
- `Clock` — Time abstraction
- `HttpError` — Gateway-facing error mapping

### 2. Deep Modules
Services expose small, intention-revealing interfaces while hiding complex implementation:
- **auth_service** — 6 methods cover all authentication flows
- **session_service** — 3 methods manage session lifecycle
- **user_service** — Profile management isolated

Each service is tested through its public interface — no testing past the boundary.

### 3. Composition Root
The `gateways` crate is the **composition root** where:
- Concrete implementations of ports are wired to services
- HTTP routes are mapped to service calls
- Middleware is applied (auth, CORS, security headers)

**Do NOT** wire dependencies inside services — they receive ports as constructor arguments.

## Crate Responsibilities

| Crate | Responsibility | When to Use |
|-------|----------------|-------------|
| [`klynt_base`](../crates/klynt_base/AGENTS.md) | Canonical ports + in-memory testkit | Define new persistence interface |
| [`shared/klynt_domain`](../crates/shared/klynt_domain/AGENTS.md) | Domain types, contracts, errors | Share domain types across crates |
| [`infrastructure/klynt_persistence`](../crates/infrastructure/klynt_persistence/AGENTS.md) | Postgres/Redis port implementations | Need concrete repository/cache |
| [`infrastructure/klynt_telemetry`](../crates/infrastructure/klynt_telemetry/AGENTS.md) | Tracing, audit, metrics, health | Add observability |
| [`infrastructure/klynt_config`](../crates/infrastructure/klynt_config/AGENTS.md) | Configuration loading | Add config values |
| [`services/auth_service`](../crates/services/auth_service/AGENTS.md) | Registration, login, email verification, password reset | Implement auth flows |
| [`services/session_service`](../crates/services/session_service/AGENTS.md) | Session creation, validation, invalidation | Manage session lifecycle |
| [`services/user_service`](../crates/services/user_service/AGENTS.md) | Profiles, password changes, user listing, soft delete | Manage user profiles |
| [`gateways`](../crates/gateways/AGENTS.md) | HTTP handlers, middleware, composition root | Add HTTP endpoint |
| [`klynt-server`](../crates/klynt-server/AGENTS.md) | Binary entrypoint | Run the server |

## Workflow: Adding a New Feature

1. **Define domain types** in `klynt_domain` if needed
2. **Define port interface** in `klynt_base::ports` if persistence required
3. **Implement service** depending only on `klynt_base` ports and `klynt_domain`
4. **Implement port adapter** in `klynt_persistence` (or appropriate infra crate)
5. **Wire in gateway** at `gateways/src/state/services.rs`
6. **Add HTTP route** in `gateways/src/routes/`
7. **Test** against `klynt_base::testkit` fakes first, then integration tests

## Workflow: Adding a New Service

1. Create crate under `crates/services/new_service/`
2. Depend on `klynt_base` and `klynt_domain` only
3. Accept ports as constructor dependencies (builder pattern recommended)
4. Test against `klynt_base::testkit` fakes — no external services
5. Wire in `gateways/src/state/services.rs`
6. Add routes in `gateways/src/routes/`

## Testing Strategy

### Unit Tests (Service Layer)
- Use `klynt_base::testkit` fakes for all dependencies
- No external services (Postgres, Redis) required
- Tests cross the same interface as production code

### Integration Tests (Gateway Layer)
- Full stack with real Postgres/Redis
- Located in `crates/gateways/tests/`
- Use `support::TestContext` for test isolation

### Coverage Gate
Backend requires **≥84% line coverage**. Run:
```bash
cargo llvm-cov --workspace --all-features --no-clean --fail-under-lines 84
```

## Quality Commands

```bash
# Run all tests
cargo nextest run --workspace --all-features

# Check formatting
cargo fmt --check

# Lint with clippy
cargo clippy --workspace --all-targets --all-features -- -D warnings

# Coverage report
cargo llvm-cov --workspace --all-features --no-clean --fail-under-lines 84

# Run server
cargo run --bin klynt-server
```

## Key Architectural Decisions

See [`docs/ARCHITECTURE_DEEPENING.md`](./docs/ARCHITECTURE_DEEPENING.md) for full context on:
- Why ports are canonical in `klynt_base`
- Why `session_service` was extracted from the gateway
- Why testkit is centralized
- Why `klynt_common` was split into `klynt_domain` and `klynt_base`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Postgres connection string | `postgresql://klynt:klynt@localhost:5432/klynt` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `KLYNT_API__HOST` | API bind host | `127.0.0.1` |
| `KLYNT_API__PORT` | API bind port | `3000` |

## Related Documentation

- [Backend README](./README.md) — Quick start and local development
- [ARCHITECTURE_DEEPENING.md](./docs/ARCHITECTURE_DEEPENING.md) — Architecture RFC and rationale
- Individual crate `AGENTS.md` files for crate-specific guidance
