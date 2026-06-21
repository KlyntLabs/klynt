# Middleware Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate four middleware capabilities (unified response envelope, structured request logging, request timing, error severity classification) from nexra-core patterns into the klynt-edu backend.

**Architecture:** Capability-driven adaptation — new modules in `klynt-api` (`response.rs`, `request_context.rs`, `logging.rs`) wrapping nexra's patterns around klynt's existing `uuid`/`chrono`/`AppError` primitives. Handlers stay unchanged; the response middleware wraps their output into the `{id, status, type, data, error, meta}` envelope. Health routes are exempt.

**Tech Stack:** Rust, Axum 0.8, tower-http 0.6, tokio (task_local), tracing, serde_json, chrono, uuid. No new dependencies.

---

## File Structure

### Files created

| File | Responsibility |
|---|---|
| `backend/crates/klynt-api/src/response.rs` | `ApiResponse` envelope types + `mw_map_response` middleware |
| `backend/crates/klynt-api/src/request_context.rs` | `RequestContext`, trusted-proxy client-IP extraction, `request_context` middleware, `task_local!` |
| `backend/crates/klynt-api/src/logging.rs` | `LogEntry`, body sanitization, `log_request` (best-effort) |

### Files modified

| File | Change |
|---|---|
| `backend/crates/klynt-api/src/error.rs` | Add `ErrorSeverity`, `ErrorCategory`, `severity()`/`category()`/`error_code()`/`retry_after_seconds()` on `AppErrorKind`; make `kind` public; `IntoResponse` inserts `AppError` into extensions (no logging); remove `ApiErrorBody` |
| `backend/crates/klynt-api/src/middleware.rs` | Add `FromRequestParts` impl for `RequestId` (reads from extensions) |
| `backend/crates/klynt-api/src/lib.rs` | Register 3 new modules |
| `backend/crates/klynt-api/src/startup.rs` | Split health vs API routers; new layer chain |
| `backend/crates/klynt-api/src/v1/mod.rs` | Split health routes out of the v1 router into a `health_router()` function |
| `backend/crates/klynt-domain/src/config.rs` | Add `trusted_proxies: Vec<String>` to `ApiConfig` |
| `backend/crates/klynt-infrastructure/src/config.rs` | Add set_default for `api.trusted_proxies` |
| `backend/crates/klynt-server/tests/helpers.rs` | Add `trusted_proxies` to `test_config()` |
| `backend/crates/klynt-server/tests/users.rs` | Update JSON assertions to read under `data`/`error` |
| `backend/crates/klynt-server/tests/auth.rs` | Update JSON assertions to read under `data`/`error` |
| `backend/Cargo.toml` | Add `serde_json`, `chrono` to `klynt-api` workspace deps |
| `backend/crates/klynt-api/Cargo.toml` | Add `serde_json`, `chrono` deps |

### Docs

| File | Change |
|---|---|
| `.env.example` | Add `LOG_BODIES`, `LOG_SUCCESS`, `MAX_BODY_SIZE`, `MAX_ENVELOPE_BODY_SIZE`, `KLYNT_API__TRUSTED_PROXIES` |
| `docs/adr/0002-response-envelope.md` | New ADR |

---

## Task 1: Add `serde_json` and `chrono` to `klynt-api` dependencies

The new modules need `serde_json` (for `Value` body parsing) and `chrono` (for timestamps). These are already workspace deps.

**Files:**
- Modify: `backend/Cargo.toml` (no change needed — already in `[workspace.dependencies]`)
- Modify: `backend/crates/klynt-api/Cargo.toml:9-18`

- [ ] **Step 1: Add deps to klynt-api Cargo.toml**

Edit `backend/crates/klynt-api/Cargo.toml`. Add `serde_json` and `chrono` to the `[dependencies]` section after `serde`:

```toml
[dependencies]
klynt-domain = { workspace = true }
klynt-application = { workspace = true }

axum = { workspace = true }
tower-http = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
chrono = { workspace = true }
uuid = { workspace = true }
thiserror = { workspace = true }
tracing = { workspace = true }
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && cargo check -p klynt-api`
Expected: compiles with no errors

- [ ] **Step 3: Commit**

```bash
git add backend/crates/klynt-api/Cargo.toml
git commit -m "chore(api): add serde_json and chrono to klynt-api deps"
```

---

## Task 2: Add `trusted_proxies` config field

**Files:**
- Modify: `backend/crates/klynt-domain/src/config.rs:4-18`
- Modify: `backend/crates/klynt-infrastructure/src/config.rs:20-29`
- Modify: `backend/crates/klynt-server/tests/helpers.rs:18-38`

- [ ] **Step 1: Add field to `ApiConfig` in domain**

Edit `backend/crates/klynt-domain/src/config.rs`. Add `trusted_proxies` to the struct and default:

```rust
#[derive(Debug, Clone, Deserialize)]
pub struct ApiConfig {
    pub host: String,
    pub port: u16,
    pub allowed_origins: Vec<String>,
    #[serde(default)]
    pub trusted_proxies: Vec<String>,
}

impl Default for ApiConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 3001,
            allowed_origins: vec!["http://localhost:5174".to_string()],
            trusted_proxies: vec![],
        }
    }
}
```

- [ ] **Step 2: Add set_default in infrastructure config loader**

Edit `backend/crates/klynt-infrastructure/src/config.rs`. Add after line 22 (the `api.allowed_origins` set_default):

```rust
        .set_default("api.trusted_proxies", Vec::<String>::new())?
```

- [ ] **Step 3: Add `trusted_proxies` to test_config helper**

Edit `backend/crates/klynt-server/tests/helpers.rs`. In `test_config()` (lines 18-38), add the field to the `ApiConfig` literal:

```rust
        api: ApiConfig {
            host: "127.0.0.1".to_string(),
            port: 0,
            allowed_origins: vec!["http://localhost:5173".to_string()],
            trusted_proxies: vec![],
        },
```

- [ ] **Step 4: Verify it compiles**

Run: `cd backend && cargo check --workspace`
Expected: compiles with no errors

- [ ] **Step 5: Commit**

```bash
git add backend/crates/klynt-domain/src/config.rs backend/crates/klynt-infrastructure/src/config.rs backend/crates/klynt-server/tests/helpers.rs
git commit -m "feat(config): add trusted_proxies field to ApiConfig"
```

---

## Task 3: Add error severity/category/error_code to `AppErrorKind`

This is the foundation for severity-driven logging and the envelope's error `type` field.

**Files:**
- Modify: `backend/crates/klynt-api/src/error.rs`

- [ ] **Step 1: Write the failing tests**

Add a new test module at the end of `backend/crates/klynt-api/src/error.rs` (after the existing `conversion_tests` module, before EOF). This tests the new classification methods:

```rust
#[cfg(test)]
mod classification_tests {
    use super::*;

    #[test]
    fn not_found_classification() {
        assert_eq!(AppErrorKind::NotFound.severity(), ErrorSeverity::Low);
        assert_eq!(AppErrorKind::NotFound.category(), ErrorCategory::Validation);
        assert_eq!(AppErrorKind::NotFound.error_code(), "NOT_FOUND");
        assert_eq!(AppErrorKind::NotFound.retry_after_seconds(), None);
    }

    #[test]
    fn bad_request_classification() {
        let kind = AppErrorKind::BadRequest("msg".to_string());
        assert_eq!(kind.severity(), ErrorSeverity::Low);
        assert_eq!(kind.category(), ErrorCategory::Validation);
        assert_eq!(kind.error_code(), "BAD_REQUEST");
    }

    #[test]
    fn conflict_classification() {
        let kind = AppErrorKind::Conflict("msg".to_string());
        assert_eq!(kind.severity(), ErrorSeverity::Low);
        assert_eq!(kind.category(), ErrorCategory::Validation);
        assert_eq!(kind.error_code(), "CONFLICT");
    }

    #[test]
    fn unauthorized_classification() {
        assert_eq!(AppErrorKind::Unauthorized.severity(), ErrorSeverity::Low);
        assert_eq!(
            AppErrorKind::Unauthorized.category(),
            ErrorCategory::Authentication
        );
        assert_eq!(AppErrorKind::Unauthorized.error_code(), "AUTHENTICATION_REQUIRED");
    }

    #[test]
    fn rate_limited_classification() {
        assert_eq!(AppErrorKind::RateLimited.severity(), ErrorSeverity::Medium);
        assert_eq!(
            AppErrorKind::RateLimited.category(),
            ErrorCategory::Authorization
        );
        assert_eq!(AppErrorKind::RateLimited.error_code(), "RATE_LIMITED");
    }

    #[test]
    fn internal_classification() {
        let kind = AppErrorKind::Internal(Box::new(std::io::Error::other("boom")));
        assert_eq!(kind.severity(), ErrorSeverity::High);
        assert_eq!(kind.category(), ErrorCategory::Infrastructure);
        assert_eq!(kind.error_code(), "INTERNAL_ERROR");
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && cargo test -p klynt-api classification_tests`
Expected: FAIL — `ErrorSeverity`, `ErrorCategory`, `.severity()`, `.category()`, `.error_code()` not found

- [ ] **Step 3: Add the enums and impl methods**

Edit `backend/crates/klynt-api/src/error.rs`. Add these after the `AppErrorKind` enum definition (after line 48, before `impl From<DomainError> for AppErrorKind`):

```rust
/// Severity used to drive log levels for errors.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorSeverity {
    /// Expected errors — auth failures, validation, not-found.
    Low,
    /// Business logic errors — rate limiting.
    Medium,
    /// Infrastructure problems — internal server errors.
    High,
    /// Gateway/data-corruption failures (reserved for future use).
    Critical,
}

/// Category used to classify errors for observability.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorCategory {
    Authentication,
    Authorization,
    Validation,
    Infrastructure,
}

impl AppErrorKind {
    /// HTTP-facing uppercase error code string (e.g. `"NOT_FOUND"`).
    pub fn error_code(&self) -> &'static str {
        match self {
            AppErrorKind::NotFound => "NOT_FOUND",
            AppErrorKind::BadRequest(_) => "BAD_REQUEST",
            AppErrorKind::Conflict(_) => "CONFLICT",
            AppErrorKind::Unauthorized => "AUTHENTICATION_REQUIRED",
            AppErrorKind::RateLimited => "RATE_LIMITED",
            AppErrorKind::Internal(_) => "INTERNAL_ERROR",
        }
    }

    pub fn severity(&self) -> ErrorSeverity {
        match self {
            AppErrorKind::NotFound
            | AppErrorKind::BadRequest(_)
            | AppErrorKind::Conflict(_)
            | AppErrorKind::Unauthorized => ErrorSeverity::Low,
            AppErrorKind::RateLimited => ErrorSeverity::Medium,
            AppErrorKind::Internal(_) => ErrorSeverity::High,
        }
    }

    pub fn category(&self) -> ErrorCategory {
        match self {
            AppErrorKind::Unauthorized => ErrorCategory::Authentication,
            AppErrorKind::RateLimited => ErrorCategory::Authorization,
            AppErrorKind::NotFound
            | AppErrorKind::BadRequest(_)
            | AppErrorKind::Conflict(_) => ErrorCategory::Validation,
            AppErrorKind::Internal(_) => ErrorCategory::Infrastructure,
        }
    }

    /// Hook for future `Retry-After` header emission. `None` for all current variants.
    pub fn retry_after_seconds(&self) -> Option<u32> {
        let _ = self;
        None
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && cargo test -p klynt-api classification_tests`
Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/crates/klynt-api/src/error.rs
git commit -m "feat(api): add severity/category/error_code to AppErrorKind"
```

---

## Task 4: Update `AppError::IntoResponse` — insert error into extensions, remove `ApiErrorBody`

This makes `AppError` available to `mw_map_response` via response extensions, and removes the now-redundant `ApiErrorBody` struct.

**Files:**
- Modify: `backend/crates/klynt-api/src/error.rs`

- [ ] **Step 1: Make `kind` field public**

Edit `backend/crates/klynt-api/src/error.rs`. In the `AppError` struct (lines 75-79), change `kind` to `pub kind`:

```rust
#[derive(Debug)]
pub struct AppError {
    pub kind: AppErrorKind,
    request_id: Uuid,
}
```

- [ ] **Step 2: Replace `IntoResponse` impl and remove `ApiErrorBody`**

Edit `backend/crates/klynt-api/src/error.rs`. Replace the entire `ApiErrorBody` struct + impl (lines 12-31) and the `IntoResponse for AppError` impl (lines 98-134) with:

```rust
// (Remove ApiErrorBody struct and its impl entirely — lines 12-31)
```

Replace the `IntoResponse` impl with:

```rust
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match &self.kind {
            AppErrorKind::NotFound => StatusCode::NOT_FOUND,
            AppErrorKind::BadRequest(_) => StatusCode::BAD_REQUEST,
            AppErrorKind::Conflict(_) => StatusCode::CONFLICT,
            AppErrorKind::Unauthorized => StatusCode::UNAUTHORIZED,
            AppErrorKind::RateLimited => StatusCode::TOO_MANY_REQUESTS,
            AppErrorKind::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };

        let mut response = status.into_response();
        // Insert the error into extensions so mw_map_response can read it.
        response.extensions_mut().insert(self);
        response
    }
}
```

Also remove the `use tracing::error;` import at the top (line 7) since logging is now centralized in `mw_map_response`. The top imports become:

```rust
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use uuid::Uuid;

use klynt_domain::errors::{DomainError, ErrorKind};
```

(Remove `Json` from the axum import and `use serde::Serialize;` and `use tracing::error;` — they are no longer needed in this file.)

- [ ] **Step 3: Update the existing `conversion_tests` that rely on old behavior**

The test `request_id_appears_in_error_body` (lines 223-229) checked status code only, which still works. But the `internal_error_becomes_500_and_sanitizes_message` test calls `status_of()` which calls `into_response().status()` — this still works. The `bad_request_preserves_inner_message` and `conflict_preserves_inner_message` tests access `app_err.kind` — now that `kind` is `pub`, these work. No test changes needed.

Verify the existing tests still reference `self.kind` correctly. The `bad_request_preserves_inner_message` test at line 192 uses `app_err.kind` — this was previously accessing a private field from within the same module (the test is in a submodule of `error.rs`), so it compiled. Making it `pub` is still fine.

Run: `cd backend && cargo test -p klynt-api`
Expected: all existing tests PASS (conversion_tests + classification_tests)

- [ ] **Step 4: Commit**

```bash
git add backend/crates/klynt-api/src/error.rs
git commit -m "refactor(api): IntoResponse inserts AppError into extensions, remove ApiErrorBody"
```

---

## Task 5: Add `FromRequestParts` for `RequestId`

`mw_map_response` needs to extract `RequestId` as a handler parameter.

**Files:**
- Modify: `backend/crates/klynt-api/src/middleware.rs`

- [ ] **Step 1: Add the extractor impl**

Edit `backend/crates/klynt-api/src/middleware.rs`. Add after the `RequestId` struct definition (after line 25), before `propagate_request_id`:

```rust
impl<S: Send + Sync> axum::extract::FromRequestParts<S> for RequestId {
    type Rejection = axum::http::StatusCode;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<RequestId>()
            .copied()
            .ok_or(axum::http::StatusCode::INTERNAL_SERVER_ERROR)
    }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && cargo check -p klynt-api`
Expected: compiles with no errors

- [ ] **Step 3: Commit**

```bash
git add backend/crates/klynt-api/src/middleware.rs
git commit -m "feat(api): add FromRequestParts extractor for RequestId"
```

---

## Task 6: Create `request_context.rs` — `RequestContext`, client-IP extraction, middleware

This is the biggest new module. It replaces `propagate_request_id` with a richer context-builder.

**Files:**
- Create: `backend/crates/klynt-api/src/request_context.rs`
- Modify: `backend/crates/klynt-api/src/lib.rs`

- [ ] **Step 1: Write the failing tests for client-IP extraction and context building**

Create `backend/crates/klynt-api/src/request_context.rs` with tests first:

```rust
//! Request-scoped context: request_id, trace_id, client IP, user agent, timing.
//!
//! Replaces the simpler `propagate_request_id` middleware with a richer context
//! that drives structured logging and the response envelope.
//!
//! # Spawn constraint
//!
//! `RequestContext` is stored in a `tokio::task_local!`. It does **not**
//! propagate across `tokio::spawn`. Code that spawns detached work must
//! explicitly capture the `RequestContext` value before spawning.

use std::net::{IpAddr, SocketAddr};
use std::time::Instant;

use axum::{
    extract::{ConnectInfo, Request, State},
    http::{HeaderMap, request::Parts},
    middleware::Next,
    response::Response,
};
use std::sync::LazyLock;
use tracing::{info, instrument};
use uuid::Uuid;

use crate::middleware::RequestId;
use crate::state::AppState;

const REQUEST_ID_HEADER: &str = "x-request-id";
const TRACE_ID_HEADER: &str = "x-trace-id";

/// Request-scoped context built from headers and connection info.
#[derive(Debug, Clone)]
pub struct RequestContext {
    pub request_id: Uuid,
    pub trace_id: Uuid,
    pub client_ip: Option<String>,
    pub user_agent: Option<String>,
    pub start_time: Instant,
}

/// Task-local storage so handlers and middleware can read the context
/// without threading it through every function signature.
tokio::task_local! {
    static CURRENT: Option<RequestContext>;
}

impl RequestContext {
    /// Try to read the current context from task-local storage.
    pub fn current() -> Option<Self> {
        CURRENT
            .try_with(|ctx| ctx.clone())
            .ok()
            .flatten()
    }

    /// Scope a future inside task-local storage holding this context.
    pub async fn scope<F, R>(self, future: F) -> R
    where
        F: std::future::Future<Output = R>,
    {
        CURRENT.scope(Some(self), future).await
    }
}

/// Parse a UUID from a header, generating a new v4 if absent or unparseable.
fn parse_or_generate(headers: &HeaderMap, name: &str) -> Uuid {
    headers
        .get(name)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::new_v4)
}

/// Extract the client IP from headers, honoring trusted proxies.
///
/// If `trusted_proxies` is empty, the socket address IP is returned directly
/// (no header trust). If the socket IP is in the trusted set, `X-Forwarded-For`
/// is parsed rightmost-to-leftmost, skipping trusted IPs, taking the first
/// untrusted IP as the client.
pub fn extract_client_ip(
    headers: &HeaderMap,
    socket_addr: SocketAddr,
    trusted_proxies: &[String],
) -> Option<String> {
    let socket_ip = socket_addr.ip();

    // No trusted proxies configured → trust only the direct connection.
    if trusted_proxies.is_empty() {
        return Some(socket_ip.to_string());
    }

    // If the direct connection is not a trusted proxy, use its IP.
    if !is_trusted_proxy(socket_ip, trusted_proxies) {
        return Some(socket_ip.to_string());
    }

    // The direct connection IS a trusted proxy → parse X-Forwarded-For.
    if let Some(xff) = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
    {
        // Parse all IPs in the chain, rightmost to leftmost.
        let ips: Vec<IpAddr> = xff
            .split(',')
            .filter_map(|s| s.trim().parse::<IpAddr>().ok())
            .collect();

        // Walk right-to-left, skip trusted proxies, take first untrusted.
        for ip in ips.iter().rev() {
            if !is_trusted_proxy(*ip, trusted_proxies) {
                return Some(ip.to_string());
            }
        }
    }

    // Fallback: x-real-ip if the socket is a trusted proxy.
    if let Some(real_ip) = headers
        .get("x-real-ip")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse::<IpAddr>().ok())
    {
        return Some(real_ip.to_string());
    }

    Some(socket_ip.to_string())
}

/// Check whether an IP falls within any of the trusted-proxy CIDR ranges.
///
/// Currently supports exact IP matching and `/8`–`/32` IPv4 CIDR.
fn is_trusted_proxy(ip: IpAddr, trusted_proxies: &[String]) -> bool {
    for cidr in trusted_proxies {
        if ip_matches_cidr(ip, cidr) {
            return true;
        }
    }
    false
}

/// Match an IP against a CIDR string (supports IPv4 `/n` notation and exact IPs).
fn ip_matches_cidr(ip: IpAddr, cidr: &str) -> bool {
    if let Some((net_str, prefix_str)) = cidr.split_once('/') {
        if let (IpAddr::V4(addr), Ok(net), Ok(prefix)) =
            (ip, net_str.parse::<std::net::Ipv4Addr>(), prefix_str.parse::<u32>())
        {
            let mask = if prefix == 0 { 0 } else { (!0u32) << (32 - prefix) };
            let addr_bits = u32::from(addr);
            let net_bits = u32::from(net);
            return (addr_bits & mask) == (net_bits & mask);
        }
    }
    // Exact IP match (no prefix).
    cidr.parse::<IpAddr>().map(|c| c == ip).unwrap_or(false)
}

/// Build a `RequestContext` from request headers and connection info.
pub fn build_request_context(
    headers: &HeaderMap,
    socket_addr: SocketAddr,
    trusted_proxies: &[String],
) -> RequestContext {
    RequestContext {
        request_id: parse_or_generate(headers, REQUEST_ID_HEADER),
        trace_id: parse_or_generate(headers, TRACE_ID_HEADER),
        client_ip: extract_client_ip(headers, socket_addr, trusted_proxies),
        user_agent: headers
            .get("user-agent")
            .and_then(|v| v.to_str().ok())
            .map(String::from),
        start_time: Instant::now(),
    }
}

/// Middleware: build `RequestContext`, insert into extensions + task-local,
/// record tracing span fields, echo `x-request-id`.
#[instrument(skip(state, req, next), fields(request_id, trace_id))]
pub async fn request_context(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    mut req: Request,
    next: Next,
) -> Response {
    let ctx = build_request_context(
        req.headers(),
        addr,
        &state.config().api.trusted_proxies,
    );

    // Insert typed extensions for extractors.
    req.extensions_mut().insert(RequestId(ctx.request_id));
    req.extensions_mut().insert(ctx.clone());

    // Record span fields.
    tracing::Span::current()
        .record("request_id", ctx.request_id.to_string())
        .record("trace_id", ctx.trace_id.to_string());

    info!(
        request_id = %ctx.request_id,
        trace_id = %ctx.trace_id,
        client_ip = ctx.client_ip.as_deref().unwrap_or("unknown"),
        method = %req.method(),
        path = %req.uri().path(),
        "Request started"
    );

    let mut response = ctx.clone().scope(next.run(req)).await;

    // Echo request_id on the response.
    if let Ok(value) = ctx.request_id.to_string().parse() {
        response.headers_mut().insert(REQUEST_ID_HEADER, value);
    }

    response
}

impl<S: Send + Sync> axum::extract::FromRequestParts<S> for RequestContext {
    type Rejection = axum::http::StatusCode;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<RequestContext>()
            .cloned()
            .ok_or(axum::http::StatusCode::INTERNAL_SERVER_ERROR)
    }
}

// `use std::sync::Arc` re-imported here to keep the module self-contained.
use std::sync::Arc;

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::{HeaderMap, HeaderValue};
    use std::net::{IpAddr, Ipv4Addr};

    fn socket() -> SocketAddr {
        SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 8080)
    }

    #[test]
    fn no_trusted_proxies_uses_socket_ip() {
        let headers = HeaderMap::new();
        let ip = extract_client_ip(&headers, socket(), &[]).unwrap();
        assert_eq!(ip, "127.0.0.1");
    }

    #[test]
    fn untrusted_socket_ignores_xff() {
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-for", HeaderValue::from_static("203.0.113.5"));
        // Socket is 127.0.0.1, which is NOT in trusted_proxies → use socket.
        let ip = extract_client_ip(&headers, socket(), &["10.0.0.0/8".to_string()]).unwrap();
        assert_eq!(ip, "127.0.0.1");
    }

    #[test]
    fn trusted_socket_parses_xff_right_to_left() {
        let mut headers = HeaderMap::new();
        // Client → proxy1 (trusted) → proxy2 (trusted) → us
        headers.insert(
            "x-forwarded-for",
            HeaderValue::from_static("203.0.113.5, 10.0.0.1, 10.0.0.2"),
        );
        // Our socket is a trusted proxy (10.0.0.2).
        let sock = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(10, 0, 0, 2)), 8080);
        let ip = extract_client_ip(
            &headers,
            sock,
            &["10.0.0.0/8".to_string()],
        )
        .unwrap();
        // Rightmost trusted is 10.0.0.1 (skip), next is 203.0.113.5 (untrusted).
        assert_eq!(ip, "203.0.113.5");
    }

    #[test]
    fn trusted_socket_all_proxies_in_chain_falls_back_to_socket() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-forwarded-for",
            HeaderValue::from_static("10.0.0.1, 10.0.0.2"),
        );
        let sock = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(10, 0, 0, 2)), 8080);
        let ip = extract_client_ip(&headers, sock, &["10.0.0.0/8".to_string()]).unwrap();
        // All XFF IPs are trusted → falls back to socket.
        assert_eq!(ip, "10.0.0.2");
    }

    #[test]
    fn build_context_reads_headers() {
        let mut headers = HeaderMap::new();
        headers.insert("x-request-id", HeaderValue::from_static("550e8400-e29b-41d4-a716-446655440000"));
        headers.insert("x-trace-id", HeaderValue::from_static("660e8400-e29b-41d4-a716-446655440000"));
        headers.insert("user-agent", HeaderValue::from_static("test-agent/1.0"));

        let ctx = build_request_context(&headers, socket(), &[]);
        assert_eq!(ctx.request_id.to_string(), "550e8400-e29b-41d4-a716-446655440000");
        assert_eq!(ctx.trace_id.to_string(), "660e8400-e29b-41d4-a716-446655440000");
        assert_eq!(ctx.user_agent.as_deref(), Some("test-agent/1.0"));
        assert_eq!(ctx.client_ip.as_deref(), Some("127.0.0.1"));
    }

    #[test]
    fn build_context_generates_ids_when_headers_absent() {
        let headers = HeaderMap::new();
        let ctx = build_request_context(&headers, socket(), &[]);
        // Generated UUIDs are not nil.
        assert_ne!(ctx.request_id, Uuid::nil());
        assert_ne!(ctx.trace_id, Uuid::nil());
    }

    #[test]
    fn cidr_matching_ipv4() {
        assert!(ip_matches_cidr(
            "10.0.0.5".parse().unwrap(),
            "10.0.0.0/8"
        ));
        assert!(!ip_matches_cidr(
            "203.0.113.5".parse().unwrap(),
            "10.0.0.0/8"
        ));
        assert!(ip_matches_cidr(
            "192.168.1.1".parse().unwrap(),
            "192.168.1.0/24"
        ));
        assert!(ip_matches_cidr(
            "127.0.0.1".parse().unwrap(),
            "127.0.0.1"
        ));
    }
}
```

- [ ] **Step 2: Register the module in `lib.rs`**

Edit `backend/crates/klynt-api/src/lib.rs`. Add `pub mod request_context;`:

```rust
pub mod error;
pub mod middleware;
pub mod openapi;
pub mod rate_limit;
pub mod request_context;
pub mod startup;
pub mod state;
pub mod v1;
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd backend && cargo test -p klynt-api request_context`
Expected: all 7 tests PASS

- [ ] **Step 4: Commit**

```bash
git add backend/crates/klynt-api/src/request_context.rs backend/crates/klynt-api/src/lib.rs
git commit -m "feat(api): add request_context middleware with trusted-proxy client-IP extraction"
```

---

## Task 7: Create `logging.rs` — structured request/response logging with sanitization

**Files:**
- Create: `backend/crates/klynt-api/src/logging.rs`
- Modify: `backend/crates/klynt-api/src/lib.rs`

- [ ] **Step 1: Write the failing tests**

Create `backend/crates/klynt-api/src/logging.rs`:

```rust
//! Structured request/response logging with PII sanitization.
//!
//! One structured JSON log line per request, emitted from `mw_map_response`.
//! Logging is best-effort: failures are swallowed and logged internally — they
//! can never fail an HTTP response.

use std::collections::HashMap;
use std::sync::LazyLock;

use axum::http::{Method, Uri};
use klynt_domain::ctx::Ctx;
use serde::Serialize;
use serde_json::{Value, json};
use serde_with::skip_serializing_none;
use tracing::{debug, error, info};
use uuid::Uuid;

use crate::request_context::RequestContext;

/// Fields whose values are redacted before logging.
const SENSITIVE_FIELDS: &[&str] = &[
    "password",
    "pwd",
    "token",
    "secret",
    "key",
    "api_key",
    "apikey",
    "authorization",
    "credit_card",
    "card_number",
    "cvv",
    "ssn",
    "social_security",
    "phone",
    "email",
    "date_of_birth",
];

/// Logging configuration loaded from environment.
struct LogConfig {
    log_bodies: bool,
    log_success: bool,
    max_body_size: usize,
}

impl LogConfig {
    fn from_env() -> Self {
        Self {
            // Default false everywhere — PII minimization.
            log_bodies: std::env::var("LOG_BODIES").map(|v| v == "true").unwrap_or(false),
            log_success: std::env::var("LOG_SUCCESS").map(|v| v == "true").unwrap_or(false),
            max_body_size: std::env::var("MAX_BODY_SIZE")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(10 * 1024),
        }
    }
}

static LOG_CONFIG: LazyLock<LogConfig> = LazyLock::new(LogConfig::from_env);

/// Request info collected for logging.
pub struct LogRequest {
    pub uri: Uri,
    pub method: Method,
    pub ctx: Option<Ctx>,
    pub body: Option<Value>,
}

/// Owned error classification extracted at log time (avoids lifetime issues
/// with borrowing `AppError` from response extensions).
#[derive(Debug, Clone)]
pub struct ErrorClassification {
    pub error_code: &'static str,
    pub message: String,
}

/// Response info collected for logging.
pub struct LogResponse {
    pub status: u16,
    pub body: Option<Value>,
    pub error: Option<ErrorClassification>,
}

/// Full log entry passed to `log_request`.
pub struct LogEntry {
    pub request_ctx: RequestContext,
    pub request: LogRequest,
    pub response: LogResponse,
}

/// Recursively redact sensitive fields in a JSON value (case-insensitive key match).
fn sanitize_value(value: &mut Value) {
    match value {
        Value::Object(map) => {
            for (key, val) in map.iter_mut() {
                let lower = key.to_lowercase();
                if SENSITIVE_FIELDS.iter().any(|f| lower.contains(f)) {
                    *val = json!("[REDACTED]");
                } else {
                    sanitize_value(val);
                }
            }
        }
        Value::Array(arr) => {
            for item in arr.iter_mut() {
                sanitize_value(item);
            }
        }
        _ => {}
    }
}

/// Extract and sanitize query parameters from a URI.
fn extract_query_params(uri: &Uri) -> Option<Value> {
    uri.query().map(|q| {
        let params: HashMap<String, String> = q
            .split('&')
            .filter_map(|pair| {
                let mut parts = pair.splitn(2, '=');
                let key = parts.next()?.to_string();
                let value = parts.next().unwrap_or("").to_string();
                Some((key, value))
            })
            .collect();

        let mut value = json!(params);
        sanitize_value(&mut value);
        value
    })
}

/// Emit one structured log line for a request. Best-effort — never fails.
pub fn log_request(entry: LogEntry) {
    let LogEntry { request_ctx, request, response } = entry;

    let now = chrono::Utc::now();
    let duration_ms = request_ctx
        .start_time
        .elapsed()
        .as_secs_f64()
        * 1000.0;

    let is_error = response.status >= 400;

    // Skip successful requests if log_success is disabled.
    if !is_error && !LOG_CONFIG.log_success {
        return;
    }

    let user_id = request.ctx.map(|c| c.user_id).map(Uuid::to_string);

    // Sanitize request body if logging bodies is enabled.
    let req_body = if LOG_CONFIG.log_bodies {
        let mut body = request.body;
        if let Some(ref mut b) = body {
            if let Some(s) = b.as_str() {
                if s.len() > LOG_CONFIG.max_body_size {
                    *b = json!(format!("[TRUNCATED: {} bytes]", s.len()));
                }
            }
            sanitize_value(b);
        }
        body
    } else {
        None
    };

    // Sanitize response body.
    let resp_body = if LOG_CONFIG.log_bodies {
        let mut body = response.body;
        if let Some(ref mut b) = body {
            let size = b.to_string().len();
            if size > LOG_CONFIG.max_body_size {
                *b = json!(format!("[TRUNCATED: {} bytes]", size));
            }
            sanitize_value(b);
        }
        body
    } else {
        None
    };

    let (severity, category, error_info) = if let Some(classification) = response.error {
        // Map the error code to severity/category by matching known codes.
        let (sev, cat) = match classification.error_code {
            "AUTHENTICATION_REQUIRED" => ("Low", "Authentication"),
            "RATE_LIMITED" => ("Medium", "Authorization"),
            "INTERNAL_ERROR" => ("High", "Infrastructure"),
            _ => ("Low", "Validation"),
        };
        (
            Some(sev),
            Some(cat),
            Some(ErrorInfo {
                type_: classification.error_code,
                message: classification.message,
            }),
        )
    } else {
        (None, None, None)
    };

    let log_line = RequestLogLine {
        id: request_ctx.request_id.to_string(),
        trace_id: request_ctx.trace_id.to_string(),
        timestamp: now.to_rfc3339(),
        duration_ms,
        severity,
        category,
        request: RequestLogContext {
            method: request.method.to_string(),
            path: request.uri.path().to_string(),
            query: extract_query_params(&request.uri),
            client_ip: request_ctx.client_ip.clone(),
            user_agent: request_ctx.user_agent.clone(),
            body: req_body,
            user_id,
        },
        response: ResponseLogContext {
            status_code: response.status,
            body: resp_body,
        },
        error: error_info,
    };

    let serialized = match serde_json::to_string(&log_line) {
        Ok(s) => s,
        Err(e) => {
            error!("Failed to serialize log line: {e}");
            return;
        }
    };

    if is_error {
        info!("REQUEST LOG: {serialized}");
    } else {
        debug!("REQUEST LOG: {serialized}");
    }
}

#[skip_serializing_none]
#[derive(Serialize)]
struct RequestLogLine<'a> {
    id: String,
    trace_id: String,
    timestamp: String,
    duration_ms: f64,
    severity: Option<&'a str>,
    category: Option<&'a str>,
    request: RequestLogContext,
    response: ResponseLogContext,
    error: Option<ErrorInfo>,
}

#[skip_serializing_none]
#[derive(Serialize)]
struct RequestLogContext {
    method: String,
    path: String,
    query: Option<Value>,
    client_ip: Option<String>,
    user_agent: Option<String>,
    body: Option<Value>,
    user_id: Option<String>,
}

#[skip_serializing_none]
#[derive(Serialize)]
struct ResponseLogContext {
    status_code: u16,
    body: Option<Value>,
}

#[skip_serializing_none]
#[derive(Serialize)]
struct ErrorInfo {
    #[serde(rename = "type")]
    type_: &'static str,
    message: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_redacts_password() {
        let mut val = json!({"name": "Ada", "password": "secret123"});
        sanitize_value(&mut val);
        assert_eq!(val["password"], "[REDACTED]");
        assert_eq!(val["name"], "Ada");
    }

    #[test]
    fn sanitize_redacts_email() {
        let mut val = json!({"email": "ada@example.com", "id": "123"});
        sanitize_value(&mut val);
        assert_eq!(val["email"], "[REDACTED]");
        assert_eq!(val["id"], "123");
    }

    #[test]
    fn sanitize_redacts_nested_token() {
        let mut val = json!({
            "user": {"name": "Ada", "token": "abc"},
            "items": [{"api_key": "xyz", "label": "ok"}]
        });
        sanitize_value(&mut val);
        assert_eq!(val["user"]["token"], "[REDACTED]");
        assert_eq!(val["items"][0]["api_key"], "[REDACTED]");
        assert_eq!(val["items"][0]["label"], "ok");
    }

    #[test]
    fn sanitize_is_case_insensitive() {
        let mut val = json!({"Password": "x", "API_KEY": "y"});
        sanitize_value(&mut val);
        assert_eq!(val["Password"], "[REDACTED]");
        assert_eq!(val["API_KEY"], "[REDACTED]");
    }

    #[test]
    fn extract_query_params_redacts_sensitive() {
        let uri: Uri = "/api/v1/users?name=Ada&token=secret&page=1".parse().unwrap();
        let params = extract_query_params(&uri).unwrap();
        assert_eq!(params["name"], "Ada");
        assert_eq!(params["token"], "[REDACTED]");
        assert_eq!(params["page"], "1");
    }

    #[test]
    fn extract_query_params_none_when_no_query() {
        let uri: Uri = "/api/v1/health/live".parse().unwrap();
        assert!(extract_query_params(&uri).is_none());
    }
}
```

- [ ] **Step 2: Add `serde_with` to dependencies**

The module uses `serde_with::skip_serializing_none`. Add it to the workspace and klynt-api.

Edit `backend/Cargo.toml`, add to `[workspace.dependencies]` (after `serde_json`):

```toml
serde_with = "3"
```

Edit `backend/crates/klynt-api/Cargo.toml`, add to `[dependencies]`:

```toml
serde_with = { workspace = true }
```

- [ ] **Step 3: Register the module in `lib.rs`**

Edit `backend/crates/klynt-api/src/lib.rs`. Add `pub mod logging;`:

```rust
pub mod error;
pub mod logging;
pub mod middleware;
pub mod openapi;
pub mod rate_limit;
pub mod request_context;
pub mod startup;
pub mod state;
pub mod v1;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && cargo test -p klynt-api logging`
Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/Cargo.toml backend/crates/klynt-api/Cargo.toml backend/crates/klynt-api/src/logging.rs backend/crates/klynt-api/src/lib.rs
git commit -m "feat(api): add structured logging module with PII sanitization"
```

---

## Task 8: Create `response.rs` — the response envelope + `mw_map_response`

**Files:**
- Create: `backend/crates/klynt-api/src/response.rs`
- Modify: `backend/crates/klynt-api/src/lib.rs`

- [ ] **Step 1: Write the module with the envelope types and middleware**

Create `backend/crates/klynt-api/src/response.rs`:

```rust
//! Unified response envelope and `mw_map_response` middleware.
//!
//! Every `/api/v1/*` response (except health probes) is wrapped into:
//! ```json
//! { "id", "status", "type", "data", "error", "meta" }
//! ```

use axum::{
    Json,
    body::to_bytes,
    http::{HeaderMap, Method, StatusCode, Uri, header},
    response::{IntoResponse, Response},
};
use serde::Serialize;
use serde_json::Value;
use tracing::error;
use uuid::Uuid;

use crate::error::AppError;
use crate::logging::{LogEntry, LogRequest, LogResponse, log_request};
use crate::middleware::RequestId;
use crate::request_context::RequestContext;

/// Maximum response body size to buffer for envelope wrapping (1 MB).
const MAX_ENVELOPE_BODY_SIZE: usize = 1024 * 1024;

/// Top-level response envelope.
#[derive(Debug, Serialize)]
pub struct ApiResponse {
    pub id: String,
    pub status: u8,
    #[serde(rename = "type")]
    pub response_type: &'static str,
    pub data: Option<Value>,
    pub error: Option<ApiErrorPayload>,
    pub meta: ResponseMeta,
}

#[derive(Debug, Serialize)]
pub struct ApiErrorPayload {
    #[serde(rename = "type")]
    pub error_type: &'static str,
    pub code: u16,
    pub message: String,
    pub details: Option<Value>,
}

#[derive(Debug, Serialize)]
pub struct ResponseMeta {
    pub request_id: String,
    pub trace_id: String,
    pub timestamp: String,
    pub duration_ms: f64,
}

impl ApiResponse {
    pub fn success(id: &str, data: Value, meta: ResponseMeta) -> Self {
        Self {
            id: id.to_string(),
            status: 0,
            response_type: "success",
            data: Some(data),
            error: None,
            meta,
        }
    }

    pub fn error(id: &str, error: ApiErrorPayload, meta: ResponseMeta) -> Self {
        Self {
            id: id.to_string(),
            status: 1,
            response_type: "error",
            data: None,
            error: Some(error),
            meta,
        }
    }
}

/// Build `ResponseMeta` from the request context + duration.
fn build_meta(ctx: &RequestContext) -> ResponseMeta {
    ResponseMeta {
        request_id: ctx.request_id.to_string(),
        trace_id: ctx.trace_id.to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        duration_ms: ctx.start_time.elapsed().as_secs_f64() * 1000.0,
    }
}

/// Check if a response should be enveloped (JSON + small enough).
fn should_envelope(status: StatusCode, headers: &axum::http::HeaderMap) -> bool {
    // Skip 204 No Content.
    if status == StatusCode::NO_CONTENT {
        return false;
    }
    // Check Content-Type is JSON.
    let is_json = headers
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(|t| t.contains("application/json"))
        .unwrap_or(false);
    if !is_json {
        return false;
    }
    // Check body size.
    if let Some(len) = headers.get(header::CONTENT_LENGTH) {
        if let Ok(s) = len.to_str() {
            if let Ok(n) = s.parse::<usize>() {
                if n > MAX_ENVELOPE_BODY_SIZE {
                    return false;
                }
            }
        }
    }
    true
}

/// Map a raw handler response into the unified envelope.
pub async fn mw_map_response(
    request_id: RequestId,
    request_ctx: RequestContext,
    uri: Uri,
    method: Method,
    res: Response,
) -> Response {
    // Try to extract Ctx from the response extensions (set by ctx_resolve).
    let ctx = request_ctx.clone();
    let (parts, body) = res.into_parts();

    // Guard: non-JSON or oversized → pass through unchanged.
    if !should_envelope(parts.status, &parts.headers) {
        return Response::from_parts(parts, body);
    }

    let meta = build_meta(&request_ctx);
    let id = &request_id.0.to_string();

    let bytes = to_bytes(body, MAX_ENVELOPE_BODY_SIZE).await.unwrap_or_default();

    let (envelope, final_status, log_error) = if parts.status.is_success() {
        let data: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
        (ApiResponse::success(id, data, meta), parts.status, None)
    } else if let Some(app_err) = parts.extensions.get::<AppError>() {
        let error_payload = ApiErrorPayload {
            error_type: app_err.kind.error_code(),
            code: parts.status.as_u16(),
            message: sanitize_error_message(&app_err.kind),
            details: None,
        };
        let classification = crate::logging::ErrorClassification {
            error_code: app_err.kind.error_code(),
            message: sanitize_error_message(&app_err.kind),
        };
        (
            ApiResponse::error(id, error_payload, meta),
            parts.status,
            Some(classification),
        )
    } else {
        let body_val: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
        let error_payload = if body_val != Value::Null {
            ApiErrorPayload {
                error_type: "UNKNOWN_ERROR",
                code: parts.status.as_u16(),
                message: body_val
                    .get("message")
                    .and_then(|m| m.as_str())
                    .unwrap_or("An unexpected error occurred")
                    .to_string(),
                details: Some(body_val),
            }
        } else {
            ApiErrorPayload {
                error_type: "UNKNOWN_ERROR",
                code: parts.status.as_u16(),
                message: "An unexpected error occurred".to_string(),
                details: None,
            }
        };
        (
            ApiResponse::error(id, error_payload, meta),
            parts.status,
            None,
        )
    };

    // Preserve original response headers (except Content-Type/Length, re-set by Json).
    let mut original_headers = parts.headers.clone();
    original_headers.remove(header::CONTENT_TYPE);
    original_headers.remove(header::CONTENT_LENGTH);

    // Centralized logging (best-effort).
    let log_entry = LogEntry {
        request_ctx,
        request: LogRequest {
            uri: uri.clone(),
            method: method.clone(),
            ctx: None,
            body: None,
        },
        response: LogResponse {
            status: final_status.as_u16(),
            body: Some(envelope.to_log_value()),
            error: log_error,
        },
    };
    // Swallow logging errors — never fail the HTTP response.
    log_request(log_entry);

    let mut response = (final_status, Json(&envelope)).into_response();
    // Merge preserved headers.
    for (name, value) in original_headers.iter() {
        response.headers_mut().insert(name.clone(), value.clone());
    }

    response
}

/// Avoid leaking internal error details for `Internal` variants.
fn sanitize_error_message(kind: &crate::error::AppErrorKind) -> String {
    match kind {
        crate::error::AppErrorKind::Internal(_) => "something went wrong".to_string(),
        other => other.to_string(),
    }
}

impl ApiResponse {
    /// Serialize to a serde_json::Value for logging (without re-serializing the response).
    fn to_log_value(&self) -> Value {
        serde_json::to_value(self).unwrap_or(Value::Null)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn success_envelope_serializes() {
        let meta = ResponseMeta {
            request_id: "req-1".to_string(),
            trace_id: "trace-1".to_string(),
            timestamp: "2026-06-20T17:04:50Z".to_string(),
            duration_ms: 12.3,
        };
        let resp = ApiResponse::success("req-1", serde_json::json!({"name": "Ada"}), meta);
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["status"], 0);
        assert_eq!(json["type"], "success");
        assert_eq!(json["data"]["name"], "Ada");
        assert!(json["error"].is_null());
        assert_eq!(json["meta"]["duration_ms"], 12.3);
    }

    #[test]
    fn error_envelope_serializes() {
        let meta = ResponseMeta {
            request_id: "req-2".to_string(),
            trace_id: "trace-2".to_string(),
            timestamp: "2026-06-20T17:04:50Z".to_string(),
            duration_ms: 3.1,
        };
        let error = ApiErrorPayload {
            error_type: "AUTHENTICATION_REQUIRED",
            code: 401,
            message: "Authentication required".to_string(),
            details: None,
        };
        let resp = ApiResponse::error("req-2", error, meta);
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["status"], 1);
        assert_eq!(json["type"], "error");
        assert!(json["data"].is_null());
        assert_eq!(json["error"]["type"], "AUTHENTICATION_REQUIRED");
        assert_eq!(json["error"]["code"], 401);
    }

    #[test]
    fn sanitize_internal_error_hides_details() {
        let kind = crate::error::AppErrorKind::Internal(Box::new(std::io::Error::other("db password=secret")));
        let msg = sanitize_error_message(&kind);
        assert_eq!(msg, "something went wrong");
        assert!(!msg.contains("secret"));
    }

    #[test]
    fn sanitize_bad_request_shows_message() {
        let kind = crate::error::AppErrorKind::BadRequest("invalid email".to_string());
        let msg = sanitize_error_message(&kind);
        assert_eq!(msg, "invalid email");
    }
}
```

- [ ] **Step 2: Register the module in `lib.rs`**

Edit `backend/crates/klynt-api/src/lib.rs`. Add `pub mod response;`:

```rust
pub mod error;
pub mod logging;
pub mod middleware;
pub mod openapi;
pub mod rate_limit;
pub mod request_context;
pub mod response;
pub mod startup;
pub mod state;
pub mod v1;
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd backend && cargo test -p klynt-api response`
Expected: all 4 tests PASS

- [ ] **Step 4: Commit**

```bash
git add backend/crates/klynt-api/src/response.rs backend/crates/klynt-api/src/lib.rs
git commit -m "feat(api): add response envelope and mw_map_response middleware"
```

---

## Task 9: Update `v1/mod.rs` — extract health routes into a separate router

Health routes must NOT be enveloped, so they need to be mounted on a separate router that bypasses `mw_map_response`.

**Files:**
- Modify: `backend/crates/klynt-api/src/v1/mod.rs`

- [ ] **Step 1: Split health routes out of `router()`**

Edit `backend/crates/klynt-api/src/v1/mod.rs`. Replace the entire file with:

```rust
use std::sync::Arc;

use axum::{
    middleware,
    routing::{get, post},
    Router,
};

use crate::middleware::ctx_require;
use crate::state::AppState;

pub mod auth;
pub mod health;
pub mod sessions;
pub mod users;

/// Health-check routes — mounted WITHOUT the envelope/logging layers.
/// K8s/LB probes expect raw `{status:"ok"}`, not an envelope.
pub fn health_router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/health/live", get(health::liveness))
        .route("/health/ready", get(health::readiness))
}

/// API routes — mounted WITH the envelope/logging layers.
pub fn router() -> Router<Arc<AppState>> {
    let public = Router::new()
        .route("/auth/register", post(auth::register))
        .route("/auth/verify-email", post(auth::verify_email))
        .route(
            "/auth/request-password-reset",
            post(auth::request_password_reset),
        )
        .route("/auth/reset-password", post(auth::reset_password))
        .route("/sessions", post(sessions::login))
        .route("/users", post(users::create_user));

    let protected = Router::new()
        .route("/users/me", get(users::get_me))
        .route_layer(middleware::from_fn(ctx_require));

    public.merge(protected)
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && cargo check -p klynt-api`
Expected: compiles with no errors

- [ ] **Step 3: Commit**

```bash
git add backend/crates/klynt-api/src/v1/mod.rs
git commit -m "refactor(api): extract health routes into separate health_router"
```

---

## Task 10: Rewrite `startup.rs` — new layer chain with envelope, context, logging

**Files:**
- Modify: `backend/crates/klynt-api/src/startup.rs`

- [ ] **Step 1: Replace `build_router` with the new layer chain**

Edit `backend/crates/klynt-api/src/startup.rs`. Replace the entire file with:

```rust
use std::sync::Arc;
use std::time::Duration;

use axum::{
    http::{HeaderName, HeaderValue, Method, StatusCode},
    middleware, Router,
};
use tower_http::{
    compression::CompressionLayer, cors::CorsLayer, timeout::TimeoutLayer, trace::TraceLayer,
};

use crate::middleware::ctx_resolve;
use crate::rate_limit::rate_limit;
use crate::request_context::request_context;
use crate::response::mw_map_response;
use crate::state::AppState;
use crate::v1;

const ALLOWED_METHODS: [Method; 4] = [Method::GET, Method::POST, Method::PUT, Method::DELETE];

const ALLOWED_HEADERS: [HeaderName; 4] = [
    HeaderName::from_static("content-type"),
    HeaderName::from_static("idempotency-key"),
    HeaderName::from_static("x-request-id"),
    HeaderName::from_static("authorization"),
];

/// Build the application router with the full middleware stack.
///
/// Layer order (outermost → innermost at runtime):
/// CORS → Timeout → Compression → Trace → (health: raw | api: context → rate_limit → ctx_resolve → handler → map_response)
pub fn build_router(state: Arc<AppState>) -> Router {
    let origins: Vec<HeaderValue> = state
        .config()
        .api
        .allowed_origins
        .iter()
        .filter_map(|origin| origin.parse().ok())
        .collect();

    let cors = CorsLayer::new()
        .allow_origin(origins)
        .allow_methods(ALLOWED_METHODS)
        .allow_headers(ALLOWED_HEADERS);

    // --- Health router: NO envelope, NO request_context, NO logging ---
    let health = v1::health_router()
        .with_state(Arc::clone(&state));

    // --- API router: full middleware stack including envelope ---
    let api = v1::router()
        .with_state(Arc::clone(&state))
        .layer(middleware::from_fn_with_state(
            Arc::clone(&state),
            ctx_resolve,
        ))
        .layer(middleware::from_fn_with_state(
            Arc::clone(&state),
            rate_limit,
        ))
        .layer(middleware::from_fn_with_state(
            Arc::clone(&state),
            request_context,
        ))
        .layer(middleware::map_response(mw_map_response));

    // Merge health + API under shared outer layers.
    Router::new()
        .merge(health)
        .merge(api)
        .layer(TraceLayer::new_for_http())
        .layer(CompressionLayer::new())
        .layer(TimeoutLayer::with_status_code(
            StatusCode::REQUEST_TIMEOUT,
            Duration::from_secs(30),
        ))
        .layer(cors)
}
```

Note: `propagate_request_id` is **removed** — its job (generating + echoing `x-request-id`) is now handled by `request_context`. The `RequestId` extension is still inserted by `request_context`, so `ctx_resolve` and `rate_limit` which read it continue to work.

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && cargo check --workspace`
Expected: compiles with no errors

- [ ] **Step 3: Run existing tests (expect failures from envelope change)**

Run: `cd backend && cargo test --workspace`
Expected: health_check tests PASS (health routes are not enveloped); users.rs and auth.rs tests that read top-level JSON fields will FAIL — this is expected and fixed in Task 11.

- [ ] **Step 4: Commit**

```bash
git add backend/crates/klynt-api/src/startup.rs
git commit -m "feat(api): wire request_context, envelope, and logging into router"
```

---

## Task 11: Update integration tests to match the envelope

**Files:**
- Modify: `backend/crates/klynt-server/tests/users.rs`
- Modify: `backend/crates/klynt-server/tests/auth.rs`

The health_check tests do NOT change (health routes are not enveloped). For `users.rs` and `auth.rs`, every top-level JSON assertion moves under `data` or `error`.

- [ ] **Step 1: Fix `users.rs` — update `create_user_returns_201`**

Edit `backend/crates/klynt-server/tests/users.rs`. In `create_user_returns_201` (line 74-78), change:

```rust
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["name"], "Ada Lovelace");
    assert_eq!(json["email"], email);
    assert_eq!(json["role"], "student");
    assert_eq!(json["status"], "pending_verification");
```

to:

```rust
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["data"]["name"], "Ada Lovelace");
    assert_eq!(json["data"]["email"], email);
    assert_eq!(json["data"]["role"], "student");
    assert_eq!(json["data"]["status"], "pending_verification");
```

- [ ] **Step 2: Fix `users.rs` — update `idempotency_replay_returns_same_user`**

Edit `backend/crates/klynt-server/tests/users.rs`. In `idempotency_replay_returns_same_user` (line 133), change:

```rust
    assert_eq!(first_json["id"], second_json["id"]);
```

to:

```rust
    assert_eq!(first_json["data"]["id"], second_json["data"]["id"]);
```

- [ ] **Step 3: Fix `users.rs` — update `login_and_get_me_round_trip_works`**

Edit `backend/crates/klynt-server/tests/users.rs`. At lines 419-421, change:

```rust
    let login_json: serde_json::Value = serde_json::from_slice(&login_body).unwrap();
    let token = login_json["token"].as_str().unwrap();
    assert_eq!(login_json["user"]["email"], email);
```

to:

```rust
    let login_json: serde_json::Value = serde_json::from_slice(&login_body).unwrap();
    let token = login_json["data"]["token"].as_str().unwrap();
    assert_eq!(login_json["data"]["user"]["email"], email);
```

And at line 429, change:

```rust
    assert_eq!(me_json["email"], email);
```

to:

```rust
    assert_eq!(me_json["data"]["email"], email);
```

- [ ] **Step 4: Fix `auth.rs` — update `register_returns_201`**

Edit `backend/crates/klynt-server/tests/auth.rs`. In `register_returns_201` (lines 106-114), change:

```rust
    assert!(json["user_id"]
        .as_str()
        .unwrap()
        .parse::<uuid::Uuid>()
        .is_ok());
    assert_eq!(
        json["message"],
        "Registration successful. Please check your email to verify your account."
    );
```

to:

```rust
    assert!(json["data"]["user_id"]
        .as_str()
        .unwrap()
        .parse::<uuid::Uuid>()
        .is_ok());
    assert_eq!(
        json["data"]["message"],
        "Registration successful. Please check your email to verify your account."
    );
```

- [ ] **Step 5: Fix `auth.rs` — update `verify_email_returns_200`**

Edit `backend/crates/klynt-server/tests/auth.rs`. In `verify_email_returns_200` (lines 201-204), change:

```rust
    assert_eq!(
        json["message"],
        "Email verified successfully. You can now log in."
    );
```

to:

```rust
    assert_eq!(
        json["data"]["message"],
        "Email verified successfully. You can now log in."
    );
```

- [ ] **Step 6: Fix `auth.rs` — update `request_password_reset_returns_200`**

Edit `backend/crates/klynt-server/tests/auth.rs`. In `request_password_reset_returns_200` (lines 243-246), change:

```rust
    assert_eq!(
        json["message"],
        "If an account exists with this email, a password reset link has been sent."
    );
```

to:

```rust
    assert_eq!(
        json["data"]["message"],
        "If an account exists with this email, a password reset link has been sent."
    );
```

- [ ] **Step 7: Fix `auth.rs` — update `request_password_reset_for_unknown_email_returns_200`**

Edit `backend/crates/klynt-server/tests/auth.rs`. In `request_password_reset_for_unknown_email_returns_200` (lines 280-283), change:

```rust
    assert_eq!(
        json["message"],
        "If an account exists with this email, a password reset link has been sent."
    );
```

to:

```rust
    assert_eq!(
        json["data"]["message"],
        "If an account exists with this email, a password reset link has been sent."
    );
```

- [ ] **Step 8: Fix `auth.rs` — update `reset_password_with_valid_token_returns_200`**

Edit `backend/crates/klynt-server/tests/auth.rs`. In `reset_password_with_valid_token_returns_200` (lines 358-361), change:

```rust
    assert_eq!(
        json["message"],
        "Password reset successfully. You can now log in with your new password."
    );
```

to:

```rust
    assert_eq!(
        json["data"]["message"],
        "Password reset successfully. You can now log in with your new password."
    );
```

- [ ] **Step 9: Run all tests**

Run: `cd backend && cargo test --workspace`
Expected: all tests PASS

- [ ] **Step 10: Commit**

```bash
git add backend/crates/klynt-server/tests/users.rs backend/crates/klynt-server/tests/auth.rs
git commit -m "test(server): update integration tests for response envelope"
```

---

## Task 12: Add integration test asserting the full envelope shape

**Files:**
- Create: `backend/crates/klynt-server/tests/envelope.rs`

- [ ] **Step 1: Write the integration test**

Create `backend/crates/klynt-server/tests/envelope.rs`:

```rust
use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use tower::ServiceExt;
use uuid::Uuid;

mod helpers;

fn unique_email(prefix: &str) -> String {
    format!("{prefix}-{uuid}@example.com", uuid = Uuid::new_v4())
}

fn register_payload(email: &str) -> String {
    serde_json::json!({
        "name": "Ada Lovelace",
        "email": email,
        "password": "str0ng!passphrase",
        "role": "student",
        "terms_accepted": true,
        "terms_version": "2026-06-18"
    })
    .to_string()
}

#[tokio::test]
async fn success_response_has_full_envelope() {
    let app = helpers::test_app().await;
    let idempotency_key = Uuid::new_v4();
    let email = unique_email("envelope");

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/users")
                .header("Content-Type", "application/json")
                .header("Idempotency-Key", idempotency_key.to_string())
                .body(Body::from(register_payload(&email)))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

    // Envelope structure.
    assert!(json["id"].is_string());
    assert_eq!(json["status"], 0);
    assert_eq!(json["type"], "success");
    assert!(json["error"].is_null());

    // Data is nested.
    assert_eq!(json["data"]["name"], "Ada Lovelace");
    assert_eq!(json["data"]["email"], email);

    // Meta has observability fields.
    assert!(json["meta"]["request_id"].is_string());
    assert!(json["meta"]["trace_id"].is_string());
    assert!(json["meta"]["timestamp"].is_string());
    assert!(json["meta"]["duration_ms"].is_number());
}

#[tokio::test]
async fn health_response_is_not_enveloped() {
    let app = helpers::test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/health/live")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

    // Health is raw — no envelope wrapper.
    assert_eq!(json["status"], "ok");
    // There is no "data" field — proving it's not enveloped.
    assert!(json.get("data").is_none());
    assert!(json.get("type").is_none());
}

#[tokio::test]
async fn error_response_has_full_envelope() {
    let app = helpers::test_app().await;
    let email = unique_email("envelope-error");
    let body_text = register_payload(&email);

    // First create succeeds.
    let first = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/users")
                .header("Content-Type", "application/json")
                .header("Idempotency-Key", Uuid::new_v4().to_string())
                .body(Body::from(body_text.clone()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(first.status(), StatusCode::CREATED);

    // Second with same email → 409 conflict.
    let second = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/users")
                .header("Content-Type", "application/json")
                .header("Idempotency-Key", Uuid::new_v4().to_string())
                .body(Body::from(body_text))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(second.status(), StatusCode::CONFLICT);

    let body = second.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

    // Error envelope structure.
    assert_eq!(json["status"], 1);
    assert_eq!(json["type"], "error");
    assert!(json["data"].is_null());

    assert_eq!(json["error"]["type"], "CONFLICT");
    assert_eq!(json["error"]["code"], 409);
    assert!(json["error"]["message"].is_string());
}
```

- [ ] **Step 2: Run the new test**

Run: `cd backend && cargo test -p klynt-server --test envelope`
Expected: all 3 tests PASS

- [ ] **Step 3: Commit**

```bash
git add backend/crates/klynt-server/tests/envelope.rs
git commit -m "test(server): add integration tests for response envelope shape"
```

---

## Task 13: Update `.env.example` and write the ADR

**Files:**
- Modify: `.env.example`
- Create: `docs/adr/0002-response-envelope.md`

- [ ] **Step 1: Add new env vars to `.env.example`**

Read `.env.example`, then append the logging/trusted-proxy config with comments:

```env
# --- Logging ---
# Log full request/response bodies (default: false — PII minimization)
LOG_BODIES=false
# Log successful requests (default: false)
LOG_SUCCESS=false
# Max body size to log in bytes (default: 10240)
MAX_BODY_SIZE=10240

# --- Trusted Proxies ---
# CIDR ranges of trusted reverse proxies (e.g. "10.0.0.0/8"). Empty = trust
# only the direct socket connection IP. Set this when behind a load balancer.
# Multiple values use array syntax: ["10.0.0.0/8", "172.16.0.0/12"]
KLYNT_API__TRUSTED_PROXIES=[]
```

Note: `MAX_ENVELOPE_BODY_SIZE` is a compile-time constant (1 MB) in `response.rs`, not an env var.

- [ ] **Step 2: Write the ADR**

Create `docs/adr/0002-response-envelope.md`:

```markdown
# ADR 0002: Unified Response Envelope

**Date:** 2026-06-21
**Status:** Accepted

## Context

The klynt-edu backend returns raw `Json<T>` for successes and a flat
`{code, message, request_id}` body for errors. This inconsistency forces the
frontend to special-case success vs error parsing per endpoint and makes
observability harder (no standard place for request_id, trace_id, duration).

## Decision

Adopt a unified response envelope for all `/api/v1/*` routes (excluding health
probes):

```json
{
  "id": "<request-uuid>",
  "status": 0,
  "type": "success",
  "data": { ... },
  "error": null,
  "meta": { "request_id", "trace_id", "timestamp", "duration_ms" }
}
```

Errors use `status: 1`, `type: "error"`, and populate the `error` field with
`{type, code, message, details}`.

The envelope is applied by `mw_map_response` — a response middleware — so
handlers remain unchanged (they keep returning `Result<Json<T>, AppError>`).

## Alternatives considered

1. **nexra-exact port** (Approach A): port nexra's 30-variant gateway error enum.
   Rejected — ~24 variants are dead code for a clean-architecture monolith.
2. **No envelope** (status quo): rejected — frontend complexity and
   observability gaps.
3. **Feature flag** (`KLYNT_RESPONSE_ENVELOPE`): rejected — no release yet, so
   a coordinated frontend+backend ship is simpler than a flag-gated rollout.

## Consequences

- All integration tests that read top-level JSON fields were updated to read
  under `data`/`error`.
- Health routes are exempt (mounted on a separate router without the envelope
  layer) to avoid breaking K8s/LB probes.
- The frontend Axios interceptor must unwrap `response.data.data` for
  successes and read `response.data.error` for errors.
- Non-JSON responses, 204 No Content, oversized responses (>1 MB), timeout 408s,
  and CORS preflights pass through without enveloping.
```

- [ ] **Step 3: Commit**

```bash
git add .env.example docs/adr/0002-response-envelope.md
git commit -m "docs: add env vars and ADR for response envelope"
```

---

## Task 14: Run full quality gates

- [ ] **Step 1: Run `just check`**

Run: `cd /Users/jayden/Projects/Klynt/klynt-edu && just check`
Expected: fmt-check passes, clippy passes with no warnings, typecheck passes

If clippy fails, fix the warnings. Common issues:
- Unused imports — remove them.
- `too many arguments` — the `mw_map_response` signature may need grouping.

- [ ] **Step 2: Run `just test-coverage`**

Run: `cd /Users/jayden/Projects/Klynt/klynt-edu && just test-coverage`
Expected: all tests pass, Rust coverage ≥ 84%

If coverage is below 84%, add more tests for the new modules:
- `logging.rs`: test `log_request` function (with `LOG_BODIES=true` env)
- `response.rs`: test `should_envelope` with non-JSON content type
- `request_context.rs`: test the `request_context` middleware end-to-end

- [ ] **Step 3: Verify file-size limits**

Run: `cd /Users/jayden/Projects/Klynt/klynt-edu && bash backend/scripts/check-file-size.sh`
Expected: no files exceed 400 lines (source) / 600 lines (test)

If any file exceeds the limit, split it.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address clippy/coverage/file-size gate issues"
```

---

## Task 15: Final verification and summary commit

- [ ] **Step 1: Run the complete test suite one final time**

Run: `cd backend && cargo test --workspace`
Expected: ALL tests pass

- [ ] **Step 2: Verify no new dependencies**

Run: `cd backend && cargo tree -p klynt-api`
Expected: only `serde_with` is new (workspace-level). No `ulid`, `time`, `tower-cookies`.

- [ ] **Step 3: Final commit (if any remaining changes)**

If there are uncommitted changes from the verification steps:

```bash
git add -A
git commit -m "chore: final cleanup for middleware integration"
```

The implementation is complete. All four capabilities are integrated:
1. ✅ Unified response envelope (`response.rs`)
2. ✅ Structured request/response logging (`logging.rs`)
3. ✅ Request timing/duration (`request_context.rs` → `RequestContext.start_time`)
4. ✅ Error severity/category classification (`error.rs`)
