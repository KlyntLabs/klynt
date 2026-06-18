# Backend Architecture Upgrade Design

## Overview

### Problem & Opportunity

`klynt-edu/backend` is currently a single Rust crate (`klynt-api`) with Clean Architecture folders (`api/`, `application/`, `domain/`, `infrastructure/`) that are not yet enforced by compiler boundaries. The codebase is in its foundation phase: it exposes health endpoints, has no real persistence, and no production user data. The next product milestone is a **user registration** flow that lets students, teachers, and admins create accounts and enter the platform.

The architectural opportunity is to ship that first vertical slice with clear, testable seams—dependency direction inward, repository ports, request context, unit of work—so that future bounded contexts (courses, lessons, assignments, payments, analytics) can grow without turning the crate into a god module. We will **not** split into a Cargo workspace for this single slice; workspace boundaries will be introduced only when a second bounded context proves the single crate is becoming a bottleneck.

### Stakeholders

| Persona | Concern |
|---------|---------|
| Student | Can create an account quickly and securely to access content. |
| Teacher / Admin | Can register with the correct institution/role and manage classes. |
| Platform Team | Can evolve the backend without circular dependencies or brittle tests. |
| Security / Compliance | PII is handled with encryption, consent, retention, and audit controls. |

### User Stories

- As a **student**, I want to register with my email and a password so that I can log in and take courses.
- As a **teacher**, I want to register and be associated with an institution so that I can create and manage classes.
- As a **platform engineer**, I want the persistence seam to be swappable so that an in-memory store can be replaced by PostgreSQL without changing business logic.

## Goals

| Goal | How we will measure success |
|------|-----------------------------|
| **Scalability** | A second bounded context can be added without inflating the registration module; dependency graph remains acyclic. |
| **Maintainability** | Dependency direction is enforced by module visibility; domain code has no framework dependencies. |
| **Testability** | Layers are unit-tested through small interfaces; integration tests run against the in-memory repository and a real router in-process. |
| **Swappable infrastructure** | A repository conformance test proves the seam is real; a future SQLx adapter can pass the same test without touching domain or application code. |
| **Security** | Registration accepts credentials safely, enforces email uniqueness atomically, and protects PII. |
| **Consistency** | Keep existing Axum 0.8, Tokio, `tracing`, and error-handling conventions. |

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| `cargo check` time in `backend/` | < 5 s on developer machine | Stopwatch / `time cargo check` |
| Registration endpoint test coverage | ≥ 90 % of branches | `cargo tarpaulin` or `llvm-cov` |
| Conformance test | Both in-memory and any future SQLx adapter pass the same suite | CI job |
| Registration API success rate | ≥ 99.9 % in staging | Health/observability dashboard |
| Frontend form completion rate | ≥ 80 % for happy path | Analytics event on successful submit |
| Time to add next bounded context | ≤ 1 sprint | Team retro / story points |

## Decision Summary

1. **For this slice:** Keep the existing single crate and enforce Clean Architecture through module visibility (`pub(crate)`, `mod domain`, etc.).
2. **Future scaling:** When a second bounded context (e.g., courses) is added, split the workspace into **one crate per bounded context**, with Clean Architecture layers as modules inside each crate. This avoids the "crate spam" of per-layer crates while still bounding blast radius and team ownership:
   ```text
   crates/
   ├── klynt-users/
   │   ├── src/
   │   │   ├── domain/        # entities, repository traits, domain errors
   │   │   ├── application/   # use-case services
   │   │   ├── api/           # Axum routes/handlers/DTOs for users
   │   │   └── persistence/   # in-memory and SQLx adapters
   ├── klynt-courses/
   │   ├── src/
   │   │   ├── domain/
   │   │   ├── application/
   │   │   ├── api/
   │   │   └── persistence/
   ├── klynt-contracts/       # stable, framework-free DTOs / OpenAPI
   ├── klynt-telemetry/       # tracing primitives (deferred until multi-consumer)
   ├── klynt-core-error/      # shared error shapes (deferred until multi-consumer)
   └── klynt-server/          # thin binary: wiring + route composition
   ```
3. **Shared libraries:** Introduce `klynt-contracts` now for request/response DTOs and OpenAPI schema (and generated TypeScript types). Defer `klynt-telemetry`, `klynt-core-error`, and `klynt-primitives` until they have more than one consumer; avoid a generic `klynt-shared` crate.
4. **Seams:** Define `Ctx` (request context) and `UnitOfWork` ports now so the API-to-domain seam is genuine before PostgreSQL is introduced.
5. **Events:** Add a domain-event/outbox seam only when the first cross-cutting side effect appears (welcome email, audit log, analytics); do not build it for the registration slice alone.

## Architecture

### Module Structure (Current Slice)

```text
backend/
├── Cargo.toml                 # single crate manifest
├── src/
│   ├── main.rs                # thin binary: config, telemetry, wiring, serve
│   ├── config.rs              # AppConfig loading
│   ├── telemetry.rs           # tracing subscriber setup
│   ├── state.rs               # AppState (global config + services)
│   ├── startup.rs             # build_router(): middleware + routes
│   ├── error.rs               # AppError and IntoResponse
│   ├── contracts/             # request/response DTOs, OpenAPI schema
│   ├── api/                   # Axum routes, handlers, middleware
│   ├── application/           # use-case services
│   ├── domain/                # entities, repository traits (ports), domain errors
│   └── infrastructure/        # concrete adapters (in-memory repos first)
└── tests/                     # integration tests
```

### Dependency Direction

Dependencies point inward. Arrows mean "depends on":

```text
api  ──▶  application  ──▶  domain
            ▲
            │
     infrastructure
contracts ──▶  domain  (and is used by api/application)
```

- `domain`: no dependencies on `application`, `infrastructure`, `api`, or framework crates. Allowed deps: `serde`, `thiserror`, `uuid`, `chrono`, etc.
- `application`: depends only on `domain` and `contracts`.
- `infrastructure`: depends only on `domain` and third-party adapters (none for the in-memory slice).
- `api`: depends on `application`, `domain`, and `contracts`; is the only module that knows about Axum.
- `contracts`: depends only on `domain` primitives; no framework dependencies. Generates TypeScript types at build time for the frontend.
- `main.rs`: depends on all modules to wire them together.

### Boundaries

Use Rust module visibility to enforce Clean Architecture:

- `domain::repositories` is `pub` so `application` and `infrastructure` can implement/use it.
- `domain::models` exposes constructors that validate invariants; internal fields are `pub(crate)` where appropriate.
- `application` services are `pub`; internal helpers are `pub(crate)`.
- `infrastructure` adapters are `pub` but only constructed in `main.rs`/`startup.rs`.
- `api` handlers and DTOs are `pub(crate)` unless exported for integration tests.

### Shared Library Strategy

| Crate | When | Contents | Must NOT depend on |
|-------|------|----------|--------------------|
| `klynt-contracts` | Now | Request/response DTOs, OpenAPI schema, generated TS types | Axum, SQLx, any framework |
| `klynt-telemetry` | 2+ consumers | Tracing primitives, request-ID helpers, structured log conventions | Axum (can provide thin Axum layer in `api`) |
| `klynt-core-error` | 2+ consumers | Shared `ApiErrorBody` shape and error-code enum | Application/domain specifics |
| `klynt-primitives` | 2+ consumers | Typed IDs (`UserId`, `CourseId`), pagination helpers, time helpers | Framework crates |

Avoid `klynt-shared`. It becomes a dependency magnet that destroys inward dependency direction.

### Request-Scoped Context (`Ctx`)

Introduce a framework-agnostic request context that handlers populate and application services accept:

```rust
#[derive(Clone, Debug)]
pub struct Ctx {
    pub request_id: Uuid,
    pub tenant_id: Option<Uuid>,          // for future multi-tenancy
    pub authenticated_user: Option<UserId>, // for future authz
}
```

- Handlers create `Ctx` from the incoming request (request ID middleware, future auth middleware).
- `UserService::create_user(ctx: &Ctx, req: CreateUserRequest)` receives it.
- `UserRepository` methods accept `&Ctx` so audit logging and tenant scoping can propagate to storage.

### Unit of Work / Transactional Context

Define a domain port now so multi-aggregate transactions do not leak storage details later:

```rust
#[async_trait]
pub trait UnitOfWork: Send + Sync {
    type Error: std::error::Error + Send + Sync + 'static;

    async fn begin(&self) -> Result<Box<dyn Transaction>, Self::Error>;
}

#[async_trait]
pub trait Transaction: Send + Sync {
    type Error: std::error::Error + Send + Sync + 'static;

    fn users(&self) -> &dyn UserRepository;
    // future: fn courses(&self) -> &dyn CourseRepository;

    async fn commit(self: Box<Self>) -> Result<(), Self::Error>;
    async fn rollback(self: Box<Self>) -> Result<(), Self::Error>;
}
```

- In-memory implementation: no-op transaction wrapping a `Mutex<HashMap>`.
- Future SQLx implementation: wraps a SQLx transaction.

### Domain Events (Deferred)

Registration is modeled as a synchronous CRUD use case for this slice. A `UserRegistered` domain event and outbox seam will be added when the first cross-cutting side effect is required (welcome email, audit log, analytics). Until then, the orchestration stays simple.

### API Versioning

- Use URL path versioning: `/api/v1/users`.
- Breaking changes require a new path version (`/api/v2/users`).
- Additive changes (new optional fields, new endpoints) stay within `/api/v1/`.
- Versioned DTOs live in `contracts::v1` and `contracts::v2` modules.
- Deprecation policy: supported versions remain available for at least 6 months after a new version is released; deprecated versions return a `Sunset` header.

## Feature Slice: User Registration

### API Contract

`POST /api/v1/users`

Headers:

- `Idempotency-Key: <uuid>` (required) — replaying the same key within 24 hours returns the originally created user.

Request body:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "str0ng!passphrase",
  "role": "student",
  "institution_id": "550e8400-e29b-41d4-a716-446655440001",
  "terms_accepted": true,
  "terms_version": "2026-06-18"
}
```

Fields:

| Field | Required | Notes |
|-------|----------|-------|
| `name` | yes | 1–200 chars. |
| `email` | yes | Validated and normalized per rules below. |
| `password` | yes | Min 12 chars, Argon2id hashed. |
| `role` | yes | One of `student`, `teacher`, `admin`, `parent`. |
| `institution_id` | conditional | Required for `teacher`/`admin`; optional for `student`. |
| `terms_accepted` | yes | Must be `true`. |
| `terms_version` | yes | Must match current terms version. |

Response `201 Created`:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "role": "student",
  "status": "pending_verification",
  "created_at": "2026-06-18T04:24:34Z"
}
```

Error responses follow the existing `ApiErrorBody { code, message }` shape:

- `400 bad_request` — invalid email, weak password, missing fields, malformed idempotency key.
- `409 conflict` — email already registered (or idempotency key reused with different payload).
- `429 too_many_requests` — rate limit exceeded.
- `500 internal_error` — unexpected failures (sanitized).

### Security Model

| Concern | Decision |
|---------|----------|
| Password hashing | Argon2id with sensible defaults (memory 19 MiB, iterations 2, parallelism 1). |
| Email verification | New accounts start in `pending_verification`; a verification email is sent (stubbed/outbox seam deferred; for now record `email_verified_at: None`). |
| Rate limiting | 5 registration attempts per IP per 15 minutes; return `429`. |
| Bot protection | Defer CAPTCHA to a follow-up slice; rate limiting is the first line of defense. |
| Idempotency | `Idempotency-Key` header required; replay returns identical `201` with original body. |
| Caller authentication | Registration is unauthenticated (self-service). Admin provisioning is a separate endpoint out of scope for this slice. |

### Data Flow

1. FE calls `POST /api/v1/users` with `Idempotency-Key`.
2. Axum handler `create_user` extracts `Json<CreateUserRequest>` and `IdempotencyKey`.
3. Handler checks rate limit by IP.
4. Handler builds `Ctx` and calls `user_service.create_user(ctx, req).await`.
5. `UserService` checks idempotency store (in-memory for now; future Redis/shared cache). If a completed user exists for the key, return it.
6. `UserService` validates input (email, password strength, role rules, terms).
7. `UserService` calls `UserRepository::create_if_not_exists(email, user)` — an atomic insert-or-return-existing operation.
8. Repository returns either `Created` or `AlreadyExists(existing_user)`.
9. On success, `UserService` stores the idempotency mapping and returns `UserDto`.
10. Handler returns `Json<UserDto>` with `StatusCode::CREATED`.

### Atomic Uniqueness

The repository port exposes an atomic operation so the check-then-create race cannot occur:

```rust
#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn create_if_not_exists(
        &self,
        ctx: &Ctx,
        email: &Email,
        user: &User,
    ) -> Result<CreateResult, DomainError>;

    async fn find_by_email(&self, ctx: &Ctx, email: &Email) -> Result<Option<User>, DomainError>;
    async fn find_by_id(&self, ctx: &Ctx, id: UserId) -> Result<Option<User>, DomainError>;
}

pub enum CreateResult {
    Created,
    AlreadyExists(User),
}
```

- In-memory implementation: hold a single `Mutex<HashMap<Email, User>>` (or `DashMap` if justified) and perform the check+insert under the lock.
- Future SQLx implementation: rely on a unique index on `email` and translate the unique-violation error into `CreateResult::AlreadyExists`.
- Integration test: fire concurrent `POST /api/v1/users` requests with the same email and assert exactly one `201 Created`.

### Domain Model

```rust
pub struct User {
    pub id: UserId,
    pub name: String,
    pub email: Email,
    pub role: Role,
    pub institution_id: Option<InstitutionId>,
    pub status: UserStatus,
    pub terms_accepted_at: DateTime<Utc>,
    pub terms_version: String,
    pub created_at: DateTime<Utc>,
}

pub struct Email(String); // validated, normalized
pub struct PasswordHash(String); // Argon2id hash, never plaintext

pub enum Role { Student, Teacher, Admin, Parent }
pub enum UserStatus { PendingVerification, Active, Suspended }
```

### Email Normalization Rules

1. Trim leading/trailing whitespace.
2. Reject addresses with comments, address-literals, or non-ASCII local parts (for now).
3. Lowercase the entire address.
4. Preserve dots and plus-addressing (e.g., `ada+tag@example.com` is distinct from `ada@example.com`).
5. Validate with a conservative regex and DNS MX check deferred to follow-up.

Unit tests must cover case variants, plus-address variants, and unicode-domain rejection.

### Repository Conformance Test

Add a `klynt-domain` test harness that exercises any `UserRepository` implementation:

- `create_if_not_exists` returns `Created` for a new user.
- `create_if_not_exists` returns `AlreadyExists` for a duplicate email.
- `find_by_email` returns the user after creation.
- `find_by_id` returns the user after creation.
- Concurrent duplicate creation produces exactly one winner.

The in-memory adapter must pass this harness in CI. Any future SQLx adapter must also pass it before being promoted to production.

## Error Handling

- `domain::DomainError`: precise, matchable variants (e.g., `AlreadyExists { email }`, `InvalidEmail`, `WeakPassword`, `InvalidRole`).
- `application`: propagates `DomainError`; may add application-level context.
- `api::AppError`: wraps `DomainError` and HTTP-specific errors (validation, internal, rate limit). Implements `IntoResponse`.
- Mapping:
  - `DomainError::NotFound` → `404`
  - `DomainError::AlreadyExists` → `409`
  - `DomainError::InvalidEmail` / `WeakPassword` / validation → `400`
  - `DomainError::RateLimited` → `429`
  - Everything else → `500` (logged, sanitized message)

## Frontend Integration

- Add a `registerUser(input, idempotencyKey)` function in the existing API client.
- Add a minimal `/register` page with a form.
- On submit, call the API and display the returned user JSON or error message.
- Generate TypeScript types from `klynt-contracts` at build time to eliminate FE/BE contract drift.

## Testing Strategy

### Unit Tests

- `domain`: test `Email` validation/normalization, `Password` validation, `User` creation, role rules.
- `application`: test `UserService` with a stub `UserRepository` and `UnitOfWork`.

### Repository Conformance Tests

- Run the shared harness against `InMemoryUserRepository` in CI.

### Integration Tests

- Add `backend/tests/users.rs` using the existing `helpers.rs` pattern.
- Use `tower::ServiceExt::oneshot` to hit `POST /api/v1/users` in-process.
- Assert `201 Created`, correct body shape, and `409 conflict` on duplicate email.
- Assert concurrent duplicate requests produce exactly one `201 Created`.
- Assert idempotency-key replay returns the same user.
- Assert rate limiting returns `429` after threshold.

### End-to-End / Contract Tests

- Add a Playwright E2E test for the `/register` flow covering happy path and `409 conflict`.
- Add an OpenAPI/contract test that validates the running API against the spec generated from `klynt-contracts`.
- Run both in CI before merging.

### Manual Verification

1. Run `cargo run` in `backend/`.
2. Run the Vite dev server in `frontend/`.
3. Open `/register`, submit the form, and confirm the created user response.
4. Confirm that a duplicate email returns a clear `409 conflict`.

## Migration Path from Current Backend

1. Add `contracts/`, `application/`, and `domain/` modules to the existing crate.
2. Move existing `src/api/` code into `src/api/` (kept as-is structurally, but imports from `application`/`domain`).
3. Move existing `src/error.rs` and `src/startup.rs` into `src/api/` or keep at crate root if shared by tests.
4. Move config/telemetry/state helpers to crate root; ensure they remain framework-agnostic where possible.
5. Implement the in-memory repository as a module inside `src/infrastructure/`.
6. Implement user registration as the first vertical slice.
7. When a second bounded context is added, evaluate workspace split by context and execute the migration then.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Circular dependencies between modules | High | Run `cargo tree` after each new module; keep domain dependency-free. |
| Over-engineering for a single feature | Medium | Keep first slice in a single crate; workspace split deferred until justified. |
| Duplicate accounts under concurrency | High | Use `create_if_not_exists` atomic repository operation and concurrency test. |
| In-memory store unfit for horizontal scale | High | Document as **dev-only / single-instance**; future SQLx adapter replaces it. |
| FE/BE contract drift | Medium | Generate TypeScript types from `klynt-contracts`; add contract test. |
| PII exposure in logs | High | Redact email/password in trace layer; add structured audit log. |

## PII Handling, Security, and Compliance

### Data Minimization

- Store only fields required for registration and platform function.
- Do not collect date of birth or government IDs until required by a specific feature.

### Encryption

- Passwords are never stored; only Argon2id hashes are retained.
- PII at rest will be encrypted with AES-256-GCM once persistence moves to PostgreSQL (defer encryption-at-rest for in-memory dev mode, but design the repository seam to accept an encryption adapter).
- All transport uses TLS in production.

### Consent and Lawful Basis

- Registration requires explicit `terms_accepted: true` and records `terms_version`.
- Record consent timestamp and version in the `User` aggregate.
- Provide a privacy notice link at the point of registration.

### Retention and Deletion

- Default retention: account data retained until account deletion.
- Implement a soft-delete path so users can request deletion; hard-delete after a legally required hold period.

### Access Control

- Repository methods accept `&Ctx` to enforce tenant scoping and audit identity in future slices.
- No code outside `infrastructure` constructs repository instances.

### Audit Logging

- Log every create/read/update of PII with `request_id`, `user_id`, action, and timestamp.
- Trace middleware must redact `password`, `authorization`, and cookie headers.

## Rollback Criteria

Roll back or halt the architecture migration if any of the following occurs:

1. `cargo check` time exceeds 10 s after the slice merges (indicates premature complexity).
2. Registration integration test coverage falls below 80 %.
3. Concurrent duplicate-email test fails or is flaky.
4. A shared crate (e.g., `klynt-contracts`) gains a framework dependency.
5. The team cannot add the next bounded context within one sprint because of coupling.

## Open Questions

1. When should the in-memory repository be replaced with PostgreSQL/SQLx? (Decision: after the registration slice is stable and the conformance test is in place.)
2. Should admin provisioning be a separate authenticated endpoint or a CLI tool? (Defer to follow-up slice.)
3. When should CAPTCHA be introduced? (Defer until abuse is observed or security review requires it.)

## Decision

Proceed with **Approach B revised**: keep the existing single crate for the registration slice, enforce Clean Architecture through module visibility, define `Ctx`/`UnitOfWork`/repository ports now, and introduce a bounded-context Cargo workspace only when a second context justifies the split.
