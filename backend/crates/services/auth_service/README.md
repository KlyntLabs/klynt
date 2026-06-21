# auth_service

Authentication service for the Klynt platform — a deep module with a small public interface and concentrated implementation.

## Public Interface

```rust
use auth_service::{AuthService, AuthConfig, Dependencies};
use klynt_contracts::auth::{LoginRequest, RegistrationRequest};
use klynt_core::ctx::ExecutionContext;

let service = AuthService::new(config, dependencies)?;
let response = service.login(&ctx, LoginRequest { ... }).await?;
let user_id = service.register(&ctx, RegistrationRequest { ... }).await?;
```

### Core Methods

- `login` — authenticate and create a session
- `register` — register a new user and send verification email
- `verify_email` — verify an email from a token
- `request_password_reset` — initiate a password reset (always returns Ok)
- `reset_password` — complete a password reset
- `logout` — invalidate a session

## Structure

```
src/
├── lib.rs              # Public interface
├── domain/             # Auth-specific domain (sessions, tokens, password policy)
├── application/        # Use case orchestration + ports
├── infrastructure/     # Adapters for repositories and services
├── models/             # Internal models
└── error.rs            # Auth-specific errors
```

## Testing

Tests cross the same public interface as production callers:

```bash
cargo test -p auth_service
```

## Design

- **Deep module**: six public methods hide password policy, session management, token handling, email flows, and audit logging.
- **Ports and adapters**: domain traits are implemented by infrastructure adapters, allowing test fakes and future real implementations.
- **Same seam for tests**: integration tests use the public `AuthService` API only.
