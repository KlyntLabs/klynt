# Middleware Integration Design

**Date:** 2026-06-20
**Status:** Approved (revised 2026-06-21 after spec review)
**Scope:** Backend (`backend/crates/klynt-api`, `backend/crates/klynt-server`)

## Summary

Integrate four middleware capabilities from the `nexra-core` codebase into the
klynt-edu backend: a unified response envelope, structured request/response
logging, request-timestamp/duration capture, and error severity/category
classification. The integration takes nexra's **patterns**, not its code —
adapting to klynt's existing `uuid`/`chrono` primitives, real Bearer-token auth,
and clean-architecture layering rather than porting nexra's `ulid`/`time`/
`tower-cookies` dependencies and 30-variant gateway error enum.

## Motivation

The klynt-edu backend currently returns raw `Json<T>` for successes and a flat
`{code, message, request_id}` body for errors. This is inconsistent for frontend
consumers and lacks:

- A single predictable response shape (the frontend must special-case success vs
  error parsing).
- Structured request logging with body sanitization and duration.
- Client-IP extraction from proxy headers (for rate limiting and audit).
- Error severity-driven log levels.

`nexra-core`'s `crates/gateways/api_gateway/src/middleware/` solves exactly these
problems with `mw_res_map` (envelope), `mw_request_context` (context + logging),
`mw_res_timestamp` (timing), and a severity-classified error type. This spec
brings those capabilities into klynt idiomatically.

## User stories

1. **As a frontend engineer**, I want every API response to use the same
   `{id, status, type, data, error, meta}` envelope so that I can write a single
   Axios interceptor instead of special-casing success/error parsing per
   endpoint.

2. **As an on-call engineer**, I want one structured JSON log line per request
   (with `request_id`, `duration_ms`, sanitized bodies, severity) so that I can
   query and correlate issues across requests without grepping unstructured
   logs.

3. **As a security engineer**, I want client-IP captured from trusted proxy
   headers (not spoofable) so that rate limiting and audit logs reflect the real
   client, not an attacker-controlled header value.

## Success metrics

| Metric | Target |
|---|---|
| API responses using the unified envelope | 100% of `/api/v1/*` routes (excluding health probes) |
| Requests emitting a structured log line | 100% |
| Log lines containing `request_id` | 100% |
| Duplicate log entries per request | 0 (single log line, single location) |
| New dependencies added | 0 |

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Capabilities in scope | All four (envelope, logging, timing, error classification) | User request |
| Envelope shape | nexra-exact `{id, status, type, data, error, meta}` | User request |
| `meta` contents | Enriched `{request_id, trace_id, timestamp, duration_ms}` | User request; observability value |
| Integration approach | Capability-driven (Approach B) | Avoids ~24 dead gateway-error variants; single error enum; respects 400-line cap |
| ID/time primitives | Reuse klynt's `uuid` + `chrono` | nexra's `ulid`/`time` would duplicate primitives the domain layer already owns |
| Auth | Keep klynt's existing Bearer-token `ctx_resolve`/`ctx_require` | Already real (Postgres + Redis); nexra's cookie-based `mw_auth` is stubbed |
| Handlers | Unchanged — keep returning `Result<Json<T>, AppError>` | Envelope applied by response middleware, not handler code |
| Health probe exemption | Health routes mounted on a separate router without the envelope layer | K8s/LB probes expect raw `{status:"ok"}`, not an envelope |
| Log body defaults | `LOG_BODIES=false`, `LOG_SUCCESS=false` in **all** environments | PII minimization; explicit opt-in required |
| Client-IP trust | Trusted-proxy CIDR config required to honor `X-Forwarded-For` | Prevents IP spoofing that bypasses rate limiting |
| `trace_id` | Kept (user-approved enriched meta); forward-looking for future distributed tracing | No consumer today but trivially cheap and explicitly requested |

## Architecture

### Module layout

All new middleware/response code lives in `klynt-api`. Minor config additions
in `klynt-domain` (config type) and `klynt-infrastructure` (env loading) /
`klynt-server` (composition) to support the trusted-proxy list.

```
backend/crates/klynt-api/src/
├── error.rs            (MODIFIED — +severity/category/error_code/retry_after)
├── middleware.rs       (UNCHANGED — RequestId, CtxW, ctx_resolve, ctx_require)
├── rate_limit.rs       (unchanged)
├── response.rs         (NEW — ApiResponse envelope + mw_map_response)
├── request_context.rs  (NEW — RequestContext, client-IP, trace_id, task_local)
├── logging.rs          (NEW — LogEntry, sanitize, RequestLogLine)
├── startup.rs          (MODIFIED — new layer chain + health exemption)
├── state.rs            (unchanged)
├── openapi.rs          (unchanged — static YAML, not a served route)
└── v1/                 (unchanged — handlers keep raw Json<T> returns)

backend/crates/klynt-domain/src/      (+1 config field: trusted_proxies)
backend/crates/klynt-infrastructure/src/ (env loading for trusted_proxies)
```

File-size budget (400-line source cap; all comfortably under):

| File | Current | Estimated after | Cap |
|---|---|---|---|
| `error.rs` | 230 | ~300 | 400 |
| `response.rs` | new | ~200 | 400 |
| `request_context.rs` | new | ~150 | 400 |
| `logging.rs` | new | ~280 | 400 |
| `startup.rs` | 59 | ~90 | 400 |

### Middleware layering order

New chain in `startup.rs::build_router` (top = outermost; request flows
top→bottom, response flows bottom→top):

```
─── Shared outer layers (all routers) ───
CorsLayer                                      (outermost)
TimeoutLayer (30s → 408)
CompressionLayer
TraceLayer::new_for_http()                     (default span)

─── Health router (NO envelope, NO logging) ───
  /api/v1/health/live, /api/v1/health/ready
  → raw handler → raw response (for K8s/LB probes)

─── API router (with envelope + logging) ────
  from_fn(request_context)                     ← NEW
  from_fn_with_state(rate_limit)
  from_fn_with_state(ctx_resolve)
  [ctx_require as route_layer on protected]
  [handler]  →  raw Json<T> / AppError
  map_response(mw_map_response)                ← NEW (conditional on feature flag)
```

The health router is mounted on a **separate sub-router** that shares the outer
layers (CORS, timeout, compression, trace) but does **not** include
`request_context` or `mw_map_response`. This means health probes get raw
`{status:"ok"}` responses as they do today, and they are not logged (probes fire
constantly and would flood logs).

**Responses NOT enveloped (infrastructure-layer exemptions):**

| Response source | Enveloped? | Why |
|---|---|---|
| Handler output (`/api/v1/*` non-health) | Yes | The primary use case |
| `TimeoutLayer` 408 | No | Short-circuits before `mw_map_response` runs; acceptable — 408 is an infrastructure signal |
| CORS preflight (`OPTIONS`) | No | `CorsLayer` answers before inner layers run; correct behavior |
| Health probes (`/api/v1/health/*`) | No | Mounted on separate router without envelope layer |

- `request_context` runs inside `TraceLayer` and records `request_id`/`trace_id`
  onto `Span::current()` (nexra's proven pattern — no custom `make_span_with`
  needed).
- `mw_map_response` is the innermost response layer on the API router: it sees
  the raw handler output first, wraps it into the envelope, and logs. Outer
  layers see the already-enveloped response.
- `RequestId(Uuid)` remains in request extensions for backward compatibility
  with `ctx_resolve` and handler extractors.

## Components

### 1. Response envelope (`response.rs`)

```rust
#[derive(Debug, Serialize)]
pub struct ApiResponse {
    pub id: String,           // RequestId (Uuid) as string
    pub status: u8,           // 0 = success, 1 = error
    #[serde(rename = "type")]
    pub response_type: &'static str,  // "success" | "error"
    pub data: Option<Value>,
    pub error: Option<ApiErrorPayload>,
    pub meta: ResponseMeta,
}

#[derive(Debug, Serialize)]
pub struct ApiErrorPayload {
    #[serde(rename = "type")]
    pub error_type: &'static str,   // AppErrorKind::error_code(), e.g. "AUTHENTICATION_REQUIRED"
    pub code: u16,                  // HTTP status code
    pub message: String,
    pub details: Option<Value>,
}

#[derive(Debug, Serialize)]
pub struct ResponseMeta {
    pub request_id: String,
    pub trace_id: String,
    pub timestamp: String,          // chrono UTC RFC3339
    pub duration_ms: f64,
}
```

**Success wire shape** (200/201):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": 0,
  "type": "success",
  "data": { "name": "Ada Lovelace", "email": "ada@example.com" },
  "error": null,
  "meta": {
    "request_id": "550e8400-...",
    "trace_id": "660e8400-...",
    "timestamp": "2026-06-20T17:04:50Z",
    "duration_ms": 12.3
  }
}
```

**Error wire shape** (4xx/5xx):
```json
{
  "id": "550e8400-...",
  "status": 1,
  "type": "error",
  "data": null,
  "error": {
    "type": "AUTHENTICATION_REQUIRED",
    "code": 401,
    "message": "Authentication required",
    "details": null
  },
  "meta": { "request_id": "...", "trace_id": "...", "timestamp": "...", "duration_ms": 3.1 }
}
```

`mw_map_response` signature (axum `map_response` with extractors):

```rust
pub async fn mw_map_response(
    request_id: RequestId,
    request_ctx: RequestContext,
    uri: Uri,
    method: Method,
    res: Response,
) -> Response
```

**Prerequisite:** `RequestId` and `RequestContext` each need a
`FromRequestParts` impl that reads from request extensions (where
`request_context` middleware inserts them). `RequestId` currently lacks this impl
— it is added as part of this work. This is how nexra's `ReqStamp`/`CtxW`
extractors work in its `mw_map_response`.

Logic (mirrors nexra's `mw_map_response` with hardening):
1. Decompose `res` into `(parts, body)`.
2. Read `duration_ms` from `RequestContext::start_time`.
3. **Content-type guard:** if `Content-Type` is not `application/json`, or status
   is `204 No Content`, **pass through the response unchanged** (preserves
   original headers + body). Do not buffer non-JSON bodies.
4. **Body-size cap:** if `Content-Length` exceeds `MAX_ENVELOPE_BODY_SIZE`
   (default 1 MB), **pass through unchanged** — avoids unbounded buffering for
   large responses.
5. If `parts.status.is_success()`: extract body bytes (capped) → parse as JSON →
   wrap as `data`.
6. Else if an `AppError` is in `parts.extensions`: build `ApiErrorPayload` from
   `AppErrorKind::error_code()` + status mapping.
7. Else: parse body as error data, or produce an unknown-error payload.
8. Build `ApiResponse`.
9. **Preserve original response headers:** copy `parts.headers` onto the new
   envelope response (so `Cache-Control`, `ETag`, `Set-Cookie`, `Retry-After`,
   etc. survive). Do not overwrite `Content-Type` or `Content-Length` (re-set
   them for the new body).
10. Log via `logging::log_request` — **log failures are swallowed** (logged
    internally as `error!`, never propagated to fail the HTTP response).
11. Return `(status, original_headers_merged, Json(envelope))`.

### 2. RequestContext (`request_context.rs`)

```rust
#[derive(Debug, Clone)]
pub struct RequestContext {
    pub request_id: Uuid,
    pub trace_id: Uuid,
    pub client_ip: Option<String>,
    pub user_agent: Option<String>,
    pub start_time: Instant,
}
```

- `from_headers(headers, socket_addr, trusted_proxies) -> Self` — reads
  `x-request-id` (parse as Uuid, else `Uuid::new_v4`), `x-trace-id` (likewise),
  `user-agent`, and calls `extract_client_ip`.
- `extract_client_ip(headers, socket_addr, trusted_proxies) -> Option<String>`
  — **trusted-proxy aware** (unlike nexra's naive version):
  - If `trusted_proxies` is empty, returns the socket address IP directly (no
    header trust).
  - If the socket address IP is in `trusted_proxies`, parses `X-Forwarded-For`
    from **rightmost to leftmost**, skipping IPs in the trusted set, taking the
    first untrusted IP as the client.
  - Falls back to `x-real-ip` / `cf-connecting-ip` only when the socket is a
    trusted proxy.
  - If no proxy headers are trusted, returns the socket address IP.
- `run_with_context(self, future) -> R` — scopes the future inside a
  `tokio::task_local!` so `mw_map_response` and handlers can read the context.

  **Spawn constraint:** `tokio::task_local!` does **not** propagate across
  `tokio::spawn`. Code that spawns detached work inside a handler loses the
  `RequestContext`. This is acceptable — spawned work is fire-and-forget and
  should not produce HTTP responses. If a spawned task needs the context, it
  must explicitly capture the `RequestContext` value before spawning. This
  constraint is documented in the module doc-comment.

- Middleware `request_context(ConnectInfo<SocketAddr>, State, mut req, next)`:
  builds context (reading `trusted_proxies` from `AppState::config()`), inserts
  `RequestId` + `RequestContext` into extensions, echoes `x-request-id` header
  on the response, records `request_id`/`trace_id` on `Span::current()`, emits
  an `info!` "Request started" log, then runs the rest of the request inside
  `run_with_context`.

This **replaces** the existing `propagate_request_id` middleware (its
header-echo + generation behavior is absorbed into `request_context`).

**New config field:** `AppConfig::api::trusted_proxies: Vec<String>` (CIDR
notation, e.g. `["10.0.0.0/8", "172.16.0.0/12"]`). Defaults to empty (socket IP
only, no header trust). Must be set when running behind a reverse proxy.

### 3. Structured logging (`logging.rs`)

Ported from nexra's `log` module, adapted to klynt types:

```rust
pub struct LogEntry { pub request: LogRequest, pub response: LogResponse }

/// Errors are swallowed — logging must never fail an HTTP response.
pub async fn log_request(entry: LogEntry)
```

Capabilities:
- **Body sanitization** — `SENSITIVE_FIELDS = ["password", "pwd", "token",
  "secret", "key", "api_key", "apikey", "authorization", "credit_card",
  "card_number", "cvv", "ssn", "social_security", "phone", "email",
  "date_of_birth"]`; recursive `sanitize_value` replaces matching keys (case
  insensitive) with `"[REDACTED]"`. Also redacts query-string parameters
  matching sensitive patterns.
- **Body truncation** — bodies over `MAX_BODY_SIZE` (default 10 KB) are replaced
  with `"[TRUNCATED: N bytes]"`.
- **Env-configurable** — `LOG_BODIES` (**default `false` everywhere**; explicit
  opt-in), `LOG_SUCCESS` (**default `false` everywhere**), `MAX_BODY_SIZE`.
  These are `false` by default in **all** environments to prevent PII leakage;
  operators explicitly set `LOG_BODIES=true` when debugging.
- **One structured log line per request** — `RequestLogLine` serialized to JSON:

```rust
struct RequestLogLine {
    id: String,                    // request_id
    trace_id: String,              // trace_id
    timestamp: String,
    duration_ms: f64,
    severity: Option<&'static str>,   // from AppErrorKind::severity() on errors
    category: Option<&'static str>,   // from AppErrorKind::category() on errors
    request: {
        method: String,
        path: String,
        query: Option<Value>,      // sanitized
        client_ip: Option<String>,
        user_agent: Option<String>,
        body: Option<Value>,       // sanitized + truncated (if LOG_BODIES=true)
        user_id: Option<String>,   // from Ctx
    },
    response: {
        status: String,            // "✅ success" or "❌ error"
        body: Option<Value>,       // sanitized (if LOG_BODIES=true)
        size: Option<usize>,
    },
    error: Option<{                // present only on errors
        type_: &'static str,       // error_code
        message: String,
    }>,
}
```

  Error responses log at `info!`, successes at `debug!`. `severity` and
  `category` are populated from `AppErrorKind` on error responses.

- **Failure handling:** `log_request` returns `()` (not `Result`). Any internal
  error (serialization, etc.) is caught and logged as `error!("Failed to log
  request: ...")` but never propagated. **Logging is best-effort and cannot fail
  an HTTP response.**

`client_ip` and `user_agent` from `RequestContext` are included in the log line
(used for security audit and rate-limit debugging).

### 4. Timestamp/duration capture

Folded into `RequestContext.start_time: Instant` (set when `request_context`
fires). `mw_map_response` computes `duration_ms` as
`(now - start_time).as_secs_f64() * 1000.0`. No separate `ReqStamp` type — this
collapses nexra's two-ID/two-timestamp design into one `RequestId` + one
`start_time`.

### 5. Error severity/category (`error.rs`)

Extend klynt's existing `AppErrorKind` (6 variants: `NotFound`, `BadRequest`,
`Conflict`, `Unauthorized`, `RateLimited`, `Internal`) with:

```rust
pub enum ErrorSeverity { Low, Medium, High, Critical }
pub enum ErrorCategory { Authentication, Authorization, Validation, Infrastructure }

impl AppErrorKind {
    pub fn severity(&self) -> ErrorSeverity;
    pub fn category(&self) -> ErrorCategory;
    pub fn error_code(&self) -> &'static str;       // "NOT_FOUND", "BAD_REQUEST", etc.
    pub fn retry_after_seconds(&self) -> Option<u32>; // None for all current variants
}
```

Classification:

| `AppErrorKind` | Severity | Category | `error_code()` |
|---|---|---|---|
| `NotFound` | Low | Validation | `NOT_FOUND` |
| `BadRequest(_)` | Low | Validation | `BAD_REQUEST` |
| `Conflict(_)` | Low | Validation | `CONFLICT` |
| `Unauthorized` | Low | Authentication | `AUTHENTICATION_REQUIRED` |
| `RateLimited` | Medium | Authorization | `RATE_LIMITED` |
| `Internal(_)` | High | Infrastructure | `INTERNAL_ERROR` |

`AppError::IntoResponse` is updated to:
- **No logging** (moved to `mw_map_response` to avoid duplicate logging — see
  finding #9 from spec review). `IntoResponse` only: sanitizes `Internal`
  details, builds the status code, and **inserts `AppError` into
  `response.extensions_mut()`** so `mw_map_response` can read it.
- All request-level logging (including severity-driven levels) happens **once**
  in `mw_map_response` via `logging::log_request`.

`retry_after_seconds()` returns `None` for all current variants; it is a hook
for a future rate-limit `Retry-After` header.

**`ApiErrorBody` fate:** The existing `ApiErrorBody { code, message, request_id }`
struct (currently the error response body produced by `AppError::IntoResponse`)
is superseded by the envelope's `error` field (`ApiErrorPayload`). It is removed;
`AppError::IntoResponse` still runs (inserting `AppError` into response
extensions), but its response body is discarded and rebuilt by `mw_map_response`
as the envelope's `error` payload.

## Data flow

```
Request arrives
  → CORS (answers OPTIONS preflight directly — NOT enveloped)
  → Timeout (if fires → 408 — NOT enveloped; infrastructure signal)
  → Compression → TraceLayer (opens span)
    ├─ Health router: raw handler → raw response (NOT enveloped, NOT logged)
    └─ API router:
       → request_context middleware:
           build RequestContext (request_id, trace_id, client_ip, user_agent, start_time)
           insert RequestId + RequestContext into extensions
           record request_id/trace_id on Span::current()
           info!("Request started")
           scope rest of request in task_local!(RequestContext)
         → rate_limit → ctx_resolve (resolve Ctx from Bearer token)
           → [ctx_require on protected routes]
             → handler: returns Result<Json<T>, AppError>
               (on error: AppError::IntoResponse inserts AppError into
                response extensions — NO logging here)
         ← mw_map_response:
             read RequestId + RequestContext from extensions
             content-type guard (skip non-JSON / 204)
             body-size guard (skip if > MAX_ENVELOPE_BODY_SIZE)
             classify response (success / AppError / unknown)
             build ApiResponse envelope (with duration_ms)
             preserve original response headers
             log_request(LogEntry) — single, centralized; errors swallowed
             return (status, headers + Json(envelope))
  ← TraceLayer (closes span) ← Compression ← Timeout ← CORS
Response sent to client
```

## Error handling

- `AppError` remains the single error type. `mw_map_response` reads it from
  response extensions (placed there by `AppError::IntoResponse`) and maps it to
  the `error` field of the envelope.
- **All logging is centralized in `mw_map_response`** — `AppError::IntoResponse`
  does not log (avoids duplicate logging). Severity-driven log levels are
  applied in `log_request` based on `AppErrorKind::severity()`.
- Unknown/non-AppError error responses (e.g. a handler returning a bare status)
  are wrapped as `{type: "UNKNOWN_ERROR", code: <status>, message: "An
  unexpected error occurred"}` — no internal leakage.
- `RequestId`/`RequestContext` absence is handled gracefully: `mw_map_response`
  generates a fallback Uuid if `RequestId` is missing (should not happen in
  normal operation since `request_context` runs globally).
- **`log_request` failures are swallowed** — logged internally as `error!`, never
  propagated to fail the HTTP response. Logging is best-effort.

## Privacy & data governance

The logging module captures request/response metadata. For an education platform
targeting OWASP ASVS, the following controls apply:

- **Data minimization:** `LOG_BODIES` and `LOG_SUCCESS` default to `false` in
  **all** environments. Bodies are only logged when an operator explicitly opts
  in for debugging.
- **Sanitization:** even when `LOG_BODIES=true`, sensitive fields (passwords,
  tokens, email, phone, date of birth, etc.) are recursively redacted before
  logging. Query-string secrets are also redacted.
- **User IDs:** `user_id` is logged as a UUID pseudonym (not email/name). This
  is necessary for request correlation and does not constitute PII on its own.
- **Client IP:** logged for security audit and rate-limit debugging. This is
  operational metadata, not PII under typical education-platform definitions.
  If future regulations classify it as PII, it can be disabled via config.
- **Retention:** log retention is governed by the deployment's log infrastructure
  (e.g. Loki, CloudWatch), not by this application. The recommended retention is
  30 days for application logs. This spec does not add a retention mechanism;
  it relies on existing infrastructure policy.
- **Access:** access to logs follows existing deployment RBAC. No new access
  control is introduced by this spec.

## Dependencies

| Dependency | Type | Owner | Notes |
|---|---|---|---|
| Frontend Axios interceptor update | Cross-team | Frontend | Must ship together with the backend envelope change. Since neither side has released yet, this is a coordinated ship, not a blocking deploy with a flag fallback. |
| `trusted_proxies` config in deployment | Operational | DevOps | Set when behind a reverse proxy. Defaults to empty (socket IP only, no header trust). |

## Testing

### Breaking changes to existing tests

Integration tests in `crates/klynt-server/tests/` that read top-level JSON
fields must be updated to read under `data` (success) or `error` (error):
- `tests/users.rs` — `json["name"]` → `json["data"]["name"]`, etc. (~8 sites)
- `tests/auth.rs` — `json["user_id"]` → `json["data"]["user_id"]`, etc. (~4 sites)
- `tests/health_check.rs` — **unchanged** (health routes are NOT enveloped)
- Error-body assertions: `json["code"]`/`json["message"]` →
  `json["error"]["type"]`/`json["error"]["message"]`

### New tests

- `response.rs` — `ApiResponse::success`/`error` serialization; `mw_map_response`
  wrapping for success path, AppError path, unknown-error path; **content-type
  guard** (non-JSON passthrough); **body-size cap** (oversized passthrough);
  **header preservation** (original headers survive).
- `request_context.rs` — `extract_client_ip` from `x-forwarded-for` with
  **trusted-proxy validation** (untrusted source ignored), fallback to socket;
  `RequestContext::from_headers` reads `x-request-id`/`x-trace-id`/`user-agent`.
- `logging.rs` — `sanitize_value` redacts all sensitive fields including email
  and date_of_birth; truncation replaces oversized bodies; **log_request failure
  is swallowed** (does not propagate).
- `error.rs` — `severity()`/`category()`/`error_code()` for all 6 variants.
- **No duplicate logging test** — verify a single error request produces exactly
  one log entry (not two).
- Integration — full envelope on `POST /users` including `meta.duration_ms`;
  **health endpoints return raw (non-enveloped) responses**.
- Integration — **timeout >30s** → 408 response is NOT enveloped (infrastructure
  exemption documented).

### Definition of Done

- [ ] `just check` passes (fmt-check, clippy, typecheck-equivalent).
- [ ] `just test-coverage` passes (Rust ≥ 84%).
- [ ] No new compiler, Clippy, or Biome warnings.
- [ ] New behavior covered by tests; breaking test changes updated.
- [ ] No duplicate logging (single log line per request).
- [ ] ADR written for the response-envelope decision (`docs/adr/`).
- [ ] No new dependencies added (all functionality uses existing `uuid`,
      `chrono`, `serde_json`, `tracing`, `axum`, `tower-http`).
- [ ] `openapi.yaml` updated to reflect the new envelope response schemas.
- [ ] `.env.example` updated with `LOG_BODIES`,
      `LOG_SUCCESS`, `MAX_BODY_SIZE`, `MAX_ENVELOPE_BODY_SIZE`,
      `trusted_proxies`.

## What is deliberately NOT ported (YAGNI)

- nexra's 24 irrelevant `Error` variants (CircuitBreakerOpen,
  ServiceDiscoveryFailed, NoHealthyInstances, MessageQueue, Servic,
  RedisConnectionFailed, DatabasePoolExhausted, etc.) — these are
  gateway/microservice concerns; klynt is a clean-architecture monolith.
- `tower-cookies` dependency — klynt uses Bearer tokens.
- `ulid` + `time` crates — klynt uses `uuid` + `chrono`.
- nexra's `AppState` / `Ctx(i64)` — klynt has its own.
- nexra's `metrics` / Prometheus module — out of scope (future task).
- nexra's RPC route exemption — klynt has no RPC.

## Out of scope (follow-up tasks)

- Frontend Axios client interceptor update to unwrap the envelope
  (`response.data.data` / `response.data.error`). Tracked as a blocking
  dependency above; implementation is frontend-side.
- Prometheus metrics middleware (nexra's `metrics_middleware`).
- `Retry-After` header emission when rate-limit retry values become non-None.
