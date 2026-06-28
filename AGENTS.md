# Klynt Education Platform — Agent Guide

This file is for AI coding agents. It tells you what you need to know to work in this repo and where to find the rest.

## Agent Mindset

1. **Think before coding.** Read the task, check `docs/adr/` and `docs/ARCHITECTURE.md`, and ask if anything is unclear.
2. **Simplicity first.** Solve the problem with the minimum code. Don't add speculative abstractions.
3. **Surgical changes.** Touch only what the task requires. Match existing style. Clean up only what your change orphaned.
4. **Goal-driven execution.** Define success criteria, verify as you go, and don't claim done until checks pass.

## Project Overview

Klynt is a foundation-phase education platform:

- **Backend**: Rust HTTP API with Axum/Tokio (`backend/`)
- **Frontend**: React SPA with Vite/TypeScript/Tailwind (`frontend/`)

The backend has real Postgres repositories (users, sessions, tokens, audit), Redis (rate limiter + idempotency), email-verification/password-reset flows, bearer-token session auth, and a middleware/observability stack. The frontend is a React SPA shell.

## Technology Stack

| Layer | Tech |
|---|---|
| Backend language | Rust (stable, see `rust-toolchain.toml`) |
| Web framework | Axum 0.8, Tokio 1, tower-http |
| Frontend framework | React 19, Vite 8, TypeScript 6, React Router 7 |
| Styling | Tailwind CSS 4 |
| State/forms | TanStack Query 5, React Hook Form 7, Zod 4 |
| HTTP client | Axios 1 |
| Lint/format | Biome 1.9, rustfmt, Clippy |
| Tests | cargo nextest, Vitest 4, jsdom, Testing Library, Playwright |
| Task runner | `just` |
| Git hooks | Lefthook |
| CI/CD | GitHub Actions |
| Coverage | `cargo llvm-cov` (Rust ≥ 84%), Vitest v8 (frontend ≥ 92%) |
| Security | `gitleaks`, `semgrep`, `trivy` |

## Common Commands

Run `just` to list recipes.

| Command | Purpose |
|---|---|
| `just setup` | First-time setup |
| `just dev` | Backend + frontend with hot reload |
| `just test` | Run tests |
| `just test-coverage` | Run tests with coverage gates |
| `just check` | Fast gate: fmt-check, lint, typecheck |
| `just fmt` | Format everything |
| `just build` | Production build |
| `just secret-scan` | Run `gitleaks` locally |
| `just security-scan` | Run `semgrep` + `trivy` locally |

Frontend-only: `bun run dev`, `bun run test:coverage`, `bun run lint`, `bun run typecheck`, `bun run build`.

Backend-only: `cargo run --bin server`, `cargo nextest run --all-features`, `cargo clippy --workspace --all-targets --all-features -- -D warnings`, `cargo fmt`.

## Agent Workflow

Before changing code:

1. Read the task and related comments fully.
2. Check `docs/adr/` for architecture decisions.
3. Read `docs/ARCHITECTURE.md` for structure.
4. Read the files you'll modify and their tests.
5. Find an existing example of the same pattern.
6. For UI work, reuse `frontend/src/components/ui/` primitives.

## Code Conventions

### General

- LF line endings, UTF-8, trim trailing whitespace, final newline.
- See `.editorconfig`.

### Rust

- 4-space indent, max width 100 (`backend/rustfmt.toml`).
- Edition 2021.
- All Clippy warnings are errors (`-D warnings`).
- `unsafe_code` is forbidden at the workspace level.
- **SQLx: always use the compile-time-checked macros** (`sqlx::query!`, `query_as!`, `query_scalar!`). Never the runtime `sqlx::query(...)` / `query_as(...)` / `query_scalar(...)` API with `.bind()`. Runtime queries are only checked at runtime; macros type-check every query against the schema at `cargo build`. Enforced by the `backend-sqlx-macros` pre-commit hook and by macro compilation itself.
- After changing any query string or migration, regenerate the committed offline cache: `just sqlx-prepare`, then commit `backend/.sqlx/`. CI builds with `SQLX_OFFLINE=true` (a query with no cache entry fails the build).
- A genuine dynamic-SQL exception (e.g. `QueryBuilder`) is rare and must be marked `// allow(non-sqlx-macro)` on the offending line.
- Source files (`backend/crates/*/src/**/*.rs`) should stay under **400 lines**.
- Integration test files (`backend/crates/*/tests/**/*.rs`) may go up to **600 lines**.
- Lefthook enforces this on staged files via `backend/scripts/check-file-size.sh`.
- Axum handlers should stay thin; most logic belongs in application/domain crates.

### TypeScript / Frontend

- 2-space indent, line width 100, double quotes, semicolons, ES5 trailing commas.
- Strict TypeScript; `noUnusedLocals` and `noUnusedParameters` are errors.
- Avoid `any`. `useImportType` is disabled.
- Use `cn()` for conditional classes.

### Internationalization

- All user-facing strings use i18n namespaces (`common`, `auth`, `errors`, `ui`, `validation`).
- Add keys to `en` first, then mirror them in `vi` and `cn`.

### UI Components

- Reuse `frontend/src/components/ui/` primitives. These are shadcn/ui-style components migrated from `frontend-v2/` and adapted for Tailwind CSS v4.
- The legacy `frontend/src/core/ui/` NeoBrutalist primitives and `frontend/src/features/home/` OS desktop have been removed; see `docs/adr/0001-frontend-v2-ui-migration.md`.
- New UI must feel native to Klynt — browser-default styling is a signal that an existing primitive is missing.

### File Size

- Frontend source files (`frontend/src/**/*.{ts,tsx,js,jsx,css}`) should stay under **300 lines**.
- Lefthook enforces this on staged files via `frontend/scripts/check-file-size.sh`.
- If a file exceeds the limit, break it into smaller modules (e.g. extract hooks, helpers, sub-components) rather than raising the limit.
- Override `KLYNT_MAX_FILE_LINES` locally only for temporary testing.

## Architecture at a Glance

### Backend (Clean Architecture)

Cargo workspace with dependency direction enforced by the compiler:

- `klynt-domain` — entities, errors, ports/traits, config types. No Axum/SQL/framework deps.
- `klynt-application` — use cases (`UserService`, `AuthService`, etc.). Depends only on domain.
- `klynt-infrastructure` — concrete adapters (in-memory repos, config loading). Depends only on domain.
- `klynt-api` — HTTP handlers, DTOs, routing, middleware, error mapping.
- `klynt-server` — binary entrypoint, telemetry, composition root.

`klynt-server::composition` is the single composition root. Keep wiring there.

### Observability

- **Tracing**: `tracing` + `tracing-subscriber` with JSON output, `tracing-error::ErrorLayer` for spanbacktrace correlation, and a curated `EnvFilter` that suppresses noisy crates. `TraceLayer` uses `make_span_with` to embed `request_id` in span roots, and application services are `#[instrument]`-decorated for span trees.
- **Metrics**: Prometheus `/metrics` endpoint with `http_requests_total`, `http_request_duration_seconds`, and `active_requests`. Path normalization prevents cardinality explosion.
- **Logging**: Structured JSON request logs with PII sanitization, emitted from `mw_map_response`.
- **Health**: `/api/v1/health/live` (liveness) and `/api/v1/health/ready` (readiness with per-component latency).
- **Security headers**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and optional HSTS via `KLYNT_HSTS_ENABLED`.
- **Rate limiting**: IP-based fixed-window rate limiter with Redis TTL; `429` responses include `Retry-After`.

### Frontend (Feature-Based

- `routes/` — React Router route tree
- `app/` — providers, layout, error boundary
- `features/` — business domains
- `components/ui/` — design-system primitives
- `lib/` — API client, query client, utilities

## Testing

- Backend: unit tests next to source; integration tests in `crates/klynt-server/tests/` and `crates/klynt-infrastructure/tests/`.
- Frontend: Vitest + jsdom + Testing Library. Custom render in `frontend/src/test/render.tsx`.
- Follow a test-driven discipline: write/update tests for new logic and bug fixes. For bugs, write a failing regression test first.
- Current integration tests cover health endpoints (including per-component readiness), `POST /api/v1/users`, auth flows, metrics path normalization, security headers, and rate-limit `Retry-After`.

## Git Workflow & Quality Gates

- Branches: `main` (production), `dev` (integration), feature branches `feature/*`, `fix/*`, `chore/*`.
- Workflow: branch from `dev` → make changes → run `just check` and `just test-coverage` → PR to `dev` → merge → promote to `main`.
- Never use `--no-verify`.

### Pre-commit (Lefthook)

- `cargo fmt --check`
- Biome check on staged frontend files
- `gitleaks protect --staged`

### Pre-push (Lefthook, skips unchanged directories)

- Frontend typecheck, tests with coverage, production build
- Backend format check, Clippy, tests with coverage via nextest

### CI (`ci.yml`)

- Backend: fmt, clippy, tests with coverage, release build
- Frontend: fmt, lint, typecheck, tests with coverage, production build
- Security: `gitleaks`, `semgrep` (`p/default`), `trivy` (HIGH/CRITICAL)

## Security & Compliance

Targets OWASP ASVS Level 1 now; Level 2 before PII/grades/payments.

- No secrets in source control.
- Lockfiles committed; install with `bun install --frozen-lockfile` / `--locked`.
- CORS from environment; security headers via `tower-http`.
- Centralized errors that don't leak internals.
- Input validated at boundaries (Zod frontend, `validator` backend).

See `docs/SECURITY_BASELINE.md` for the full threat model.

## Definition of Done

Before claiming complete:

- [ ] `just check` passes.
- [ ] `just test-coverage` passes (Rust ≥ 84%, frontend ≥ 92%).
- [ ] New behavior has tests; bug fixes have regression tests.
- [ ] No new compiler, Clippy, or Biome warnings.
- [ ] i18n strings mirrored across `en`, `vi`, `cn`.
- [ ] New env vars in `.env.example`; workflow changes updated here.
- [ ] New dependencies reviewed for size, security, licensing.
- [ ] ADRs written for new dependencies, storage strategies, platforms, core abstractions, cross-cutting patterns.
- [ ] Docs updated for architecture/data model/workflow changes.
- [ ] Docker Compose validated if changed.
- [ ] No secrets/PII in source control; no new HIGH/CRITICAL SAST findings.

## Important Notes for Agents

- Foundation scaffold now uses real Postgres/Redis adapters, bearer-token session auth, and the observability stack described above.
- Deployment workflows are placeholders.
- Prefer adding tools via `Cargo.toml` or `package.json` instead of global installs.
- When modifying Docker files, validate with `docker compose config` and test `docker compose up --build` when possible.
- **Frontend coverage gate**: The 92% lines/statements, 87% functions, 73% branches threshold is enforced. New presentational code (UI primitives, marketing pages, desktop chrome) must be covered by unit/integration tests, Storybook story renders, or browser tests so the gate stays green.

## Documentation References

- `README.md` — quick start
- `CONTRIBUTING.md` — branch workflow and standards
- `docs/ONBOARDING.md` — setup and troubleshooting
- `docs/ARCHITECTURE.md` — architecture overview
- `docs/CI_CD_GUIDE.md` — CI/CD details
- `docs/SECURITY_BASELINE.md` — threat model and gates
- `docs/VALIDATION_REPORT.md` — what was implemented and validated
- `docs/adr/` — architecture decision records

## Agent skills

### Issue tracker

GitHub Issues for this repo (`KlyntLabs/klynt`), via the `gh` CLI. External PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles mapped 1:1 to label strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` (with `UBIQUITOUS_LANGUAGE.md` as a complementary glossary) and `docs/adr/`. See `docs/agents/domain.md`.
