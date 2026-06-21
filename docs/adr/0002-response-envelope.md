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
