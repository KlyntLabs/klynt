# Contributing to Klynt

## Development Workflow

1. Create a feature branch from `dev`.
2. Make your changes.
3. Run `just check` before pushing.
4. Open a pull request to `dev`.
5. After review, merge to `dev`.
6. Releases are promoted from `dev` to `main` via pull request.

## Code Standards

- Rust: `cargo fmt` and `cargo clippy -D warnings`
- TypeScript: `prettier` and `eslint` with type-aware rules
- All code must pass pre-commit hooks (`lefthook install`)
- All PRs must pass CI

## Branching

- `main`: production-ready code
- `dev`: integration branch
- `feature/*`, `fix/*`, `chore/*`: short-lived branches
