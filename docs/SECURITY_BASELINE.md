# Klynt Security & Quality Baseline

## Scope

- **Backend:** Rust + Axum
- **Frontend:** React.js + Vite
- **Phase:** Foundation only — no auth, no product features, no production PII yet.
- **Target:** OWASP ASVS Level 1 now; Level 2 before handling PII, grades, or payments.

## Threat Model

| Asset | Threat (STRIDE) | Foundation Mitigation |
|---|---|---|
| User accounts / future PII | Spoofing, Information Disclosure | Secure headers, HTTPS, env-safe secrets, no internal errors leaked |
| API requests | Tampering, Injection | Input validation layer, parameterized DB queries when DB added |
| Grades / admin actions (future) | Repudiation, Elevation | Audit-log hook point, auth extractor shape, RBAC seam |
| API availability | Denial of Service | Request size limits, timeout layer |
| Source code / secrets | Information Disclosure | Secret scanning, `.env` ignored, `.env.example` committed |
| Dependencies | Vulnerable Components | `cargo audit` + `npm audit` in CI |

## Implemented Now

- [x] No secrets in source control. `.env`, `.env.local`, `*.pem`, `*.key` in `.gitignore`. Commit only `.env.example` with placeholder values.
- [x] Dependency auditing in CI. `cargo audit` for Rust; `npm audit` for Node.
- [x] Lockfiles committed. `Cargo.lock` and `package-lock.json` pinned and committed. CI installs with `--locked` / `npm ci`.
- [x] Environment validation at startup. Backend fails fast if config cannot be loaded.
- [x] CORS: configured via environment, defaults to localhost only.
- [x] Security headers and request compression via `tower-http`.
- [x] Request timeout via `tower-http` `TimeoutLayer`.
- [x] Centralized error handling without exposing internals.
- [x] Structured logging with `tracing`.
- [x] Request ID propagation via `tower-http` `RequestId` layer.
- [x] Auth readiness: state and extractor shape can be extended later.

## Deferred

- Real authentication and session management
- RBAC and resource-level authorization
- Audit logging for sensitive actions
- Database encryption at rest
- Content Security Policy refinement
- Web Application Firewall (WAF) and DDoS protection
- Field-level encryption for sensitive PII

## Quality Gates

- `cargo fmt --check` and `cargo clippy -- -D warnings`
- `tsc --noEmit` and ESLint with type-aware rules
- Prettier format check
- Unit and integration tests for backend
- Component tests for frontend
- Dependency audits in CI

## References

- OWASP ASVS 4.0.3
- OWASP Top 10 2021
- `tower-http` security middleware
