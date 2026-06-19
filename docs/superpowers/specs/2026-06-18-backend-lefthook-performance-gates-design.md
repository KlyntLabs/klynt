# Backend Lefthook Performance & Dependency Gates

## Goal

Extend the backend `pre-push` lefthook gate with lightweight performance and dependency-hygiene checks that mirror the frontend's shift-left quality strategy, without adding a slow release build.

## Scope

1. Run `cargo audit` on backend changes in `pre-push`.
2. Run `cargo machete` on backend changes in `pre-push`.
3. Update `just setup` so contributors install the new cargo plugins.

## Non-scope

- No release build (`cargo build --release`) in lefthook — excluded because it is too slow.
- No Criterion benchmarks / `cargo bench` gate in lefthook — excluded because the API surface is still stabilizing.
- No changes to CI workflows (they already run `cargo audit` periodically).

## Design

### Lefthook additions (`pre-push`)

Add two commands after `backend-test`, each with the existing backend change-detection guard so they only run when `backend/**` changes:

- `backend-audit`: `cargo audit`
- `backend-machete`: `cargo machete`

Both respect the same `PUSH_TARGET` skip logic used by the existing backend commands.

### Tooling setup

Update `just setup` to install:

- `cargo install cargo-audit --locked`
- `cargo install cargo-machete --locked`

## Additional changes

To make `cargo machete` pass, several genuinely unused workspace dependencies were removed:

- `klynt-server`: removed `serde`.
- `klynt-infrastructure`: removed `serde`, `thiserror`.
- `klynt-application`: removed `thiserror`.
- `klynt-api`: removed `chrono` and `tower`; moved `serde_json` from `[dependencies]` to `[dev-dependencies]` (it is only used in integration tests).

All crates still compile and the full test suite passes after these removals.

## Verification

- `just setup` installs the new tools.
- `cargo audit` reports no HIGH/CRITICAL advisories.
- `cargo machete` reports no unused dependencies.
- `cargo fmt --check`, `cargo clippy --all-targets --all-features -- -D warnings`, and `cargo nextest run --all-features` all pass.
- `lefthook run pre-push` includes and executes the new gates when backend files change.
