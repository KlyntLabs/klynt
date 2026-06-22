# gateways — HTTP API Gateway & Composition Root

## Overview

The **composition root** of the backend: HTTP handlers, middleware, and dependency wiring. This is where concrete implementations are wired to services and routes are defined.

## Structure

```
gateways/
├── src/
│   ├── state/                  # Application state & wiring
│   │   ├── services.rs         # Service wiring (composition root)
│   │   ├── config.rs           # Gateway config
│   │   └── mod.rs
│   ├── routes/                 # HTTP route handlers
│   │   ├── mod.rs
│   │   ├── auth.rs            # Auth endpoints
│   │   ├── users.rs           # User endpoints
│   │   ├── health.rs          # Health check
│   │   └── openapi.rs         # OpenAPI spec
│   ├── middleware/             # Axum middleware
│   │   ├── auth.rs            # Authentication middleware
│   │   ├── cors.rs            # CORS configuration
│   │   ├── request_id.rs      # Request ID tracking
│   │   └── error.rs           # Error handling
│   ├── error.rs               # Gateway error types
│   └── lib.rs
├── tests/                      # Integration tests
│   ├── auth_tests.rs
│   ├── user_tests.rs
│   └── support/
│       └── mod.rs             # Test utilities
├── openapi.yaml               # OpenAPI specification
└── Cargo.toml
```

## Responsibilities

### 1. Composition Root (`state/services.rs`)

**This is the ONLY place where concrete implementations are wired:**

```rust
pub struct Services {
    pub auth: Arc<AuthService>,
    pub session: Arc<SessionService>,
    pub user: Arc<UserService>,
}

pub async fn build_services(config: &Config) -> Result<Services> {
    // Wire repositories
    let user_repo = Arc::new(PgUserRepository::new(pool.clone())) as Arc<dyn UserRepository>;
    let session_store = Arc::new(RedisSessionStore::new(redis_conn)) as Arc<dyn SessionStore>;
    
    // Wire services
    let auth = Arc::new(AuthService::builder()
        .user_repository(user_repo.clone())
        .session_store(session_store.clone())
        // ... other dependencies
        .build()?);
    
    Ok(Services { auth, session, user })
}
```

**Rule:** Do NOT wire dependencies inside services — always here.

### 2. HTTP Handlers (`routes/`)

Route handlers delegate to services:

```rust
// routes/auth.rs
pub async fn register(
    State(services): State<Services>,
    Json(request): Json<RegistrationRequest>,
) -> Result<Json<RegistrationResponse>, GatewayError> {
    let ctx = ExecutionContext::new();
    let response = services.auth.register(&ctx, request).await?;
    Ok(Json(response))
}
```

### 3. Middleware (`middleware/`)

Cross-cutting HTTP concerns:

| Middleware | Purpose |
|------------|---------|
| `auth` | Bearer token authentication, injects user context |
| `cors` | CORS headers |
| `request_id` | Request ID generation/tracking |
| `error` | Error response formatting |

### 4. OpenAPI (`openapi.yaml`)

API specification for all endpoints. Keep in sync with route handlers.

## When to Modify This Crate

**DO** modify when:
- Adding new HTTP endpoints
- Adding new middleware
- Wiring new services or dependencies
- Modifying API contract (OpenAPI)

**DON'T** modify when:
- Changing business logic (belongs in services)
- Adding domain types (belongs in klynt_domain)
- Changing persistence logic (belongs in klynt_persistence)

## Route Organization

### Auth Routes (`routes/auth.rs`)

```
POST /api/v1/auth/register          - Register new user
POST /api/v1/auth/verify-email     - Verify email
POST /api/v1/auth/login            - Create session (login)
POST /api/v1/auth/logout           - End session (logout)
POST /api/v1/auth/request-password-reset
POST /api/v1/auth/reset-password
```

### User Routes (`routes/users.rs`)

```
GET  /api/v1/users/:id             - Get user profile
PUT  /api/v1/users/:id             - Update profile
POST /api/v1/users/:id/password     - Change password
GET  /api/v1/users                 - List users
DELETE /api/v1/users/:id           - Soft delete
```

### Health Routes (`routes/health.rs`)

```
GET /health                         - Health check
GET /health/db                     - Database health
GET /health/redis                  - Redis health
```

## Error Handling

Gateway errors implement `HttpError` from `klynt_base`:

```rust
impl HttpError for GatewayError {
    fn to_http_status(&self) -> StatusCode {
        match self {
            Self::NotFound(_) => StatusCode::NOT_FOUND,
            Self::Unauthorized => StatusCode::UNAUTHORIZED,
            Self::Conflict(_) => StatusCode::CONFLICT,
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::Internal => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}
```

## Middleware Pattern

```rust
// middleware/auth.rs
pub async fn auth_middleware(
    State(services): State<Services>,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Extract token, validate, inject context
    Ok(next.run(request).await)
}
```

## Testing

Integration tests use the full stack:

```rust
#[tokio::test]
async fn test_register_flow() {
    let mut test_context = TestContext::new().await;
    
    // Register
    let response = test_context
        .post("/api/v1/auth/register", register_request)
        .await;
    
    // Verify user created
    assert_eq!(response.status(), 201);
}
```

## Dependencies

### Services
- `auth_service` — Authentication flows
- `session_service` — Session management
- `user_service` — User profiles

### Foundation
- `klynt_base` — Ports and error types
- `klynt_domain` — Domain types

### Infrastructure
- `klynt_persistence` — Concrete implementations
- `klynt_telemetry` — Observability

### Web Framework
- `axum` — HTTP framework
- `tower` / `tower-http` — Middleware
- `tokio` — Async runtime

## Related Documentation

- [Backend AGENTS.md](../../AGENTS.md) — Overall architecture
- [Backend README](../../README.md) — API endpoint reference
