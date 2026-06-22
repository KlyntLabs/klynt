# gateways — HTTP API Gateway & Composition Root

## Overview

The **composition root** of the backend: HTTP handlers, middleware, and dependency wiring. This is where concrete implementations are wired to services and routes are defined.

## Structure

```
gateways/
├── src/
│   ├── state/                  # Application state & wiring
│   │   ├── services.rs         # Service wiring (composition root)
│   │   └── mod.rs              # Gateway config
│   ├── routes/                 # HTTP route handlers
│   │   ├── mod.rs
│   │   ├── auth.rs             # Auth endpoints
│   │   ├── users.rs            # User endpoints
│   │   ├── health.rs           # Health check
│   │   └── openapi.rs          # OpenAPI spec
│   ├── middleware/             # Axum middleware
│   │   ├── auth.rs             # Bearer token authentication
│   │   ├── cors.rs             # CORS configuration
│   │   ├── error_handler.rs    # Error response formatting
│   │   ├── metrics.rs          # HTTP request metrics
│   │   ├── rate_limit.rs       # Per-action rate limiting
│   │   ├── request_id.rs       # Request ID generation/tracking
│   │   └── security_headers.rs # Security headers
│   ├── error.rs                # Gateway error types
│   ├── lib.rs
│   └── openapi.yaml            # OpenAPI specification
├── tests/                      # Integration tests
│   ├── config_from_env.rs
│   ├── integration.rs
│   ├── rate_limit.rs
│   ├── real_services.rs
│   └── support/
│       ├── auth.rs
│       ├── rate_limiter.rs
│       ├── session.rs
│       └── user.rs
└── Cargo.toml
```

## Responsibilities

### 1. Composition Root (`state/services.rs`)

**This is the ONLY place where concrete implementations are wired:**

```rust
use std::sync::Arc;
use ipnet::IpNet;

pub struct Services {
    pub auth: Arc<AuthService>,
    pub user: Arc<UserService>,
    pub session: Arc<SessionService>,
    pub rate_limiter: Arc<dyn RateLimiter>,
    pub trusted_proxies: Arc<Vec<IpNet>>,
}

pub async fn from_config(config: &Config) -> Result<Services, GatewayError> {
    // ... connect pool, run migrations ...

    let trusted_proxies = Arc::new(
        config::parse_trusted_proxies(&config.trusted_proxies)
            .map_err(|e| GatewayError::configuration(e.to_string()))?,
    );

    Ok(Services {
        auth: Arc::new(auth_service),
        user: Arc::new(user_service),
        session: Arc::new(session_service),
        rate_limiter,
        trusted_proxies,
    })
}
```

**Rule:** Do NOT wire dependencies inside services — always here.

**Rate limiting:** If `rate_limiter.enabled` is `true`, `REDIS_URL` must be configured; otherwise `from_config` returns a `GatewayError::Configuration` error. When disabled, a no-op limiter is wired.

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
| `error_handler` | Error response formatting |
| `metrics` | HTTP request count/duration metrics |
| `rate_limit` | Per-action rate limiting on auth endpoints |
| `request_id` | Request ID generation/tracking |
| `security_headers` | Security headers (HSTS, CSP, etc.) |

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
- Adding domain types (belongs in domain)
- Changing persistence logic (belongs in persistence)

## Route Organization

### Auth Routes (`routes/auth.rs`)

```
POST /api/v1/auth/register              - Register new user
POST /api/v1/auth/verify-email          - Verify email
POST /api/v1/auth/login                 - Create session (login)
POST /api/v1/auth/logout                - End session (logout)
POST /api/v1/auth/request-password-reset
POST /api/v1/auth/reset-password
```

### User Routes (`routes/users.rs`)

```
GET    /api/v1/users/me            - Get current user profile
PATCH  /api/v1/users/me            - Update current user profile
POST   /api/v1/users/me/password   - Change current user password
GET    /api/v1/users               - List users
GET    /api/v1/users/{id}          - Get user by ID
DELETE /api/v1/users/{id}          - Soft delete user
```

### Health Routes (`routes/health.rs`)

```
GET /health                         - Legacy health check
GET /health/live                    - Liveness probe
GET /health/ready                   - Readiness probe
```

### Observability Routes

```
GET /metrics                        - Prometheus metrics (public; restrict before production)
```

> **Security note:** `/metrics` is currently served without authentication. It
> must be protected (separate admin port, auth, or network policy) before
> exposing the gateway to untrusted networks.

## Error Handling

Gateway errors implement `IntoResponse` and expose stable error codes:

```rust
pub enum GatewayError {
    BadRequest(String),
    Unauthorized(String),
    Forbidden(String),
    NotFound(String),
    Conflict(String),
    Configuration(String),
    ServiceUnavailable(String),
    RateLimited(u32),
    Internal(String),
    Auth(auth_service::AuthError),
    User(user_service::UserError),
}
```

`GatewayError::RateLimited(retry_after)` returns `429 Too Many Requests` with a `Retry-After` header.

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
- `base` — Ports and error types
- `domain` — Domain types

### Infrastructure
- `persistence` — Concrete implementations
- `observability` — Observability

### Web Framework
- `axum` — HTTP framework
- `tower` / `tower-http` — Middleware
- `tokio` — Async runtime

## Related Documentation

- [Backend AGENTS.md](../../AGENTS.md) — Overall architecture
- [Backend README](../../README.md) — API endpoint reference
