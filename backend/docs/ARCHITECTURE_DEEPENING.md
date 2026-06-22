# Architecture Deepening — Klynt Backend

## Status

Accepted — implemented across Phases 1-7 of the backend architecture deepening plan.

## Context

The Klynt backend had grown several structural friction points:

- **Fragmented ports** — Repository, session, token, audit, email, and password-hasher interfaces were duplicated or redefined in multiple crates.
- **Adapter proliferation** — Every service carried its own thin adapters, creating hundreds of lines of boilerplate and making interfaces hard to keep consistent.
- **Gateway leaking into persistence** — Session management logic lived inside the gateway / persistence layers, coupling HTTP concerns to storage details.
- **Shallow `klynt_common`** — A single shared crate held unrelated domain types, utilities, contracts, and helpers, hurting locality and AI-navigability.

## Decision

Consolidate the backend around a small set of deep, canonical abstractions:

1. **Canonical ports in `base::ports`** — Define each persistence / cross-cutting interface once, in the base crate, and have all services depend on those ports rather than concrete adapters.
2. **Extract `session_service`** — Move session lifecycle logic (create, validate, invalidate) out of the gateway and into a dedicated business service that depends only on `base` ports.
3. **Consolidate test fakes in `base::testkit`** — Provide one high-quality in-memory implementation of each port so services stop re-implementing their own test doubles.
4. **Focus `domain`** — Replace the shallow `klynt_common` crate with focused domain modules: `user`, `auth`, `role`, `error`, and `contracts`.
5. **Keep services adapter-thin** — Services consume ports; concrete adapters live in `persistence` or gateway composition and are wired at startup.

## Consequences

- `klynt_common` was removed; its responsibilities moved to `domain` (domain types) and `base` (ports / testkit).
- Adapter duplication dropped significantly; services no longer define their own repository / token / session interfaces.
- The gateway depends on services, not on persistence details.
- New services can be tested against `base::testkit` without Postgres or Redis.
- Dependency direction is enforced by the compiler: services depend only on `base` and `domain`; infrastructure crates implement the ports.

## Crate Structure

```
backend/crates/
├── base
│   ├── src/ports          # Canonical trait definitions
│   │   ├── repository.rs
│   │   ├── session.rs
│   │   ├── token.rs
│   │   ├── audit.rs
│   │   ├── email.rs
│   │   ├── password_hasher.rs
│   │   ├── clock.rs
│   │   └── http_error.rs
│   └── src/testkit        # In-memory fakes and test helpers
│       ├── repository.rs
│       ├── session.rs
│       ├── token.rs
│       ├── clock.rs
│       ├── crypto.rs
│       ├── domain.rs
│       └── context.rs
├── shared/
│   └── domain       # Domain types and contracts
│       ├── user.rs
│       ├── auth.rs
│       ├── role.rs
│       ├── error.rs
│       └── contracts/
├── infra/
│   ├── persistence  # Postgres / Redis implementations of ports
│   ├── telemetry    # Tracing, audit, metrics, health
│   └── config       # Configuration loading
├── services/
│   ├── auth_service
│   ├── session_service
│   └── user_service
├── gateways/              # HTTP handlers, middleware, composition root
└── server           # Binary entrypoint
```

## Quality Gates

The refactored backend passes:

- `cargo nextest run --workspace --all-features` — all tests green.
- `cargo clippy --workspace --all-targets --all-features -- -D warnings` — no warnings.
- `cargo fmt --check` — formatted.
- `cargo llvm-cov --workspace --all-features --no-clean --fail-under-lines 84` — line coverage ≥ 84%.
