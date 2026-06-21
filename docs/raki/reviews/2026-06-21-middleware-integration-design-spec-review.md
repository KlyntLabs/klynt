# Spec Review: Middleware Integration Design

**Spec:** `docs/superpowers/specs/2026-06-20-middleware-integration-design.md`  
**Review date:** 2026-06-21  
**Reviewer:** reviewing-specs skill, **high effort**  
**Effort rationale:** touches authentication/Bearer tokens, public API response shape, and infrastructure middleware.

## Verdict: NO-GO

The spec cannot proceed to planning without revision. It contains **5 CRITICAL** and **15 MAJOR** verified findings, including internal contradictions in the middleware stack, production-probe breakage, a PII/compliance gap, and missing product fundamentals (user stories, rollback plan).

## Summary

The spec proposes integrating four middleware capabilities (unified response envelope, structured logging, request timing, error severity classification) from `nexra-core` patterns into the `klynt-api` layer. The intent is sound, but the document:

- Lacks user stories, success metrics, and a rollback plan.
- Contradicts itself on whether every response is enveloped (timeout 408s and CORS preflights bypass the envelope layer).
- Would break `/api/v1/health/*` probe consumers by enveloping health responses.
- Introduces PII logging without retention, access-control, or encryption controls.
- Adds `trace_id` and client-IP capture beyond the four stated capabilities without consumers.
- Omits critical failure-mode handling (logging failures, large response bodies, header preservation, task-local propagation across spawn).

## Methodology

- **Phase 0:** Read spec and `.memory.md`.
- **Phase 1:** Dispatched 6 specialist finder agents concurrently (product, architecture, edge-case, scope/YAGNI, security/privacy, testability), cap 4 candidates each.
- **Phase 2:** Deduplicated and verified candidates with `spec-finding-verifier`; dropped one refuted finding.
- **Phase 3:** Ran a holistic architecture sweep; verified 4 additional findings.
- **Phase 4:** Ranked top 20 verified findings and derived verdict.

## Ranked findings

### CRITICAL

1. **No user stories**
   - **Quote:** "The klynt-edu backend currently returns raw `Json<T>` for successes and a flat `{code, message, request_id}` body for errors. This is inconsistent for frontend consumers and lacks: A single predictable response shape..."
   - **Issue:** The spec lists technical gaps but never identifies beneficiaries or outcomes in user-story form.
   - **Fix:** Add 2–3 user stories, e.g. "As a frontend engineer, I want every API response to use the same envelope shape so that I can remove special-case success/error parsers."

2. **Health endpoints will be enveloped, breaking load-balancer/K8s probes**
   - **Quote:** "All routes live under `/api/v1`; there are no RPC, metrics, static-file, or WebSocket routes, so **every** response is enveloped uniformly — no route exemptions..."
   - **Issue:** `/api/v1/health/live` and `/api/v1/health/ready` are consumed by probes that expect `{status: "ok"}` or just HTTP 200. Enveloping them breaks existing infrastructure assertions.
   - **Fix:** Exempt `/api/v1/health/*` (and future `/metrics`) from the envelope, or mount a dedicated non-enveloped health router outside the response-mapping layer.

3. **TimeoutLayer sits above the envelope layer, so 408s bypass it**
   - **Quote:** "TimeoutLayer (30s → 408) ... map_response(mw_map_response) ← NEW (innermost response handler) ... Unknown/non-AppError error responses (e.g. timeout 408 ...) are wrapped as `{type: "UNKNOWN_ERROR", ...}`"
   - **Issue:** Because `TimeoutLayer` is outermost, it aborts the inner service and returns 408 before `mw_map_response` can wrap it. This contradicts the error-handling claim.
   - **Fix:** Move `TimeoutLayer` below `mw_map_response`, or add an outer envelope layer for responses produced by outer middleware. Add an integration test for a >30s handler.

4. **Logs collect PII but spec has no retention/access/encryption policy**
   - **Quote:** "One structured log line per request — `RequestLogLine { id, timestamp, duration_ms, request: {method, path, query, body, user_id}, response: {status, body, size}, error: {type, message, data} }` serialized to JSON."
   - **Issue:** The spec captures user_id, bodies, and error payloads but never addresses log retention, access control, encryption at rest/transit, or audit of log reads. For an education platform this is a compliance/PII exposure.
   - **Fix:** Add a Privacy & Data Governance section covering retention, encryption, role-based access, and audit logging. Default to minimizing logged fields.

5. **No rollback/failure-recovery plan**
   - **Quote:** (omission — no rollback section exists)
   - **Issue:** The spec describes failure modes but never states rollback triggers, a canary/feature-flag strategy, or a procedure for reverting if the envelope breaks consumers or probes.
   - **Fix:** Add a Rollout & Rollback section with feature-flag/canary plan, rollback criteria, and a communication plan for breaking API consumers.

### MAJOR

6. **No success metrics**
   - **Quote:** "Definition of Done: `just check` passes; `just test-coverage` passes; ..."
   - **Issue:** The DoD lists quality gates but no measurable targets for the claimed outcomes (envelope coverage, log completeness, frontend parser reduction).
   - **Fix:** Add a Success Metrics section, e.g. "100% of API responses use the unified envelope" and "100% of requests emit a structured log line with request_id."

7. **Frontend interceptor dependency acknowledged but not tracked**
   - **Quote:** "Frontend Axios client interceptor update to unwrap the envelope (`response.data.data` / `response.data.error`). Tracked separately; this spec is backend-only."
   - **Issue:** The frontend change is a hard cross-team dependency for safe rollout, yet it is a footnote rather than a tracked dependency with owner/timeline/blocking relationship.
   - **Fix:** Add a Dependencies section naming the interceptor update, owner, target completion, and whether backend deploy is blocked on it.

8. **`extract_client_ip` trusts client proxy headers without a trusted-proxy list**
   - **Quote:** "checks `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`, `x-cluster-client-ip`, `x-forwarded`, `forwarded-for`, `forwarded` (first comma-separated value), falling back to the socket address."
   - **Issue:** Taking the first value of `X-Forwarded-For` or trusting `X-Real-Ip` unconditionally lets clients spoof their IP, bypassing rate limiting and poisoning audit logs.
   - **Fix:** Accept proxy headers only from configured trusted proxy CIDRs; parse `X-Forwarded-For` from rightmost-to-leftmost through the trusted chain.

9. **Duplicate logging on error responses**
   - **Quote:** "`AppError::IntoResponse` is updated to: Log at the level dictated by `severity()` ..." and "Build `ApiResponse`, log via `logging::log_request` ..."
   - **Issue:** Failed requests are logged twice with different shapes/levels, inflating volume and breaking alert aggregation.
   - **Fix:** Centralize request logging in `mw_map_response` only; limit `AppError::IntoResponse` to inserting the `AppError` extension.

10. **`mw_map_response` assumes all success bodies are JSON**
    - **Quote:** "If `parts.status.is_success()`: extract body bytes → parse as JSON → wrap as `data`."
    - **Issue:** Breaks streaming, file downloads, SSE, `204 No Content`, and non-JSON bodies, and adds memory/latency overhead.
    - **Fix:** Envelope only JSON responses (check `Content-Type` or an internal marker) and pass through non-JSON bodies unchanged.

11. **CORS preflight responses bypass the envelope**
    - **Quote:** "CorsLayer (outermost) ... every response is enveloped uniformly — no route exemptions"
    - **Issue:** `CorsLayer` answers `OPTIONS` preflights directly, so they never reach `mw_map_response`, contradicting the "every response" claim.
    - **Fix:** Explicitly exempt preflight responses and document the exemption, or restructure layer order.

12. **`log_request` failure handling undefined**
    - **Quote:** "Build `ApiResponse`, log via `logging::log_request`, return `(status, Json(envelope))`." and `pub async fn log_request(entry: LogEntry) -> Result<()>`
    - **Issue:** If `log_request` errors propagate, logging becomes a single point of failure that 500s every request.
    - **Fix:** Define that `log_request` errors are caught, emitted as internal error logs, and never fail the HTTP response. Test this path.

13. **`client_ip` and `user_agent` are captured but not consumed**
    - **Quote:** "pub client_ip: Option<String>; pub user_agent: Option<String>;"
    - **Issue:** Neither field appears in `LogEntry`/`RequestLogLine` nor the response envelope, adding dead data.
    - **Fix:** Either consume these fields in logs/auditing or remove them until a concrete requirement exists.

14. **`trace_id` propagation is scope creep beyond the four requested capabilities**
    - **Quote:** "Capabilities in scope | All four (envelope, logging, timing, error classification) | User request" and "pub trace_id: Uuid"
    - **Issue:** `trace_id`, `x-trace-id` parsing, `ResponseMeta.trace_id`, and Span recording are added despite not being one of the four capabilities.
    - **Fix:** Remove `trace_id` from `RequestContext`/`ResponseMeta` and drop `x-trace-id` handling until distributed tracing is a real requirement.

15. **`LOG_BODIES`/`LOG_SUCCESS` default to true in dev, risking PII leakage**
    - **Quote:** "Env-configurable — `LOG_BODIES` (default true in dev, false in prod), `LOG_SUCCESS` (likewise), `MAX_BODY_SIZE`."
    - **Issue:** Default logging of full bodies in dev, combined with an incomplete sensitive-field list, leaks education-related PII into developer logs.
    - **Fix:** Default both to `false` in all environments; require explicit opt-in. Expand redaction patterns and redact query-string secrets.

16. **`RequestLogLine` omits `trace_id`, `severity`, and `category`**
    - **Quote:** "`RequestLogLine { id, timestamp, duration_ms, request: {...}, response: {...}, error: {...} }`"
    - **Issue:** The central per-request log cannot support the spec's stated observability goals (trace-id propagation, severity-driven levels).
    - **Fix:** Add `trace_id`, `severity`, and `category` fields and emit at the appropriate log level.

17. **`mw_map_response` discards original response headers**
    - **Quote:** "Build `ApiResponse`, log via `logging::log_request`, return `(status, Json(envelope))`."
    - **Issue:** Rebuilding the response from only status + JSON drops `Cache-Control`, `ETag`, `Set-Cookie`, and future `Retry-After` headers.
    - **Fix:** Merge original response headers onto the enveloped response and document header preservation rules.

18. **No size limit for envelope body buffering**
    - **Quote:** "If `parts.status.is_success()`: extract body bytes → parse as JSON → wrap as `data`."
    - **Issue:** `MAX_BODY_SIZE` applies only to log truncation, not envelope construction. Large JSON responses create unbounded memory/CPU pressure.
    - **Fix:** Define a max response-body size for envelope wrapping and exempt/stream oversized responses.

19. **Big-bang breaking rollout with no compatibility mechanism**
    - **Quote:** "Envelope shape | nexra-exact `{id, status, type, data, error, meta}` | User request" and "every response is enveloped uniformly"
    - **Issue:** Global wire-format change with no versioned Accept header, query-param opt-in, or feature flag makes rollout dependent on every client updating simultaneously.
    - **Fix:** Add envelope negotiation (e.g. `Accept: application/vnd.klynt.envelope+json`) or a feature flag to enable gradual rollout and rollback.

20. **Task-local `RequestContext` does not propagate across `tokio::spawn`**
    - **Quote:** "`run_with_context(self, future) -> R` — scopes the future inside a `tokio::task_local!` ..."
    - **Issue:** Async work spawned inside a handler loses request_id/trace_id/timing, breaking severity-driven logging and tracing for that work.
    - **Fix:** Provide a context-capturing spawn helper or document the constraint; add tests.

## Dropped finding

- **Definition of Done lacks behavioral acceptance criteria** (original CRITICAL, **REFUTED**): The spec defines the cited behaviors elsewhere (wire shapes, middleware logic, tests), so the DoD gap is a section-formatting issue rather than a missing-requirements gap.

## Recommendations

1. **Revise the spec before planning.** Address the 5 CRITICAL findings first; the spec cannot be implemented safely as written.
2. **Add product framing:** user stories, success metrics, dependencies, rollout/rollback plan.
3. **Resolve envelope contradictions:** explicitly exempt health, CORS preflights, timeouts, and non-JSON bodies, or redesign layer order.
4. **Close the privacy gap:** add a data-governance section and default logging flags to off.
5. **Cut scope creep:** remove `trace_id`, `client_ip`, and `user_agent` until concrete consumers exist.
6. **Add compatibility/operability:** header preservation, body-size limits, envelope negotiation or feature flag, production runbook.

## Memory update

See `.memory.md` for durable lessons appended from this review.
