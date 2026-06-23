# Phase 1 Core Auth Foundation — Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining production-readiness gaps from Phase 1 (rate limiting, Redis session cache, cookie-based SSO, health/readiness/metrics, security headers, and domain model alignment) before starting Phase 2 multi-tenancy.

**Architecture:** Keep Postgres authoritative for sessions and audit; add a thin Redis read-through cache in front of `PgSessionStore`; expose a per-IP rate-limit middleware on auth routes; return `Set-Cookie` for cross-subdomain SSO; add `/health/ready` and `/metrics` routes using existing observability traits; align the `domain::User` model with the DB schema.

**Tech Stack:** Rust, Axum 0.8, SQLx, PostgreSQL, Redis, `metrics` + `metrics-exporter-prometheus`, `tower-http` cookie support, `chrono`, `uuid`

---

## File Structure

```
backend/
├── migrations/
│   ├── 0005_fix_pgcrypto_and_audit_ip.sql   ← NEW
├── crates/
│   ├── base/src/
│   │   ├── ports/
│   │   │   ├── rate_limiter.rs              ← MODIFY (add per-action variants)
│   │   │   └── session.rs                   ← MODIFY (add refresh-token concept)
│   │   └── ctx.rs                           ← MODIFY (add device/tentative fields)
│   ├── infra/persistence/src/
│   │   ├── rate_limiter.rs                  ← MODIFY (accept action scope)
│   │   ├── repositories/
│   │   │   ├── session.rs                   ← MODIFY (wrap with Redis cache)
│   │   │   └── audit_event.rs               ← MODIFY (snapshots)
│   │   └── lib.rs                           ← MODIFY (exports)
│   ├── infra/observability/src/
│   │   ├── health.rs                        ← NEW (Postgres + Redis checks)
│   │   ├── metrics.rs                       ← NEW (Prometheus recorder)
│   │   └── lib.rs                           ← MODIFY (exports)
│   ├── services/session_service/src/
│   │   ├── lib.rs                           ← MODIFY (remember_me, refresh token)
│   │   └── config.rs                        ← MODIFY (add long/short durations)
│   ├── services/auth_service/src/
│   │   ├── application/use_cases/login.rs   ← MODIFY (remember_me, refresh token)
│   │   ├── application/use_cases/logout.rs  ← MODIFY (revoke refresh too)
│   │   ├── config.rs                        ← MODIFY (cookie settings)
│   │   └── contracts/auth.rs                ← MODIFY (response fields)
│   ├── gateways/src/
│   │   ├── middleware/
│   │   │   ├── rate_limit.rs                ← NEW
│   │   │   ├── security_headers.rs          ← MODIFY (add CSP)
│   │   │   └── mod.rs                       ← MODIFY (exports)
│   │   ├── routes/
│   │   │   ├── auth.rs                      ← MODIFY (Set-Cookie)
│   │   │   ├── health.rs                    ← MODIFY (ready probe)
│   │   │   ├── metrics.rs                   ← NEW
│   │   │   └── mod.rs                       ← MODIFY (mount routes)
│   │   ├── state/
│   │   │   ├── services.rs                  ← MODIFY (wire Redis, health, metrics)
│   │   │   └── mod.rs                       ← MODIFY (config fields)
│   │   └── error.rs                         ← MODIFY (rate-limit mapping)
│   └── shared/domain/src/
│       ├── user.rs                          ← MODIFY (global_role, email_verified_at)
│       ├── role.rs                          ← MODIFY (institution enforcement)
│       └── contracts/auth.rs                ← MODIFY (LoginRequest, LoginResponse)
```

---

## Task 1: Add Migration Fixes (pgcrypto + Audit IP Type)

**Files:**
- Create: `backend/migrations/0005_fix_pgcrypto_and_audit_ip.sql`
- Modify: `backend/migrations/0001_initial_schema.sql` (document, do not rerun in prod)
- Test: `backend/crates/infra/persistence/tests/audit_repo_test.rs` (existing)

### Step 1.1: Create migration fix

**Create: `backend/migrations/0005_fix_pgcrypto_and_audit_ip.sql`**

```sql
-- Phase 1 completion fixes:
-- 1. Explicitly enable pgcrypto (used by gen_random_uuid()).
-- 2. Change audit_events.actor_ip_address to INET for richer querying.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE audit_events
    ALTER COLUMN actor_ip_address TYPE INET
    USING actor_ip_address::INET;
```

### Step 1.2: Update original migration comments

**Modify: `backend/migrations/0001_initial_schema.sql`**

Add at the top (after the header comment):

```sql
-- Requires pgcrypto extension for gen_random_uuid().
-- The 0005_fix_pgcrypto_and_audit_ip migration enables it explicitly.
```

### Step 1.3: Run migration and verify

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
sqlx migrate run --source migrations
```

**Expected:** `0005_fix_pgcrypto_and_audit_ip.sql` applies successfully.

### Step 1.4: Commit

```bash
git add migrations/0005_fix_pgcrypto_and_audit_ip.sql migrations/0001_initial_schema.sql
git commit -m "fix: enable pgcrypto and use INET for audit IP"
```

---

## Task 2: Align Domain User Model with Schema

**Files:**
- Modify: `backend/crates/shared/domain/src/user.rs`
- Modify: `backend/crates/infra/persistence/src/repositories/user.rs`
- Modify: `backend/crates/services/auth_service/src/application/use_cases/registration.rs`
- Test: `backend/crates/shared/domain/src/user_test.rs` (or embedded `#[cfg(test)]`)

### Step 2.1: Add missing fields to domain User

**Modify: `backend/crates/shared/domain/src/user.rs`**

Change the `User` struct (around the existing definition) to include:

```rust
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::role::{GlobalRole, UserRole};
use crate::email::Email;

#[derive(Debug, Clone)]
pub struct User {
    pub id: UserId,
    pub email: Email,
    pub full_name: Option<String>,
    pub password_hash: String,
    pub status: UserStatus,
    pub role: UserRole,
    pub global_role: Option<GlobalRole>,      // NEW
    pub email_verified_at: Option<DateTime<Utc>>, // NEW
    pub institution_id: Option<Uuid>,         // NEW
    pub terms_accepted_at: DateTime<Utc>,
    pub terms_version: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}
```

Update the constructor / builder used by the user repository to set the new fields.

### Step 2.2: Update repository mapping

**Modify: `backend/crates/infra/persistence/src/repositories/user.rs`**

In the `try_from` / row-mapping logic, populate the new fields from SQL columns:

```rust
User {
    id: UserId(row.id),
    email: Email::parse(&row.email).expect("DB stores valid emails"),
    full_name: if row.name.is_empty() { None } else { Some(row.name) },
    password_hash: row.password_hash,
    status: row.status.parse().expect("valid status"),
    role: row.role.parse().unwrap_or(UserRole::Student),
    global_role: row.global_role.and_then(|r| r.parse().ok()),     // NEW
    email_verified_at: row.email_verified_at,                       // NEW
    institution_id: row.institution_id,                             // NEW
    terms_accepted_at: row.terms_accepted_at,
    terms_version: row.terms_version,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
}
```

### Step 2.3: Update registration to persist institution_id

**Modify: `backend/crates/services/auth_service/src/application/use_cases/registration.rs`**

Where the pending user is created, pass `institution_id` from the request if `role` requires it:

```rust
let institution_id = if request.role.requires_institution() {
    request.institution_id
} else {
    None
};
```

Ensure the repository's `create_pending_user` call stores `institution_id`.

### Step 2.4: Run domain tests

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo nextest run -p domain
```

**Expected:** All domain tests pass.

### Step 2.5: Commit

```bash
git add crates/shared/domain/src/user.rs crates/infra/persistence/src/repositories/user.rs crates/services/auth_service/src/application/use_cases/registration.rs
git commit -m "feat: align domain User with schema (global_role, email_verified_at, institution_id)"
```

---

## Task 3: Add Redis Read-Through Session Cache

**Files:**
- Create: `backend/crates/infra/persistence/src/repositories/cached_session_store.rs`
- Modify: `backend/crates/infra/persistence/src/repositories/mod.rs`
- Modify: `backend/crates/gateways/src/state/services.rs`
- Test: `backend/crates/infra/persistence/tests/cached_session_store_test.rs` ← NEW

### Step 3.1: Create cached session store

**Create: `backend/crates/infra/persistence/src/repositories/cached_session_store.rs`**

```rust
use std::sync::Arc;

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::session::{Session, SessionError, SessionStore, SessionToken};
use chrono::{DateTime, Utc};
use domain::UserId;
use redis::aio::MultiplexedConnection;
use tokio::sync::Mutex;

use super::session::PgSessionStore;

const SESSION_TTL_SECONDS: u64 = 900; // 15 minutes

pub struct CachedSessionStore {
    postgres: PgSessionStore,
    redis: Arc<Mutex<MultiplexedConnection>>,
}

impl CachedSessionStore {
    pub fn new(postgres: PgSessionStore, redis: MultiplexedConnection) -> Self {
        Self {
            postgres,
            redis: Arc::new(Mutex::new(redis)),
        }
    }

    fn cache_key(token: &SessionToken) -> String {
        format!("session:{}", token.0)
    }

    async fn read_cache(&self, token: &SessionToken) -> Result<Option<Session>, SessionError> {
        let mut conn = self.redis.lock().await;
        let key = Self::cache_key(token);
        let value: Option<String> = redis::cmd("GET")
            .arg(&key)
            .query_async(&mut *conn)
            .await
            .map_err(|e| SessionError::Internal(format!("redis get: {e}")))?;

        match value {
            Some(json) => {
                let cached: CachedSession = serde_json::from_str(&json)
                    .map_err(|e| SessionError::Internal(format!("deserialize: {e}")))?;
                if cached.expires_at <= Utc::now() {
                    return Ok(None);
                }
                Ok(Some(Session {
                    user_id: cached.user_id,
                    expires_at: cached.expires_at,
                }))
            }
            None => Ok(None),
        }
    }

    async fn write_cache(&self, token: &SessionToken, session: &Session) -> Result<(), SessionError> {
        let mut conn = self.redis.lock().await;
        let key = Self::cache_key(token);
        let ttl = SESSION_TTL_SECONDS as usize;
        let cached = CachedSession {
            user_id: session.user_id,
            expires_at: session.expires_at,
        };
        let json = serde_json::to_string(&cached)
            .map_err(|e| SessionError::Internal(format!("serialize: {e}")))?;

        redis::cmd("SETEX")
            .arg(&key)
            .arg(ttl)
            .arg(json)
            .query_async(&mut *conn)
            .await
            .map_err(|e| SessionError::Internal(format!("redis setex: {e}")))?;
        Ok(())
    }

    async fn invalidate_cache(&self, token: &SessionToken) -> Result<(), SessionError> {
        let mut conn = self.redis.lock().await;
        let key = Self::cache_key(token);
        redis::cmd("DEL")
            .arg(&key)
            .query_async(&mut *conn)
            .await
            .map_err(|e| SessionError::Internal(format!("redis del: {e}")))?;
        Ok(())
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
struct CachedSession {
    user_id: UserId,
    expires_at: DateTime<Utc>,
}

#[async_trait]
impl SessionStore for CachedSessionStore {
    async fn create(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        expires_at: DateTime<Utc>,
    ) -> Result<SessionToken, SessionError> {
        let token = self.postgres.create(ctx, user_id, expires_at).await?;
        let session = Session { user_id, expires_at };
        // Best-effort cache write; don't fail the request if Redis is down.
        if let Err(e) = self.write_cache(&token, &session).await {
            tracing::warn!(error = %e, "failed to write session to cache");
        }
        Ok(token)
    }

    async fn find_valid(
        &self,
        ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<Option<Session>, SessionError> {
        match self.read_cache(token).await {
            Ok(Some(session)) => return Ok(Some(session)),
            Ok(None) => {}
            Err(e) => {
                tracing::warn!(error = %e, "session cache read failed, falling back to postgres");
            }
        }

        let session = self.postgres.find_valid(ctx, token).await?;
        if let Some(ref s) = session {
            if let Err(e) = self.write_cache(token, s).await {
                tracing::warn!(error = %e, "failed to write session back to cache");
            }
        }
        Ok(session)
    }

    async fn revoke(
        &self,
        ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<(), SessionError> {
        self.postgres.revoke(ctx, token).await?;
        if let Err(e) = self.invalidate_cache(token).await {
            tracing::warn!(error = %e, "failed to invalidate session cache");
        }
        Ok(())
    }
}
```

### Step 3.2: Export the new store

**Modify: `backend/crates/infra/persistence/src/repositories/mod.rs`**

```rust
pub mod session;
pub mod cached_session_store;
// ... existing exports
```

### Step 3.3: Wire Redis connection in composition root

**Modify: `backend/crates/gateways/src/state/services.rs`**

Add a helper to build the Redis connection and wrap the session store:

```rust
async fn create_session_service(
    config: &Config,
    pool: sqlx::PgPool,
) -> Result<SessionService, crate::GatewayError> {
    let postgres = PgSessionStore::new(pool);

    let store: Arc<dyn SessionStore> = if let Some(redis_url) = &config.redis_url {
        let client = redis::Client::open(redis_url.as_str())
            .map_err(|e| crate::GatewayError::configuration(format!("Redis client: {e}")))?;
        let conn = client
            .get_multiplexed_async_connection()
            .await
            .map_err(|e| crate::GatewayError::configuration(format!("Redis connection: {e}")))?;
        Arc::new(CachedSessionStore::new(postgres, conn))
    } else {
        Arc::new(postgres)
    };

    Ok(SessionService::new(
        SessionConfig {
            session_duration_secs: 86400,
            long_session_duration_secs: 30 * 86400,
        },
        store,
    ))
}
```

### Step 3.4: Add integration test

**Create: `backend/crates/infra/persistence/tests/cached_session_store_test.rs`**

```rust
use std::sync::Arc;

use base::ctx::ExecutionContext;
use base::ports::session::{SessionStore, SessionToken};
use domain::UserId;
use persistence::repositories::cached_session_store::CachedSessionStore;
use persistence::repositories::session::PgSessionStore;

// Requires DATABASE_URL and REDIS_URL environment variables.
#[tokio::test]
async fn cached_store_falls_back_to_postgres_and_rehydrates_cache() {
    let pool = sqlx::PgPool::connect(&std::env::var("DATABASE_URL").unwrap())
        .await
        .unwrap();
    let redis_url = std::env::var("REDIS_URL").unwrap();
    let client = redis::Client::open(redis_url.as_str()).unwrap();
    let conn = client.get_multiplexed_async_connection().await.unwrap();

    let postgres = PgSessionStore::new(pool);
    let store = CachedSessionStore::new(postgres, conn);
    let ctx = ExecutionContext::default();
    let user_id = UserId::new();
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(1);

    let token = store.create(&ctx, user_id, expires_at).await.unwrap();

    // First read may hit Postgres and populate cache.
    let session = store.find_valid(&ctx, &token).await.unwrap().unwrap();
    assert_eq!(session.user_id, user_id);

    // Second read should hit cache (verified by Redis MONITOR in CI).
    let session2 = store.find_valid(&ctx, &token).await.unwrap().unwrap();
    assert_eq!(session2.user_id, user_id);

    store.revoke(&ctx, &token).await.unwrap();
    assert!(store.find_valid(&ctx, &token).await.unwrap().is_none());
}
```

### Step 3.5: Run persistence tests

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo nextest run -p persistence
```

**Expected:** Existing tests pass; new cached session test passes when Redis is available.

### Step 3.6: Commit

```bash
git add crates/infra/persistence/src/repositories/cached_session_store.rs crates/infra/persistence/src/repositories/mod.rs crates/gateways/src/state/services.rs crates/infra/persistence/tests/cached_session_store_test.rs
git commit -m "feat: add Redis read-through session cache"
```

---

## Task 4: Wire Rate Limiter into Gateway

**Files:**
- Modify: `backend/crates/base/src/ports/rate_limiter.rs`
- Modify: `backend/crates/infra/persistence/src/rate_limiter.rs`
- Create: `backend/crates/gateways/src/middleware/rate_limit.rs`
- Modify: `backend/crates/gateways/src/middleware/mod.rs`
- Modify: `backend/crates/gateways/src/routes/mod.rs`
- Modify: `backend/crates/gateways/src/state/services.rs`
- Modify: `backend/crates/gateways/src/error.rs`
- Test: `backend/crates/gateways/tests/integration.rs`

### Step 4.1: Add per-action rate limit key

**Modify: `backend/crates/base/src/ports/rate_limiter.rs`**

Change the `RateLimiter` trait signature:

```rust
#[async_trait]
pub trait RateLimiter: Send + Sync {
    async fn check(&self, scope: RateLimitScope) -> RateLimitDecision;
}

#[derive(Debug, Clone)]
pub struct RateLimitScope {
    pub ip: std::net::IpAddr,
    pub action: RateLimitAction,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum RateLimitAction {
    Login,
    Register,
    PasswordReset,
    EmailVerification,
}
```

Keep `RateLimitDecision` as-is.

### Step 4.2: Update Redis rate limiter to use action scope

**Modify: `backend/crates/infra/persistence/src/rate_limiter.rs`**

Update the key and check implementation:

```rust
use base::ports::rate_limiter::{RateLimitAction, RateLimitDecision, RateLimitScope, RateLimiter};

fn key(&self, scope: &RateLimitScope) -> String {
    format!("rate_limit:{}:{:?}", scope.ip, scope.action)
}

async fn check(&self, scope: RateLimitScope) -> RateLimitDecision {
    // ... existing logic, but use self.key(&scope)
}
```

### Step 4.3: Create rate-limit middleware

**Create: `backend/crates/gateways/src/middleware/rate_limit.rs`**

```rust
use axum::{
    extract::{ConnectInfo, Request},
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};
use std::net::SocketAddr;

use base::ports::rate_limiter::{RateLimitAction, RateLimitDecision, RateLimitScope, RateLimiter};

use crate::state::Services;

pub async fn rate_limit_login(
    State(services): State<Services>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request,
    next: Next,
) -> Result<Response, crate::GatewayError> {
    check(services, addr.ip(), RateLimitAction::Login).await?;
    Ok(next.run(request).await)
}

pub async fn rate_limit_register(
    State(services): State<Services>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request,
    next: Next,
) -> Result<Response, crate::GatewayError> {
    check(services, addr.ip(), RateLimitAction::Register).await?;
    Ok(next.run(request).await)
}

fn check(
    services: Services,
    ip: std::net::IpAddr,
    action: RateLimitAction,
) -> impl std::future::Future<Output = Result<(), crate::GatewayError>> {
    async move {
        let decision = services
            .rate_limiter
            .check(RateLimitScope { ip, action })
            .await;

        match decision {
            RateLimitDecision::Allowed => Ok(()),
            RateLimitDecision::Denied { retry_after } => {
                Err(crate::GatewayError::RateLimited(retry_after))
            }
        }
    }
}
```

### Step 4.4: Add GatewayError::RateLimited

**Modify: `backend/crates/gateways/src/error.rs`**

Add:

```rust
#[derive(Debug, thiserror::Error)]
pub enum GatewayError {
    // ... existing variants ...
    #[error("Rate limit exceeded")]
    RateLimited(u32),
}
```

Update the `IntoResponse` impl to return `429` with `Retry-After`:

```rust
impl IntoResponse for GatewayError {
    fn into_response(self) -> axum::response::Response {
        match self {
            GatewayError::RateLimited(retry_after) => {
                return (
                    StatusCode::TOO_MANY_REQUESTS,
                    [(axum::http::header::RETRY_AFTER, retry_after.to_string())],
                    Json(json!({ "error": "Rate limit exceeded", "retry_after": retry_after })),
                )
                    .into_response();
            }
            // ... rest
        }
    }
}
```

### Step 4.5: Mount middleware on auth routes

**Modify: `backend/crates/gateways/src/routes/mod.rs`**

```rust
fn api_v1_routes(services: Services) -> Router<Services> {
    let auth_routes = auth::routes()
        .layer(axum::middleware::from_fn_with_state(
            services.clone(),
            crate::middleware::rate_limit::rate_limit_register,
        ))
        .route_layer(axum::middleware::from_fn_with_state(
            services.clone(),
            crate::middleware::rate_limit::rate_limit_login,
        ));

    Router::new()
        .nest("/auth", auth_routes)
        .nest("/users", users::routes().layer(middleware::from_fn_with_state(
            services,
            crate::middleware::auth::require_auth,
        )))
}
```

*Note:* Use path-specific layers for login/register rather than applying one middleware to all auth routes. The above is illustrative; adjust to Axum 0.8's layer ordering.

### Step 4.6: Add rate limiter to Services

**Modify: `backend/crates/gateways/src/state/services.rs`**

```rust
pub struct Services {
    pub auth: Arc<AuthService>,
    pub user: Arc<UserService>,
    pub session: Arc<SessionService>,
    pub rate_limiter: Arc<dyn RateLimiter>, // NEW
}
```

Create it in `from_config` when `redis_url` is present; otherwise install a no-op limiter that always allows.

### Step 4.7: Add regression test

**Modify: `backend/crates/gateways/tests/integration.rs`**

Add a test that sends N+1 login/register requests from the same IP and asserts `429` with `Retry-After`.

### Step 4.8: Run gateway tests

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo nextest run -p gateways
```

**Expected:** Existing tests pass; new rate-limit test passes.

### Step 4.9: Commit

```bash
git add crates/base/src/ports/rate_limiter.rs crates/infra/persistence/src/rate_limiter.rs crates/gateways/src/middleware/rate_limit.rs crates/gateways/src/middleware/mod.rs crates/gateways/src/routes/mod.rs crates/gateways/src/state/services.rs crates/gateways/src/error.rs crates/gateways/tests/integration.rs
git commit -m "feat: wire Redis rate limiter into gateway"
```

---

## Task 5: Add Health/Readiness + Metrics Endpoints

**Files:**
- Create: `backend/crates/infra/observability/src/health.rs`
- Create: `backend/crates/infra/observability/src/metrics.rs`
- Modify: `backend/crates/infra/observability/src/lib.rs`
- Modify: `backend/crates/gateways/src/routes/health.rs`
- Create: `backend/crates/gateways/src/routes/metrics.rs`
- Modify: `backend/crates/gateways/src/routes/mod.rs`
- Modify: `backend/crates/gateways/src/state/services.rs`
- Test: `backend/crates/gateways/tests/integration.rs`

### Step 5.1: Implement health checks

**Create: `backend/crates/infra/observability/src/health.rs`**

```rust
use std::sync::Arc;

use async_trait::async_trait;
use base::ports::health::HealthCheck; // or create if missing
use chrono::{DateTime, Utc};
use sqlx::PgPool;

#[derive(Debug, Clone)]
pub struct ComponentHealth {
    pub name: &'static str,
    pub healthy: bool,
    pub latency_ms: u64,
    pub message: Option<String>,
}

#[derive(Debug, Clone)]
pub struct HealthReport {
    pub healthy: bool,
    pub checked_at: DateTime<Utc>,
    pub components: Vec<ComponentHealth>,
}

#[async_trait]
pub trait HealthReporter: Send + Sync {
    async fn ready(&self) -> HealthReport;
}

pub struct PostgresHealthCheck {
    pool: PgPool,
}

impl PostgresHealthCheck {
    pub fn new(pool: PgPool) -> Self { Self { pool } }
}

#[async_trait]
impl HealthCheck for PostgresHealthCheck {
    async fn check(&self) -> ComponentHealth {
        let start = std::time::Instant::now();
        match sqlx::query("SELECT 1").fetch_one(&self.pool).await {
            Ok(_) => ComponentHealth {
                name: "postgres",
                healthy: true,
                latency_ms: start.elapsed().as_millis() as u64,
                message: None,
            },
            Err(e) => ComponentHealth {
                name: "postgres",
                healthy: false,
                latency_ms: start.elapsed().as_millis() as u64,
                message: Some(e.to_string()),
            },
        }
    }
}
```

### Step 5.2: Implement Prometheus metrics

**Create: `backend/crates/infra/observability/src/metrics.rs`**

```rust
use metrics_exporter_prometheus::{Matcher, PrometheusBuilder, PrometheusHandle};

pub fn install_recorder() -> PrometheusHandle {
    PrometheusBuilder::new()
        .set_buckets_for_metric(
            Matcher::Full("http_request_duration_seconds"),
            metrics::histogram!
            &[
                0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0,
            ],
        )
        .unwrap()
        .install_recorder()
        .unwrap()
}
```

### Step 5.3: Add HTTP routes

**Modify: `backend/crates/gateways/src/routes/health.rs`**

```rust
pub async fn ready_check(State(services): State<Services>) -> impl IntoResponse {
    let report = services.health_reporter.ready().await;
    let status = if report.healthy {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };
    (status, Json(report))
}
```

**Create: `backend/crates/gateways/src/routes/metrics.rs`**

```rust
use axum::{extract::State, response::Response};
use crate::state::Services;

pub async fn metrics(State(services): State<Services>) -> Response<String> {
    Response::builder()
        .header("Content-Type", "text/plain; version=0.0.4")
        .body(services.metrics_handle.render())
        .unwrap()
}
```

### Step 5.4: Mount routes and wire services

**Modify: `backend/crates/gateways/src/routes/mod.rs`**

```rust
Router::new()
    .route("/health", get(health::health_check))
    .route("/health/ready", get(health::ready_check))
    .route("/metrics", get(metrics::metrics))
    // ... rest
```

**Modify: `backend/crates/gateways/src/state/services.rs`**

Add `health_reporter: Arc<dyn HealthReporter>` and `metrics_handle: PrometheusHandle` to `Services` and create them in `from_config`.

### Step 5.5: Add HTTP request duration metric middleware

**Create: `backend/crates/gateways/src/middleware/metrics.rs`**

```rust
use axum::{extract::Request, middleware::Next, response::Response};
use std::time::Instant;

pub async fn track(req: Request, next: Next) -> Response {
    let start = Instant::now();
    let path = req.uri().path().to_owned();
    let method = req.method().to_string();
    let response = next.run(req).await;
    let duration = start.elapsed().as_secs_f64();
    let status = response.status().as_u16().to_string();

    metrics::counter!("http_requests_total", "method" => method.clone(), "path" => path.clone(), "status" => status.clone()).increment(1);
    metrics::histogram!("http_request_duration_seconds", "method" => method, "path" => path, "status" => status).record(duration);

    response
}
```

Mount it in `routes/mod.rs` before the router is finalized.

### Step 5.6: Run tests

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo nextest run -p gateways
```

### Step 5.7: Commit

```bash
git add crates/infra/observability/src/health.rs crates/infra/observability/src/metrics.rs crates/infra/observability/src/lib.rs crates/gateways/src/routes/health.rs crates/gateways/src/routes/metrics.rs crates/gateways/src/routes/mod.rs crates/gateways/src/middleware/metrics.rs crates/gateways/src/state/services.rs
git commit -m "feat: add health/ready and Prometheus metrics endpoints"
```

---

## Task 6: Implement Cookie-Based SSO Session

**Files:**
- Modify: `backend/crates/gateways/src/routes/auth.rs`
- Modify: `backend/crates/services/auth_service/src/contracts/auth.rs`
- Modify: `backend/crates/services/auth_service/src/config.rs`
- Modify: `backend/crates/gateways/src/state/mod.rs`
- Test: `backend/crates/gateways/tests/integration.rs`

### Step 6.1: Add cookie settings to gateway config

**Modify: `backend/crates/gateways/src/state/mod.rs`**

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    // ... existing fields ...
    #[serde(default = "default_cookie_domain")]
    pub cookie_domain: String,
    #[serde(default)]
    pub cookie_secure: bool,
}

fn default_cookie_domain() -> String {
    ".klynt.edu".to_string()
}
```

Populate from `config::AppConfig` if available, otherwise use defaults.

### Step 6.2: Update login response handler

**Modify: `backend/crates/gateways/src/routes/auth.rs`**

```rust
use axum::response::{AppendHeaders, IntoResponse};
use tower_cookies::{Cookie, Cookies};

async fn login(
    State(services): State<Services>,
    cookies: Cookies,
    Json(request): Json<LoginRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let response = services
        .auth
        .login(&execution_context(), request)
        .await
        .map_err(crate::GatewayError::from)?;

    let mut cookie = Cookie::new("session_token", response.access_token.clone());
    cookie.set_domain(services.config.cookie_domain.clone());
    cookie.set_path("/");
    cookie.set_http_only(true);
    cookie.set_secure(services.config.cookie_secure);
    cookie.set_same_site(tower_cookies::cookie::SameSite::Lax);
    cookies.add(cookie);

    Ok((StatusCode::OK, Json(SuccessResponse::ok(response))))
}
```

### Step 6.3: Update auth middleware to read cookie fallback

**Modify: `backend/crates/gateways/src/middleware/auth.rs`**

```rust
fn extract_session_token(headers: &HeaderMap, cookies: &Cookies) -> Option<SessionToken> {
    if let Some(token) = extract_bearer_token(headers) {
        return Some(token);
    }
    cookies
        .get("session_token")
        .and_then(|c| Uuid::parse_str(c.value()).ok())
        .map(SessionToken)
}
```

Update `require_auth` to accept `cookies: Cookies` and use this function.

### Step 6.4: Add cross-subdomain SSO regression test

Add a test that sets `Host: tenant.klynt.edu`, logs in, asserts `Set-Cookie` with `Domain=.klynt.edu`, then makes a request to `other.klynt.edu` with the cookie and is authenticated.

### Step 6.5: Run tests

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo nextest run -p gateways
```

### Step 6.6: Commit

```bash
git add crates/gateways/src/routes/auth.rs crates/gateways/src/middleware/auth.rs crates/gateways/src/state/mod.rs crates/gateways/tests/integration.rs
git commit -m "feat: cookie-based SSO session with cross-subdomain support"
```

---

## Task 7: Honour `remember_me` and Add Distinct Refresh Tokens

**Files:**
- Modify: `backend/crates/services/session_service/src/config.rs`
- Modify: `backend/crates/services/session_service/src/lib.rs`
- Modify: `backend/crates/services/auth_service/src/application/use_cases/login.rs`
- Modify: `backend/crates/services/auth_service/src/contracts/auth.rs`
- Modify: `backend/crates/base/src/ports/session.rs`
- Test: `backend/crates/services/auth_service/tests/integration.rs`

### Step 7.1: Extend session config

**Modify: `backend/crates/services/session_service/src/config.rs`**

```rust
pub struct SessionConfig {
    pub session_duration_secs: u64,
    pub long_session_duration_secs: u64,
}

impl Default for SessionConfig {
    fn default() -> Self {
        Self {
            session_duration_secs: 24 * 3600,
            long_session_duration_secs: 30 * 24 * 3600,
        }
    }
}
```

### Step 7.2: Update session create signature

**Modify: `backend/crates/base/src/ports/session.rs`**

```rust
async fn create(
    &self,
    ctx: &ExecutionContext,
    user_id: UserId,
    expires_at: DateTime<Utc>,
) -> Result<SessionToken, SessionError>;
```

Keep as-is; duration is computed by the service. Add a `SessionKind` enum if the store needs to distinguish access vs refresh sessions:

```rust
pub enum SessionKind {
    Access,
    Refresh,
}
```

### Step 7.3: Update login use case

**Modify: `backend/crates/services/auth_service/src/application/use_cases/login.rs`**

```rust
let duration = if request.remember_me {
    service.config().long_session_duration()
} else {
    service.config().session_duration()
};
let expires_at = service.internal().clock.now() + duration;

let access_token = service
    .internal()
    .session_store
    .create(ctx, user.id, expires_at)
    .await?;

let refresh_expires_at = service.internal().clock.now() + service.config().refresh_duration();
let refresh_token = service
    .internal()
    .session_store
    .create(ctx, user.id, refresh_expires_at)
    .await?;

Ok(LoginResponse {
    access_token: access_token.to_string(),
    refresh_token: refresh_token.to_string(),
    expires_at,
    user: user.into(),
})
```

### Step 7.4: Update response DTO

**Modify: `backend/crates/services/auth_service/src/contracts/auth.rs`**

Ensure `LoginResponse` already has `access_token`, `refresh_token`, `expires_at`, `user`.

### Step 7.5: Run auth service tests

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo nextest run -p auth_service
```

### Step 6: Commit

```bash
git add crates/services/session_service/src/config.rs crates/services/session_service/src/lib.rs crates/services/auth_service/src/application/use_cases/login.rs crates/services/auth_service/src/contracts/auth.rs crates/base/src/ports/session.rs
git commit -m "feat: honour remember_me and return distinct refresh token"
```

---

## Task 8: Add CSP Header and Audit Snapshots

**Files:**
- Modify: `backend/crates/gateways/src/middleware/security_headers.rs`
- Modify: `backend/crates/infra/observability/src/audit.rs`
- Modify: `backend/crates/services/user_service/src/application/use_cases/change_password.rs`
- Modify: `backend/crates/services/user_service/src/application/use_cases/update_profile.rs`
- Test: existing middleware and audit tests

### Step 8.1: Add CSP header

**Modify: `backend/crates/gateways/src/middleware/security_headers.rs`**

Add inside `security_headers`:

```rust
headers.insert(
    "Content-Security-Policy",
    HeaderValue::from_static("default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"),
);
```

Update tests to assert CSP presence.

### Step 8.2: Add before/after snapshots to audit logger

**Modify: `backend/crates/infra/observability/src/audit.rs`**

Update `log_password_changed` and `log_profile_updated` to accept `before` and `after` JSON values and store them in `AuditEvent`.

### Step 8.3: Call audit logger with snapshots

**Modify: `backend/crates/services/user_service/src/application/use_cases/change_password.rs`**

```rust
service
    .audit_logger
    .log_password_changed(ctx, user.id, before_json, after_json)
    .await;
```

Do the same in `update_profile.rs`.

### Step 8.4: Run tests

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo nextest run -p gateways -p observability -p user_service
```

### Step 8.5: Commit

```bash
git add crates/gateways/src/middleware/security_headers.rs crates/infra/observability/src/audit.rs crates/services/user_service/src/application/use_cases/change_password.rs crates/services/user_service/src/application/use_cases/update_profile.rs
git commit -m "feat: add CSP header and audit before/after snapshots"
```

---

## Self-Review Checklist

- [ ] Spec coverage: every Phase 1 gap listed in `2026-06-22-auth-phase1-gap-analysis.md` has at least one task above.
- [ ] Placeholder scan: no `TBD`, `TODO`, or vague steps remain.
- [ ] Type consistency: `LoginRequest`, `LoginResponse`, `SessionConfig`, `Services`, and `RateLimiter` signatures match across tasks.
- [ ] Path consistency: all file paths use the refactored crate names (`base`, `domain`, `persistence`, `gateways`, `services/*`).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-22-auth-phase1-completion-plan.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`.
2. **Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-22
