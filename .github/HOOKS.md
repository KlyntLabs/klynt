# Git Hooks

This repo uses [lefthook](https://lefthook.dev/) for git hooks.

## Installation

`bun install` in `frontend/` runs the `prepare` script, which installs the hooks into `.git/hooks/`.

To reinstall manually:

```bash
cd frontend && bunx lefthook install
```

## Policy

- **Pre-commit** is a fast staged-only gate.
- **Pre-push** is the full local CI gate.
- Never use `--no-verify`.
- Pre-push skips backend checks when no `backend/` files changed.
- Pre-push skips frontend checks when no `frontend/` files changed.

## Pre-commit

Runs in parallel on staged files only:

- `cargo fmt --all -- --check` for staged `**/*.rs` files
- `biome check --error-on-warnings` for staged frontend files

## Pre-push

Runs the full check suite, but skips lanes when their directory did not change:

- Frontend typecheck (`bun run typecheck`)
- Frontend tests (`bun run test`)
- Frontend production build (`bun run build`)
- Backend format check (`cargo fmt --all -- --check`)
- Backend clippy (`cargo clippy --all-targets --all-features -- -D warnings`)
- Backend tests (`cargo test`)

## CI parity

`.github/workflows/ci.yml` runs the same checks in GitHub Actions with path filtering, so local hooks and CI stay aligned.
