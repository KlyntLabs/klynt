# Phase 3: Gateway Layer Implementation Plan

**Goal**: Create the gateway layer — the HTTP entry point that composes services and handles routing, middleware, and request/response handling.

**Prerequisites**: Phase 1 (foundation) and Phase 2 (auth_service) complete.

**Estimated Time**: 1 week

---

## Overview

Transforming from layered monolith to gateway architecture:

```
BEFORE (Monolithic HTTP Layer):
├── klynt-api/              # HTTP handlers mixed with business logic
├── klynt-server/           # Entry point and composition
└── klynt-application/      # Application services

AFTER (Gateway Architecture):
└── gateways/
    └── api_gateway/        # Clean HTTP entry point
        ├── routes/         # HTTP routing only
        ├── middleware/     # Cross-cutting HTTP concerns
        ├── state/          # Service composition
        └── lib.rs          # Gateway configuration
```

---

## Design Principles (from codebase-design)

### Gateway as a Deep Module

**api_gateway** will be a **deep module**:

| Aspect | Implementation |
|--------|---------------|
| **Small Interface** | `run(config, services)` — single entry point |
| **Deep Implementation** | All HTTP complexity (routing, middleware, error handling) hidden |
| **High Leverage** | One function starts entire HTTP server with all services |
| **High Locality** | All HTTP knowledge in one place — not spread across services |

### Key Principle: No Business Logic in Gateway

The gateway **only handles HTTP concerns**:

✅ **Gateway DOES**:
- Route HTTP requests to service methods
- Validate request format (DTO validation)
- Handle authentication/authorization middleware
- Format service responses as HTTP responses
- Handle HTTP-specific errors

❌ **Gateway DOES NOT**:
- Contain business logic
- Make domain decisions
- Implement business rules
- Access database directly

### The Deletion Test

Can we delete the gateway without affecting services?
- ✅ **Yes**: Services have no knowledge of HTTP
- ✅ **Yes**: Could swap gateway for gRPC, GraphQL, etc.

---

## Step 1: Create Gateway Structure

### 1.1 Create Directory Tree

```bash
mkdir -p backend/crates/gateways/api_gateway/src/{routes,middleware,state}
```

**Target structure**:
```
api_gateway/
├── Cargo.toml
├── README.md
└── src/
    ├── lib.rs                    # Public interface (run() function)
    ├── main.rs                   # Entry point (or keep in klynt-server)
    ├── state/
    │   ├── mod.rs
    │   └── services.rs           # Service container
    ├── routes/
    │   ├── mod.rs
    │   ├── auth.rs               # Auth HTTP handlers
    │   ├── users.rs              # User HTTP handlers
    │   └── health.rs             # Health check
    ├── middleware/
    │   ├── mod.rs
    │   ├── auth.rs               # Authentication middleware
    │   ├── cors.rs               # CORS middleware
    │   ├── request_id.rs         # Request ID injection
    │   └── error_handler.rs     # Error response handling
    ├── error.rs                  # HTTP error types
    └── response.rs               # Response helpers
```

---

## Step 2: Create Cargo.toml

**File**: `backend/crates/gateways/api_gateway/Cargo.toml`

```toml
[package]
name = "api_gateway"
version = "0.1.0"
edition = "2021"

[dependencies]
# === Services ===
auth_service = { path = "../../services/auth_service" }

# === Phase 1 Foundation ===
klynt_core = { path = "../../core/klynt_core" }
klynt_contracts = { path = "../../shared/klynt_contracts" }
klynt_shared_domain = { path = "../../shared/klynt_domain" }
klynt_utils = { path = "../../shared/klynt_utils" }
klynt_tracing = { path = "../../infrastructure/klynt_tracing" }

# === Web Framework ===
axum = { workspace = true }
tower = { workspace = true }
tower-http = { workspace = true }
tower-cookies = { workspace = true }

# === Async Runtime ===
tokio = { workspace = true }

# === Serialization ===
serde = { workspace = true }
serde_json = { workspace = true }

# === Validation ===
validator = { workspace = true }

# === HTTP ===
hyper = { workspace = true }

# === Error Handling ===
thiserror = { workspace = true }
anyhow = { workspace = true }

# === Tracing ===
tracing = { workspace = true }

# === Configuration ===
config = { workspace = true }
dotenvy = { workspace = true }

# === OpenAPI ===
utoipa = { workspace = true }
utoipa-swagger-ui = { version = "8", features = ["axum"] }

# === Metrics (optional) ===
prometheus = { workspace = true }
```

---

## Step 3: Design the Public Interface

**File**: `backend/crates/gateways/api_gateway/src/lib.rs`

This is the **external seam** for the gateway.

```rust
//! # API Gateway
//!
//! HTTP entry point for the Klynt platform.
//!
//! ## Design
//!
//! This is a **deep module**: single public function that starts the entire server.
//!
//! - **Interface**: `run(config, services)` — one function to rule them all
//! - **Implementation**: All HTTP complexity (routing, middleware, services) hidden inside
//! - **Composition Root**: Where services are wired together

pub mod error;
pub mod middleware;
pub mod response;
pub mod routes;
pub mod state;

use axum::Router;
use klynt_tracing::subscriber;
use state::Services;

pub use error::{GatewayError, GatewayResult};
pub use state::Config;

/// Run the API gateway — the single public interface.
///
/// This function:
/// 1. Initializes tracing
/// 2. Wires up all services
/// 3. Creates the router with all routes
/// 4. Starts the HTTP server
///
/// ## Arguments
///
/// - `config` - Gateway configuration
/// - `services` - All business services
///
/// ## Returns
///
/// Returns `Ok(())` when server shuts down gracefully, or error on failure.
pub async fn run(config: Config, services: Services) -> Result<(), GatewayError> {
    // 1. Initialize tracing
    subscriber::init_tracing(&config.service_name);

    // 2. Build the router
    let app = routes::create_router(config.clone(), services);

    // 3. Start the server
    let listener = tokio::net::TcpListener::bind(&config.bind_address)
        .await
        .map_err(|e| GatewayError::bind(format!("Failed to bind to {}: {}", config.bind_address, e)))?;

    tracing::info!("API Gateway listening on {}", config.bind_address);

    axum::serve(listener, app)
        .await
        .map_err(|e| GatewayError::server(format!("Server error: {}", e)))?;

    Ok(())
}

/// Create the router (for testing).
pub fn create_router(config: Config, services: Services) -> Router {
    routes::create_router(config, services)
}
```

---

## Step 4: Create State/Services Module

**File**: `backend/crates/gateways/api_gateway/src/state/services.rs`

```rust
//! Service container — composition root.

use std::sync::Arc;

use auth_service::{AuthService, AuthConfig, Dependencies};
use klynt_infrastructure::email::SmtpEmailService;
use klynt_infrastructure::password_hasher::ArgonPasswordHasher;
use klynt_infrastructure::repositories::{
    PgSessionStore, PgTokenStore, PgUserRepository,
};
use klynt_infrastructure::token_generator::TokenGenerator;

use super::Config;

/// All business services — composed together.
pub struct Services {
    pub auth: Arc<AuthService>,
    // Future services:
    // pub user: Arc<user_service::UserService>,
    // pub course: Arc<course_service::CourseService>,
}

impl Services {
    /// Create all services from configuration.
    ///
    /// This is the **composition root** — where all dependencies are wired together.
    pub async fn from_config(config: &Config) -> Result<Self, crate::GatewayError> {
        // TODO: Set up database pool, Redis, etc.
        // For now, use placeholder implementations

        // Wire auth service dependencies
        let auth_service = Self::create_auth_service(config).await?;

        Ok(Self {
            auth: Arc::new(auth_service),
        })
    }

    async fn create_auth_service(config: &Config) -> Result<AuthService, crate::GatewayError> {
        // TODO: Replace with real infrastructure
        let password_hasher: Arc<dyn auth_service::application::ports::PasswordHasher> =
            Arc::new(ArgonPasswordHasher::new());

        // Create auth service with dependencies
        let auth_service = AuthService::new(
            AuthConfig {
                base_url: config.base_url.clone(),
                session_duration_secs: 86400,
                token_duration_secs: 3600,
                password_policy: None,
            },
            auth_service::Dependencies {
                user_repository: todo!("Wire from infrastructure"),
                session_store: todo!("Wire from infrastructure"),
                token_store: todo!("Wire from infrastructure"),
                email_sender: todo!("Wire from infrastructure"),
                audit_logger: todo!("Wire from infrastructure"),
                password_hasher,
                clock: Arc::new(auth_service::application::ports::SystemClock),
            },
        )?;

        Ok(auth_service)
    }
}
```

---

## Step 5: Create Routes

### 5.1 routes/mod.rs

**File**: `backend/crates/gateways/api_gateway/src/routes/mod.rs`

```rust
//! HTTP route definitions.

pub mod auth;
pub mod health;
// pub mod users;

use axum::Router;
use crate::state::{Config, Services};

/// Create the complete router with all routes and middleware.
pub fn create_router(config: Config, services: Services) -> Router {
    // Build base router with state
    Router::new()
        // Health check (no auth required)
        .route("/health", axum::routing::get(health::health_check))
        // API v1 routes
        .nest("/api/v1", api_v1_routes(services.clone()))
        // Middleware (applies to all routes)
        .layer(axum::middleware::from_fn(
            crate::middleware::request_id::request_id_middleware,
        ))
        .layer(axum::middleware::from_fn(
            crate::middleware::error_handler::error_handler_middleware,
        ))
        .with_state((config, services))
}

/// API v1 routes.
fn api_v1_routes(services: Services) -> Router {
    Router::new()
        // Auth routes (no authentication required)
        .nest("/auth", auth::routes())
        // Protected routes (require authentication)
        // .nest("/users", user_routes()) // Future
        .with_state(services)
}
```

### 5.2 routes/auth.rs

**File**: `backend/crates/gateways/api_gateway/src/routes/auth.rs`

```rust
//! Authentication HTTP handlers.

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};

use klynt_contracts::auth::{LoginRequest, LoginResponse, RegistrationRequest};
use klynt_core::ctx::{ExecutionContext, RequestContext};

use crate::state::Services;
use crate::response::SuccessResponse;

/// Auth router — handles login, register, password reset, etc.
pub fn routes() -> axum::Router<Services> {
    axum::Router::new()
        .route("/login", axum::routing::post(login))
        .route("/register", axum::routing::post(register))
        .route("/verify-email", axum::routing::post(verify_email))
        .route("/request-password-reset", axum::routing::post(request_password_reset))
        .route("/reset-password", axum::routing::post(reset_password))
        .route("/logout", axum::routing::post(logout))
}

/// POST /api/v1/auth/login
///
/// Authenticate a user and return a session token.
async fn login(
    State(services): State<Services>,
    Json(request): Json<LoginRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let ctx = ExecutionContext::new(RequestContext::new());

    let response = services
        .auth
        .login(&ctx, request)
        .await
        .map_err(crate::GatewayError::from)?;

    Ok(Json(SuccessResponse::ok(response)))
}

/// POST /api/v1/auth/register
///
/// Register a new user.
async fn register(
    State(services): State<Services>,
    Json(request): Json<RegistrationRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let ctx = ExecutionContext::new(RequestContext::new());

    let user_id = services
        .auth
        .register(&ctx, request)
        .await
        .map_err(crate::GatewayError::from)?;

    Ok(Json(SuccessResponse::ok(user_id.to_string())))
}

/// POST /api/v1/auth/verify-email
///
/// Verify email with token.
async fn verify_email(
    State(services): State<Services>,
    Json(request): Json<VerifyEmailRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let ctx = ExecutionContext::new(RequestContext::new());

    services
        .auth
        .verify_email(&ctx, &request.token)
        .await
        .map_err(crate::GatewayError::from)?;

    Ok(Json(SuccessResponse::message("Email verified successfully")))
}

#[derive(serde::Deserialize)]
struct VerifyEmailRequest {
    token: String,
}

/// POST /api/v1/auth/request-password-reset
///
/// Request password reset email.
async fn request_password_reset(
    State(services): State<Services>,
    Json(request): Json<RequestPasswordResetRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let ctx = ExecutionContext::new(RequestContext::new());

    services
        .auth
        .request_password_reset(&ctx, &request.email)
        .await
        .map_err(crate::GatewayError::from)?;

    // Always return OK to prevent email enumeration
    Ok(Json(SuccessResponse::message(
        "If the email exists, a password reset link has been sent",
    )))
}

#[derive(serde::Deserialize)]
struct RequestPasswordResetRequest {
    email: String,
}

/// POST /api/v1/auth/reset-password
///
/// Reset password with token.
async fn reset_password(
    State(services): State<Services>,
    Json(request): Json<ResetPasswordRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let ctx = ExecutionContext::new(RequestContext::new());

    services
        .auth
        .reset_password(&ctx, &request.token, &request.new_password)
        .await
        .map_err(crate::GatewayError::from)?;

    Ok(Json(SuccessResponse::message("Password reset successfully")))
}

#[derive(serde::Deserialize)]
struct ResetPasswordRequest {
    token: String,
    new_password: String,
}

/// POST /api/v1/auth/logout
///
/// Logout and invalidate session.
async fn logout(
    State(services): State<Services>,
    Json(request): Json<LogoutRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let ctx = ExecutionContext::new(RequestContext::new());

    services
        .auth
        .logout(&ctx, &request.session_token)
        .await
        .map_err(crate::GatewayError::from)?;

    Ok(Json(SuccessResponse::message("Logged out successfully")))
}

#[derive(serde::Deserialize)]
struct LogoutRequest {
    session_token: String,
}
```

### 5.3 routes/health.rs

**File**: `backend/crates/gateways/api_gateway/src/routes/health.rs`

```rust
//! Health check endpoint.

use axum::{
    extract::State,
    response::Json,
};

use crate::state::Services;

/// GET /health
///
/// Health check endpoint.
pub async fn health_check(State(services): State<Services>) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "services": {
            "auth": "ok"
        }
    }))
}
```

---

## Step 6: Create Middleware

### 6.1 middleware/request_id.rs

**File**: `backend/crates/gateways/api_gateway/src/middleware/request_id.rs`

```rust
//! Request ID middleware.

use axum::{
    extract::Request,
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

pub async fn request_id_middleware(
    request: Request,
    next: Next,
) -> Response {
    // Generate or extract request ID
    let request_id = request
        .headers()
        .get("x-request-id")
        .and_then(|v| v.to_str().ok())
        .unwrap_or_else(|| {
            let id = Uuid::new_v4().to_string();
            &id
        });

    // TODO: Store in request extension for tracing
    // For now, just add to response headers

    let response = next.run(request).await;

    // Add request ID to response headers
    let mut response = response;
    response
        .headers_mut()
        .insert("x-request-id", request_id.parse().unwrap());

    response
}
```

### 6.2 middleware/error_handler.rs

**File**: `backend/crates/gateways/api_gateway/src/middleware/error_handler.rs`

```rust
//! Error handling middleware.

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};

pub async fn error_handler_middleware(
    request: Request,
    next: Next,
) -> Result<Response, Response> {
    Ok(next.run(request).await)
}
```

---

## Step 7: Create Error Module

**File**: `backend/crates/gateways/api_gateway/src/error.rs`

```rust
//! Gateway error types.

use axum::{
    http::StatusCode,
    response::{IntoResponse, Json, Response},
};

/// Gateway error type.
#[derive(thiserror::Error, Debug)]
pub enum GatewayError {
    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Forbidden: {0}")]
    Forbidden(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Service unavailable: {0}")]
    ServiceUnavailable(String),

    // Auth service errors
    #[error("Auth error: {0}")]
    Auth(#[from] auth_service::AuthError),
}

impl GatewayError {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            Self::Forbidden(_) => StatusCode::FORBIDDEN,
            Self::NotFound(_) => StatusCode::NOT_FOUND,
            Self::Conflict(_) => StatusCode::CONFLICT,
            Self::Internal(_) | Self::Auth(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Self::ServiceUnavailable(_) => StatusCode::SERVICE_UNAVAILABLE,
        }
    }
}

impl IntoResponse for GatewayError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let body = serde_json::json!({
            "error": self.to_string(),
            "code": status.canonical_reason().unwrap_or("UNKNOWN"),
        });

        (status, Json(body)).into_response()
    }
}

impl From<anyhow::Error> for GatewayError {
    fn from(e: anyhow::Error) -> Self {
        Self::Internal(e.to_string())
    }
}

/// Result type for gateway operations.
pub type GatewayResult<T> = Result<T, GatewayError>;
```

---

## Step 8: Create Response Helpers

**File**: `backend/crates/gateways/api_gateway/src/response.rs`

```rust
//! Response helpers.

use serde::{Deserialize, Serialize};

/// Standard success response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuccessResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
}

impl<T> SuccessResponse<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            message: None,
        }
    }

    pub fn message(message: &'static str) -> Self {
        Self {
            success: true,
            data: None,
            message: Some(message.to_string()),
        }
    }
}
```

---

## Step 9: Create State/Config Module

**File**: `backend/crates/gateways/api_gateway/src/state/mod.rs`

```rust
//! Gateway state and configuration.

pub mod services;

use serde::{Deserialize, Serialize};

/// Gateway configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// Service name for tracing
    pub service_name: String,

    /// Bind address for HTTP server
    pub bind_address: String,

    /// Base URL for email links
    pub base_url: String,

    /// Database URL
    pub database_url: String,

    /// Redis URL
    pub redis_url: Option<String>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            service_name: "api-gateway".to_string(),
            bind_address: "0.0.0.0:3000".to_string(),
            base_url: "https://klynt.edu".to_string(),
            database_url: "".to_string(),
            redis_url: None,
        }
    }
}
```

---

## Step 10: Create Entry Point

### Option A: Standalone Binary

**File**: `backend/crates/gateways/api_gateway/src/main.rs`

```rust
//! API Gateway entry point.

use api_gateway::{run, Config, Services};
use api_gateway::state::Config;

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    // Load configuration
    dotenvy::dotenv().ok();
    let config = Config::from_env()?;

    // Wire services
    let services = Services::from_config(&config).await?;

    // Run the gateway
    run(config, services).await?;

    Ok(())
}

impl Config {
    fn from_env() -> Result<Self, config::ConfigError> {
        let settings = config::Config::builder()
            .add_source(config::Environment::default().separator("__"))
            .build()?;

        settings.try_deserialize()
    }
}
```

### Option B: Integrate with Existing klynt-server

Keep existing entry point, just swap implementation:

```rust
// In klynt-server/src/main.rs
use api_gateway::{run, Services};

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    // Load config, wire services...
    let config = Config::from_env()?;
    let services = Services::from_config(&config).await?;

    run(config, services).await
}
```

---

## Step 11: Update Workspace

**File**: `backend/Cargo.toml`

```toml
[workspace]
members = [
    # === Existing (will be removed after Phase 3) ===
    "crates/klynt-domain",
    "crates/klynt-application",
    "crates/klynt-infrastructure",
    "crates/klynt-api",
    "crates/klynt-server",

    # === Phase 1 Foundation ===
    "crates/core/klynt_core",
    "crates/shared/klynt_contracts",
    "crates/shared/klynt_domain",
    "crates/shared/klynt_utils",
    "crates/infrastructure/klynt_messaging",
    "crates/infrastructure/klynt_storage",
    "crates/infrastructure/klynt_tracing",

    # === Phase 2 ===
    "crates/services/auth_service",

    # === NEW - Phase 3 ===
    "crates/gateways/api_gateway",
]

[workspace.dependencies]
# ... add api_gateway ...
api_gateway = { path = "crates/gateways/api_gateway" }
```

---

## Step 12: Migrate OpenAPI Documentation

**From**: `klynt-api/src/openapi.rs`
**To**: `api_gateway/src/openapi.rs`

Update to use utoipa with new routes:

```rust
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::routes::auth::login,
        crate::routes::auth::register,
        // ... other routes
    ),
    components(schemas(
        klynt_contracts::auth::LoginRequest,
        klynt_contracts::auth::LoginResponse,
        // ... other schemas
    )),
    tags(
        (name = "auth", description = "Authentication endpoints"),
        (name = "users", description = "User management"),
    )
)]
pub struct ApiDoc;

/// Add Swagger UI to router.
pub fn swagger_ui() -> Router {
    SwaggerUi::new("/swagger-ui/{*}")
        .url("/api-docs/openapi.json", ApiDoc)
        .into_router()
}
```

---

## Step 13: Integration Tests

**File**: `backend/crates/gateways/api_gateway/tests/integration.rs`

```rust
//! Gateway integration tests.

use axum::{
    body::Body,
    http::{Method, StatusCode},
};
use axum_test::TestServer;
use tower::ServiceExt;

use api_gateway::{Config, Services, create_router};

#[tokio::test]
async fn test_health_endpoint() {
    let config = Config::default();
    let services = Services::from_config(&config).await.unwrap();
    let app = create_router(config, services);

    let response = app
        .oneshot(
            axum::http::Request::builder()
                .method(Method::GET)
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_login_endpoint() {
    let config = Config::default();
    let services = Services::from_config(&config).await.unwrap();
    let app = create_router(config, services);

    let login_request = serde_json::json!({
        "email": "test@example.com",
        "password": "password123"
    });

    let response = app
        .oneshot(
            axum::http::Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&login_request).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Verify response
    assert!(response.status().is_success() || response.status().is_client_error());
}
```

---

## Phase 3 Completion Checklist

### Structure
- [ ] Gateway directory created
- [ ] Routes module created (auth, health)
- [ ] Middleware module created
- [ ] State/services module created
- [ ] Error module created
- [ ] Response helpers created

### Gateway Behavior
- [ ] Single public function: `run(config, services)`
- [ ] No business logic in gateway
- [ ] All calls delegate to services
- [ ] Proper error handling
- [ ] Request ID middleware
- [ ] Health check endpoint

### Integration
- [ ] Services wired correctly
- [ ] Database/Redis configured
- [ ] OpenAPI documentation updated
- [ ] Workspace updated

### Testing
- [ ] Unit tests for handlers
- [ ] Integration tests for full flows
- [ ] All tests pass

### Build
- [ ] `cargo build -p api_gateway` succeeds
- [ ] `cargo build --workspace` succeeds
- [ ] `cargo test -p api_gateway` passes
- [ ] `cargo clippy -p api_gateway` clean

---

## What's Next (Phase 4 Preview)

After Phase 3 completes:

1. **Extract user_service** — Following auth_service pattern
2. **Wire user_service** into gateway
3. **Remove old crates** — klynt-application, klynt-api, klynt-server (or keep minimal server)
4. **Final cleanup** — Remove monolithic layer code

---

## Notes

- **Deep module achieved**: Single function interface, all HTTP complexity hidden
- **Composition root**: Services wired together in one place
- **No business logic**: Gateway only handles HTTP concerns
- **Services remain pure**: No HTTP knowledge in auth_service
- **Testable**: Can test with fake services
- **Deletion test passes**: Can swap gateway for gRPC/GraphQL without touching services

---

## Design Decision Log

| Decision | Rationale |
|----------|-----------|
| Single `run()` function | Smallest possible interface, maximum depth |
| Services injected | Gateway doesn't create dependencies |
| No business logic | Services own business rules |
| Routes in separate module | Each route file is independently understandable |
| Error handling in middleware | Centralized error response formatting |
| Request ID middleware | Distributed tracing support |
| Health check endpoint | Operational readiness probe |
