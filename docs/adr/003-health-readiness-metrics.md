# ADR-003: Health, Readiness, and Prometheus Metrics

## Status

Accepted

## Date

2026-06-22

## Context

Production deployments need liveness/readiness probes and observable request metrics. The existing `/health` endpoint is a trivial liveness check with no dependency validation.

## Decision

- Add `GET /health/live` for liveness (simple "alive" response).
- Add `GET /health/ready` returning a `HealthReport` with per-component latency for Postgres and optional Redis.
- Add `GET /metrics` returning Prometheus exposition format.
- Record `http_requests_total` and `http_request_duration_seconds` with `method`, `MatchedPath`, and `status` labels.
- Run health checks concurrently with a 2-second timeout; report generic public error messages and log details internally.
- Use `metrics-exporter-prometheus` with default features disabled to avoid unused native build dependencies.

## Alternatives Considered

### Single `/health` endpoint
- Rejected: Kubernetes and modern orchestration expect separate liveness and readiness probes.

### Push metrics
- Rejected: pull model via `/metrics` is simpler and standard for Prometheus.

## Consequences

- `/metrics` is currently public; production hardening (admin port, auth, or network policy) is required before exposing to untrusted networks.
- `MatchedPath` prevents cardinality explosion; unmatched routes use `path="unknown"`.
- New dependencies: `metrics`, `metrics-exporter-prometheus`.
