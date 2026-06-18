# Klynt Education Platform — Agent Guide

This file is written for AI coding agents. It assumes no prior knowledge of the project. All statements below are based on the actual repository contents as of the last update.

## Project Overview

Klynt Education Platform is a full-stack education platform currently in its foundation phase. It consists of:

- **Backend**: Rust HTTP API built with Axum and Tokio.
- **Frontend**: React single-page application built with Vite and TypeScript.

The repository is a root-level monorepo with `backend/` and `frontend/` directories. The project is intentionally minimal right now: it exposes health endpoints, has a basic React Router UI, and is structured for future features (auth, courses, lessons, assignments, analytics, payments). No database, no real authentication, and no production PII handling exist yet.

## Technology Stack

### Backend

- **Language**: Rust (stable toolchain, see `rust-toolchain.toml`)
- **Framework**: Axum 0.8
- **Runtime**: Tokio 1
- **Middleware**: tower-http (CORS, trace, compression, timeout, request ID)
- **Configuration**: `config` + `dotenvy`
- **Logging**: `tracing` with `tracing-subscriber` (JSON output)
- **Serialization**: `serde` / `serde_json`
- **Errors**: `thiserror` + `anyhow`
- **Validation**: `validator`
- **IDs / Time**: `uuid`, `chrono`

### Frontend

- **Framework**: React 19
- **Build Tool**: Vite 8
- **Language**: TypeScript 6.0
- **Styling**: Tailwind CSS 4
- **Routing**: React Router 7
- **Server State**: TanStack Query (React Query) 5
- **Forms**: React Hook Form 7
- **Validation**: Zod 4
- **HTTP Client**: Axios 1
- **Lint/Format**: Biome 1.9
- **Unit Tests**: Vitest 4 + jsdom + Testing Library
- **E2E Tests**: Playwright 1.54
- **Git Hooks**: Lefthook 2

### Repository Tooling

- **Task Runner**: `just`
- **Git Hooks**: `lefthook`
- **CI/CD**: GitHub Actions
- **Dependency Updates**: Dependabot

## Repository Structure

```
.
├── backend/                 # Rust API workspace
│   ├── Cargo.toml           # Workspace manifest
│   ├── rustfmt.toml
│   ├── config/
│   │   └── default.toml     # Default non-secret config
│   ├── crates/              # Workspace crates
│   │   ├── klynt-domain/    # Domain entities, errors, ports/traits, config types
│   │   ├── klynt-application/ # Use cases and orchestration
│   │   ├── klynt-infrastructure/ # Concrete adapters (config loader, in-memory repos)
│   │   ├── klynt-api/       # HTTP handlers, routing, DTOs, error mapping
│   │   └── klynt-server/    # Binary entrypoint, telemetry, dependency wiring
│   └── Cargo.lock
├── frontend/                # React SPA
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   ├── biome.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── env.d.ts
│       ├── app/             # Providers, layouts, error boundaries
│       │   ├── providers/
│       │   ├── layout/
│       │   └── error-boundary/
│       ├── components/
│       │   └── ui/          # Design-system primitives (e.g. Button)
│       ├── features/        # Business domains (currently auth types only)
│       ├── lib/             # API client, query client, utilities
│       ├── routes/          # React Router route tree
│       └── test/            # Test utilities and setup
├── docs/                    # Project documentation and ADRs
│   ├── ARCHITECTURE.md
│   ├── ONBOARDING.md
│   ├── CI_CD_GUIDE.md
│   ├── SECURITY_BASELINE.md
│   ├── VALIDATION_REPORT.md
│   └── adr/
├── .github/                 # GitHub Actions workflows and templates
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── audit.yml
│   │   ├── deploy-staging.yml
│   │   └── deploy-production.yml
│   ├── dependabot.yml
│   ├── HOOKS.md
│   └── pull_request_template.md
├── justfile                 # Task runner commands
├── lefthook.yml             # Git hooks configuration
├── rust-toolchain.toml      # Rust toolchain specification
├── .nvmrc                   # Node.js version (24)
├── .editorconfig
├── .env.example             # Environment variable template
└── .gitignore
```

## Development Environment

### Prerequisites

- Rust (latest stable) via rustup
- Node.js 24+ (use `.nvmrc`)
- `just`: `cargo install just`
- `lefthook`: `cargo install lefthook`

### Initial Setup

```bash
git clone <repo-url> && cd klynt-edu
just setup          # Installs Rust components, cargo-watch, and npm deps
cp .env.example .env
just dev            # Runs backend + frontend together
```

### Default Local URLs

- Frontend: http://localhost:5174
- Backend health check: http://localhost:3001/api/v1/health/live

## Build and Test Commands

All common tasks are exposed through `just`. Run `just` or `just --list` to see available commands.

| Command | Description |
|---------|-------------|
| `just dev` | Run backend + frontend together with hot reload |
| `just dev-backend` | Run backend only with `cargo watch` |
| `just dev-frontend` | Run frontend dev server only |
| `just test` | Run backend `cargo test` and frontend `npm run test` |
| `just fmt` | Format all code (Rust + TypeScript) |
| `just fmt-check` | Check formatting without mutating |
| `just lint` | Run clippy and Biome lint |
| `just typecheck` | Type-check the frontend |
| `just build` | Build production artifacts (frontend + backend release) |
| `just check` | Fast pre-push gate: fmt-check, lint, typecheck |

### Frontend-Specific Commands

Run from `frontend/`:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build production bundle |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run lint` | Run Biome lint |
| `npm run lint:fix` | Auto-fix Biome lint issues |
| `npm run format` | Format with Biome |
| `npm run format:check` | Check Biome formatting |
| `npm run check` | Run Biome check (lint + format) |

### Backend-Specific Commands

Run from `backend/`:

| Command | Description |
|---------|-------------|
| `cargo run --bin klynt-server` | Run the API |
| `cargo watch -x 'run --bin klynt-server'` | Run with hot reload (requires `cargo-watch`) |
| `cargo test --workspace --all-features` | Run unit and integration tests |
| `cargo fmt --all` | Format Rust code |
| `cargo clippy --workspace --all-targets --all-features -- -D warnings` | Run Clippy |
| `cargo build --release --bin klynt-server` | Build release binary |

## Code Style Guidelines

### General

- Line endings: LF
- Charset: UTF-8
- Trim trailing whitespace
- Insert final newline
- See `.editorconfig` for base rules

### Rust

- Edition: 2021
- Indent: 4 spaces
- Max width: 100 (see `backend/rustfmt.toml`)
- All Clippy warnings are treated as errors (`-D warnings`)
- Use `cargo fmt` and `cargo clippy` before pushing

### TypeScript / Frontend

- Indent: 2 spaces
- Line width: 100
- Quotes: double
- Semicolons: always
- Trailing commas: ES5
- Import organization enabled in Biome
- Strict TypeScript enabled
- `noUnusedLocals` and `noUnusedParameters` are errors
- Avoid `any` (Biome warns on `noExplicitAny`)
- `useImportType` is disabled

### VS Code

Recommended extensions are in `.vscode/extensions.json`:

- rust-analyzer
- Biome
- Tailwind CSS IntelliSense
- Even Better TOML
- EditorConfig

`.vscode/settings.json` configures format-on-save and sets Biome as the default formatter for frontend files and rust-analyzer for Rust. rust-analyzer runs Clippy with `-D warnings`.

## Testing Instructions

### Backend Tests

- Unit tests live next to source code inside each crate.
- Integration tests live in `crates/klynt-server/tests/` (full-stack HTTP) and `crates/klynt-infrastructure/tests/` (adapter conformance).
- Integration tests use `tower::ServiceExt::oneshot` to test the Axum router in-process.
- Run: `cd backend && cargo test --workspace --all-features`
- Current integration tests cover `/api/v1/health/live`, `/api/v1/health/ready`, and `POST /api/v1/users`.

### Frontend Tests

- Unit/component tests: Vitest + jsdom + Testing Library.
- Test setup: `frontend/src/test/setup.ts`
- Custom render helper: `frontend/src/test/render.tsx` (wraps with QueryClientProvider and BrowserRouter)
- Run: `cd frontend && npm run test`
- E2E tests: Playwright (configured in `playwright.config.ts`). No E2E tests exist yet.

### Test Philosophy

The project follows a test-driven posture: add tests for new logic, bug fixes, and behavior changes. Currently the foundation has minimal tests because the feature surface is minimal.

## Git Workflow

- `main`: production-ready code
- `dev`: integration branch
- Feature branches: `feature/*`, `fix/*`, `chore/*`

Workflow:

1. Create a feature branch from `dev`.
2. Make changes.
3. Run `just check` before pushing.
4. Open a pull request to `dev`.
5. After review, merge to `dev`.
6. Releases are promoted from `dev` to `main` via pull request.

### Git Hooks

This repo uses Lefthook. Hooks are installed automatically when running `npm install` in `frontend/` via the `prepare` script. Reinstall manually with `cd frontend && npx lefthook install`.

**Pre-commit** (fast, staged-only, parallel):
- `cargo fmt --all -- --check` for `**/*.rs`
- `biome check --error-on-warnings` for staged frontend files

**Pre-push** (full local CI gate, skips lanes when directory did not change):
- Frontend typecheck
- Frontend tests
- Frontend production build
- Backend format check
- Backend clippy
- Backend tests

Never use `--no-verify`.

## Environment Configuration

Environment variables are loaded from `.env` via `dotenvy` at backend startup. The backend config loader merges sources in this order (later overrides earlier):

1. `backend/config/default.toml`
2. `backend/config/local.toml` (ignored by git)
3. Environment variables prefixed with `KLYNT_` (nested keys use `__` separator)

### Required Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Current variables in `.env.example`:

```
# Backend
RUST_LOG=debug
KLYNT_API_HOST=127.0.0.1
KLYNT_API_PORT=3001
KLYNT_API_ALLOWED_ORIGINS=http://localhost:5174
# KLYNT_RATE_LIMITER__ENABLED=true
# KLYNT_RATE_LIMITER__MAX_REQUESTS=5
# KLYNT_RATE_LIMITER__WINDOW_SECONDS=900

# Frontend
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_APP_NAME=Klynt
```

- `KLYNT_API_ALLOWED_ORIGINS` is a comma-separated list of CORS origins.
- `KLYNT_RATE_LIMITER__ENABLED` toggles request rate limiting (default `false` in `config/default.toml` for local development).
- `VITE_API_BASE_URL` is the base URL the frontend Axios client uses.
- In development, Vite proxies `/api/*` to `http://localhost:3001` (see `frontend/vite.config.ts`).

## Backend Architecture

The backend is a Cargo workspace with five focused crates. Dependency direction is enforced by the compiler:

- `klynt-domain` — domain entities, value objects, domain errors, repository ports, unit-of-work trait, session store port, rate-limiter/idempotency/health-check ports, request context (`Ctx`), and config value types. Has no dependency on Axum, HTTP, SQL, or external frameworks.
- `klynt-application` — use cases and orchestration (`UserService`, `AuthService`, `UserRequestGate`). Depends only on `klynt-domain`.
- `klynt-infrastructure` — concrete adapters: in-memory repositories, in-memory unit of work with snapshot rollback, in-memory rate limiter, in-memory idempotency store, in-memory session store, health-check implementations, and config loading. Depends only on `klynt-domain`.
- `klynt-api` — HTTP handlers, routing, request/response DTOs, `AppError` + `IntoResponse`, `AppState`, auth/rate-limit middleware, and middleware wiring. Depends on `klynt-application` and `klynt-domain`.
- `klynt-server` — binary entrypoint, telemetry initialization, and dependency wiring. Depends on all other backend crates.

Dependency graph: `klynt-server` → `klynt-api` → `klynt-application` → `klynt-domain`, and `klynt-infrastructure` → `klynt-domain`.

`klynt-server::composition` is the single composition root. It exposes `build_app(config)` for both production and integration tests, and `build_request_gate(config)` for the Axum state. Keeping wiring here prevents the application layer from depending on infrastructure.

### Current Middleware Stack

Applied globally in `klynt-api::startup::build_router`:

- `propagate_request_id` — reads `x-request-id` or generates a UUID, attaches it to request extensions, and echoes it in response headers
- `rate_limit` — rejects requests when the client IP exceeds the configured rate limit
- `ctx_resolve` — resolves `Ctx` from the `Authorization: Bearer <token>` header and stores it in request extensions (guest context when missing/invalid)
- `TraceLayer` — request/response logging
- `CompressionLayer` — gzip compression
- `TimeoutLayer` — 30-second request timeout
- `CorsLayer` — configured from `allowed_origins`; no permissive `Any` fallback in production

Protected routes additionally use `ctx_require`, which rejects guest contexts with 401.

### Error Handling

`klynt_domain::errors::DomainError` is the domain error enum. `klynt_api::error::AppError` wraps an `AppErrorKind` plus the request ID and maps domain errors to HTTP responses:

- `NotFound` → 404
- `BadRequest(String)` → 400
- `Conflict(String)` → 409
- `Unauthorized` → 401
- `RateLimited` → 429
- `Validation(String)` → 422
- `Internal(anyhow::Error)` → 500 (internal details are logged, not exposed)

All errors serialize to `{ code, message, request_id }` JSON. Handlers attach the real request ID via `.with_request_id(...)`; the `From<DomainError>` impl defaults to a nil UUID for the rare case where `?` is used without one.

### State

`klynt_api::state::AppState` holds the Axum state: `Arc<AppConfig>`, `Arc<UserService>`, `Arc<UserRequestGate>`, `Arc<AuthService>`, `Arc<dyn SessionStore>`, `Arc<dyn RateLimiter>`, and a list of `Arc<dyn HealthCheck>` dependencies. It is constructed by `klynt_server::composition::build_app` and passed to handlers via Axum's state extractor.

### Routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/health/live` | public | Liveness probe |
| `GET` | `/api/v1/health/ready` | public | Readiness probe (runs all `HealthCheck` adapters) |
| `POST` | `/api/v1/sessions` | public | Login, returns bearer token |
| `POST` | `/api/v1/users` | public | Register a new user |
| `GET` | `/api/v1/users/me` | required | Return the authenticated user |

## Frontend Architecture

Feature-based Vite SPA:

- `routes/` — React Router route tree (`createBrowserRouter`)
- `app/` — providers, root layout, error boundary
- `features/` — business domains (e.g. `features/auth/`)
- `components/ui/` — design-system primitives
- `lib/` — API client, TanStack Query client, utilities (`cn` helper)

### Routing

Route paths are centralized in `routes/route-paths.ts`:

- `/` — home
- `/dashboard` — dashboard placeholder
- `/login` — login placeholder

### Data Fetching

- Use TanStack Query for server state.
- Use `apiClient` (Axios) for raw HTTP calls.
- Query defaults: 5-minute stale time, 1 retry, no refetch on window focus.

### Forms and Validation

- Use React Hook Form for forms.
- Use Zod for schema validation.
- Validation messages must use the `validation` i18n namespace so they can be translated.

### Internationalization (i18n)

- Supported languages: `en`, `vi`, `cn`.
- Namespaces: `common`, `auth`, `errors`, `ui`, `validation`.
- Use `useTranslation('namespace')` and the `t('key')` function for all user-facing strings.
- For JSX with embedded links or formatting, use `<Trans ns="namespace" i18nKey="key" components={{ ... }} />`.
- Add new keys to the English source file first, then mirror them in `vi` and `cn`.
- Tests use `frontend/src/core/i18n/test-config.ts` with inline resources.

### Performance

- Web Vitals are reported from `src/core/performance/web-vitals.ts`.
- Analyze the bundle with `npm run analyze`.
- Use the `Image` component in `src/core/ui/image.tsx` for all images to enforce explicit dimensions and lazy loading.
- Keep fonts as a system stack with `font-display: swap`.
- React Router links support `prefetch="intent"` for route-level code preloading.

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

- `ci.yml` — format, lint, typecheck, test, build on pushes/PRs to `dev` and `main`
- `audit.yml` — weekly dependency audit (`cargo audit` and `npm audit`)
- `deploy-staging.yml` — placeholder, triggers on `dev` pushes
- `deploy-production.yml` — placeholder, triggers on `main` pushes

### Path Filtering

CI uses `dorny/paths-filter` to skip backend checks when only frontend files changed, and vice versa. Both stacks still depend on a single `ci-status` aggregate job for branch protection.

### CI Parity

CI runs the same checks as local pre-push hooks, with `--locked` / `npm ci` for reproducible installs.

## Security Considerations

The project targets OWASP ASVS Level 1 in its current foundation phase and Level 2 before handling PII, grades, or payments.

### Implemented

- No secrets in source control (`.env`, `*.pem`, `*.key` ignored)
- Lockfiles committed (`Cargo.lock`, `package-lock.json`)
- Dependency auditing in CI (`cargo audit`, `npm audit`)
- Environment validation at startup (backend fails fast on bad config)
- CORS configured via environment (defaults to localhost)
- Security headers and compression via `tower-http`
- Request timeout via `tower-http`
- Centralized error handling without leaking internal details
- Structured JSON logging with `tracing`
- Request ID propagation

### Deferred / Not Yet Implemented

- Real authentication and session management
- RBAC and resource-level authorization
- Audit logging
- Database integration
- Content Security Policy refinement
- WAF / DDoS protection
- Field-level encryption for sensitive PII
- Local secret scanning (e.g. `gitleaks`)

### Security Checklist for PRs

The pull request template asks contributors to confirm:

- No secrets or credentials added
- New dependencies reviewed
- New environment variables documented in `.env.example`
- Input validation added for new endpoints/forms

## Important Notes for Agents

- This is a foundation scaffold. The `klynt-application`, `klynt-domain`, and `klynt-infrastructure` crates contain minimal real logic (user creation, in-memory adapters) and are structured for future features.
- No database is connected yet. The readiness health check does not verify a real dependency.
- Authentication exists only as a `features/auth/api/types.ts` placeholder (`User`, `LoginInput`).
- Deployment workflows are placeholders; do not assume a deployed environment.
- Always run `just check` before claiming work is complete.
- If you add a new environment variable, document it in `.env.example` and update this file if it changes agent workflow.
- Follow the existing Clean Architecture module boundaries in the backend and feature-based organization in the frontend.
- Do not install new global tools without confirming they are needed; prefer adding them via `Cargo.toml` or `package.json`.

## Documentation References

- `README.md` — quick start and command summary
- `CONTRIBUTING.md` — branch workflow and code standards
- `docs/ONBOARDING.md` — setup and troubleshooting
- `docs/ARCHITECTURE.md` — architecture overview
- `docs/CI_CD_GUIDE.md` — CI/CD details
- `docs/SECURITY_BASELINE.md` — threat model and security gates
- `docs/VALIDATION_REPORT.md` — what was implemented and validated
- `docs/adr/` — architecture decision records
