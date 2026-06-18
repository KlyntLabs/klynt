# Backend Workspace Architecture Refactor — Design

## Overview

The goal is to upgrade the Klynt Education Platform backend into a scalable, production-ready Rust workspace with clear crate boundaries, strong separation of concerns, and good developer experience.

**Important discovery:** the backend is *already* a Cargo workspace with five crates following Clean Architecture layering. The refactor therefore shifts from “split a single crate” to “harden and deepen the existing workspace”: keep the crate split, improve internal boundaries, fix coupling issues, and remove scaffolding friction.

## Current State

```
backend/
├── Cargo.toml
├── config/default.toml
└── crates/
    ├── klynt-domain/          # entities, value objects, errors, ports
    ├── klynt-application/     # use cases (UserService, RequestGate)
    ├── klynt-infrastructure/  # in-memory adapters, config loader
    ├── klynt-api/             # Axum handlers, DTOs, error mapping
    └── klynt-server/          # binary entrypoint + telemetry
```

Dependency direction is already correct:

```
klynt-server → klynt-api → klynt-application → klynt-domain
klynt-infrastructure → klynt-domain
```

Current features: health endpoints, user registration, password hashing (Argon2), in-memory repositories, rate limiting, idempotency, request-scoped context.

## Current Problems

1. **Idempotency store is user-specific.** `IdempotencyStore` hard-codes `UserDto`, so it cannot be reused for future endpoints.
2. **RequestGate is a single-endpoint façade.** It couples rate limiting, idempotency, and user creation. The name implies a generic gate but the implementation is user-specific.
3. **Application-layer tests depend on infrastructure.** `klynt-application` unit tests import `klynt-infrastructure` adapters, violating the intended dependency direction and making tests less authoritative.
4. **Composition root lives in `main.rs`.** Hard-coded wiring makes integration testing of the full server difficult without running the binary.
5. **Manual response DTO mapping.** `UserResponse` manually serializes `Role`/`UserStatus` strings that `serde` already knows how to serialize.
6. **No request-ID propagation.** `Ctx::request_id` is generated inside the application instead of being extracted from the HTTP request.
7. **CORS defaults are too permissive.** `allow_headers(Any)` and fallback to `Any` origin are convenient locally but risky in production.
8. **No graceful shutdown.** `serve(...).await` ignores `ctrl_c`.
9. **`klynt-server/src/lib.rs` is almost empty.** It only re-exports telemetry; the server crate has no reusable composition surface.

## Useful Patterns from Reference Projects

### `nexra-core`

- Service crates + shared `nexra_core` kernel.
- Domain repository traits + `Arc<dyn Trait>` dependency injection.
- Explicit use-case traits/impls with injected repositories.
- Central response-mapping middleware (`mw_res_map`).
- Request context (`Ctx`) resolved from auth/token extensions.
- OpenAPI via `utoipa` (deferred for Klynt until needed).

### `rust-web-app`

- Library crates (`lib-core`, `lib-web`, `lib-auth`) + one binary crate (`web-server`).
- `ModelManager`/`Dbx` pattern for transactions.
- `lib-web::Error::client_status_and_error()` maps crate errors to HTTP.
- Middleware stack: response map → auth context → cookie manager → request stamp.

Both projects confirm Klynt’s existing crate split is idiomatic. The main gap is not the *number* of crates but the *depth* and *coupling* inside them.

## Recommended Target Architecture

Keep the five-crate workspace, but deepen and tighten each crate.

### Crate responsibilities

| Crate | Responsibility | Public surface |
|---|---|---|
| `klynt-domain` | Business entities, value objects, domain errors, repository ports, unit-of-work ports, cross-cutting ports (rate limiter, idempotency). | `config`, `ctx`, `errors`, `models`, `ports`, `repositories`, `unit_of_work` |
| `klynt-application` | Use cases and orchestration. Knows only domain abstractions. | `users::{UserService, CreateUserRequest}`, `request_gate::{UserRequestGate, ...}` |
| `klynt-infrastructure` | Concrete adapters: in-memory repositories, rate limiter, idempotency store, config loader. | `config::load_config`, `rate_limiter::InMemoryRateLimiter`, `repositories::{InMemoryUserRepository, InMemoryIdempotencyStore}`, `unit_of_work::InMemoryUnitOfWork` |
| `klynt-api` | HTTP interface: Axum router, handlers, request/response DTOs, error mapping. | `startup::build_router`, `state::AppState`, `error::AppError`, `v1` routes |
| `klynt-server` | Binary entrypoint and reusable composition root. | binary `klynt-server`; library modules `telemetry`, `composition` |

### Key design decisions

1. **Generic idempotency store.** `IdempotencyStore<T>` stores any `Clone + Send + Sync + 'static` payload. The user-registration gate uses `IdempotencyStore<UserDto>`.
2. **Rename `RequestGate` → `UserRequestGate`.** Makes its scope explicit. Future endpoints get their own thin orchestrators or move cross-cutting concerns to middleware.
3. **Move composition out of `main.rs`.** Create `klynt-server/src/composition.rs` with `build_request_gate(config)` and a test-friendly `build_app(config)` that returns a configured `Router`.
4. **Application tests use local test doubles.** Replace `klynt-infrastructure` imports in `klynt-application` tests with tiny inline fakes, keeping the crate dependency-clean.
5. **Simplify response DTOs.** Derive `Serialize` on domain enums and expose `UserResponse` as a thin newtype/struct over `UserDto`, removing manual variant mapping.
6. **Request-ID middleware.** Add a small tower layer that reads/generates `X-Request-Id`, stores it in extensions, and passes it into `Ctx`. `AppError` reads the same extension.
7. **Tighten CORS.** Require explicit origins and a fixed allowed-header set. Remove `Any` fallback.
8. **Graceful shutdown.** Handle `ctrl_c` in the binary entrypoint.

### Dependency graph

```
klynt-server
├── klynt-api
│   ├── klynt-application
│   │   └── klynt-domain
│   └── klynt-domain
└── klynt-infrastructure
    └── klynt-domain

No arrow from klynt-application to klynt-infrastructure.
```

## Migration Plan

1. **Domain layer changes**
   - Make `IdempotencyStore` generic over `T`.
   - Keep `RateLimiter` port unchanged.
   - Ensure `Role` and `UserStatus` serialize as `snake_case` (already true).

2. **Application layer changes**
   - Rename `RequestGate` to `UserRequestGate` and update imports.
   - Replace `InMemoryRateLimiter`, `InMemoryIdempotencyStore`, `InMemoryUnitOfWork`, `InMemoryUserRepository` in tests with local fakes.

3. **Infrastructure layer changes**
   - Make `InMemoryIdempotencyStore<T>` generic.

4. **API layer changes**
   - Simplify `UserResponse` to derive from `UserDto` serialization.
   - Add request-ID middleware to `build_router`.
   - Tighten CORS configuration.

5. **Server layer changes**
   - Add `composition.rs` with `build_request_gate` and `build_app`.
   - Move wiring out of `main.rs`.
   - Add graceful shutdown.

6. **Tests**
   - Update `klynt-server/tests/helpers.rs` to use `klynt_server::composition::build_app`.
   - Update repository conformance tests if needed.

7. **Verification**
   - `cargo fmt --all`
   - `cargo clippy --workspace --all-targets --all-features`
   - `cargo test --workspace --all-features`

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Generic idempotency store adds type complexity | Low | Keep `T` constrained to `Clone + Send + Sync + 'static`; concrete usage stays simple. |
| Application tests with fakes may miss adapter regressions | Low | Keep infrastructure integration tests and server integration tests; fakes only replace unit-test adapters. |
| CORS tightening breaks local frontend | Low | Keep `allowed_origins` configurable via env; default remains `http://localhost:5174`. |
| Request-ID middleware ordering affects tracing | Low | Place it before `TraceLayer` so traces include the propagated ID. |

## Open Questions

None — the design is scoped to hardening the existing workspace without adding new external dependencies or new product features.
