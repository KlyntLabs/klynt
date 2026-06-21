# Adding a New Service

This guide walks through adding a new business service to the Klynt backend.

## 1. Create the service directory

Create a new crate under `backend/crates/services/`:

```bash
mkdir -p backend/crates/services/my_service/src
```

Add it to `backend/Cargo.toml` workspace members and dependencies.

## 2. Implement the domain layer

Define your domain entities, value objects, and domain errors in `src/domain/`.

- Keep domain logic pure (no framework or storage dependencies)
- Use `klynt_base::ctx::ExecutionContext` for request context
- Use `klynt_common::util::UserId` for user identifiers

## 3. Implement the application layer

Define ports (traits) and use cases in `src/application/`:

- `application/ports/` — repository and service interfaces
- `application/services/` — use cases and workflows

## 4. Implement the infrastructure layer

Provide concrete adapters in `src/infrastructure/`:

- `infrastructure/repositories/` — database adapters
- `infrastructure/services/` — external service adapters (email, audit, hashing)

Use `klynt_persistence` for shared Postgres/Redis implementations when possible.

## 5. Wire into the gateway

Update `backend/crates/gateways/src/state/services.rs` to construct your service from configuration and expose it through the gateway state.

Add routes in `backend/crates/gateways/src/routes/` and nest them in `src/routes/mod.rs`.

## 6. Add tests

- Unit tests next to source files
- Integration tests in `tests/integration.rs` using fake repositories/services
- Postgres-backed integration tests in `tests/postgres_integration.rs` where needed

## 7. Update documentation

- Add the service to `backend/README.md`
- Update architecture diagrams if applicable
- Add an ADR if the service introduces new dependencies or patterns
