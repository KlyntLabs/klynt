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

It's intentionally minimal right now: health endpoints, a basic React Router UI, and structure for future features. No real database or authentication exists yet.

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
| Coverage | `cargo llvm-cov` (Rust ≥ 84%), Vitest v8 (frontend ≥ 73% lines / 68% functions / 46% branches / 72% statements — temporarily lowered after the UI/marketing migration; see notes below) |
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

Frontend-only: `npm run dev`, `npm run test:coverage`, `npm run lint`, `npm run typecheck`, `npm run build`.

Backend-only: `cargo run --bin klynt-server`, `cargo nextest run --all-features`, `cargo clippy --workspace --all-targets --all-features -- -D warnings`, `cargo fmt`.

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

## Architecture at a Glance

### Backend (Clean Architecture)

Cargo workspace with dependency direction enforced by the compiler:

- `klynt-domain` — entities, errors, ports/traits, config types. No Axum/SQL/framework deps.
- `klynt-application` — use cases (`UserService`, `AuthService`, etc.). Depends only on domain.
- `klynt-infrastructure` — concrete adapters (in-memory repos, config loading). Depends only on domain.
- `klynt-api` — HTTP handlers, DTOs, routing, middleware, error mapping.
- `klynt-server` — binary entrypoint, telemetry, composition root.

`klynt-server::composition` is the single composition root. Keep wiring there.

### Frontend (Feature-Based)

- `routes/` — React Router route tree
- `app/` — providers, layout, error boundary
- `features/` — business domains
- `components/ui/` — design-system primitives
- `lib/` — API client, query client, utilities

## Testing

- Backend: unit tests next to source; integration tests in `crates/klynt-server/tests/` and `crates/klynt-infrastructure/tests/`.
- Frontend: Vitest + jsdom + Testing Library. Custom render in `frontend/src/test/render.tsx`.
- Follow a test-driven discipline: write/update tests for new logic and bug fixes. For bugs, write a failing regression test first.
- Current integration tests cover health endpoints and `POST /api/v1/users`.

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
- Lockfiles committed; install with `npm ci` / `--locked`.
- CORS from environment; security headers via `tower-http`.
- Centralized errors that don't leak internals.
- Input validated at boundaries (Zod frontend, `validator` backend).

See `docs/SECURITY_BASELINE.md` for the full threat model.

## Definition of Done

Before claiming complete:

- [ ] `just check` passes.
- [ ] `just test-coverage` passes (Rust ≥ 84%, frontend ≥ 73% lines / 68% functions / 46% branches / 72% statements).
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

- Foundation scaffold: minimal real logic, in-memory adapters, no real DB/auth.
- Postgres/Redis in Docker Compose are for future wiring.
- Authentication is currently a placeholder in `features/auth/api/types.ts`.
- Deployment workflows are placeholders.
- Prefer adding tools via `Cargo.toml` or `package.json` instead of global installs.
- When modifying Docker files, validate with `docker compose config` and test `docker compose up --build` when possible.
- **Frontend coverage floor**: The original 92% frontend coverage gate was set against a small scaffold. The PostHog-style UI migration (`frontend/src/components/ui/`, `features/marketing/`, `features/desktop/`) added a large presentational surface whose default/closed Storybook stories do not yet exercise every branch. Coverage thresholds were temporarily lowered to the achieved baseline in `frontend/vitest.config.ts`. Raising them back toward 92% is an explicit follow-up: add interaction tests for marketing pages, open-state tests for interactive UI primitives, and Storybook browser tests under `npm run test:storybook`.

## Documentation References

- `README.md` — quick start
- `CONTRIBUTING.md` — branch workflow and standards
- `docs/ONBOARDING.md` — setup and troubleshooting
- `docs/ARCHITECTURE.md` — architecture overview
- `docs/CI_CD_GUIDE.md` — CI/CD details
- `docs/SECURITY_BASELINE.md` — threat model and gates
- `docs/VALIDATION_REPORT.md` — what was implemented and validated
- `docs/adr/` — architecture decision records
