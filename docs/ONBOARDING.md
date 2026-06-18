# Onboarding

## Prerequisites

- Rust (latest stable) via rustup
- Node.js 24+ (use `.nvmrc`)
- `just`: `cargo install just`
- `lefthook`: `cargo install lefthook`

## Quick start

```bash
git clone <repo>
cd klynt-edu
just setup
cp .env.example .env
just dev
```

## Common commands

- `just dev` — full stack
- `just dev-backend` — backend only
- `just test` — all tests
- `just fmt` — fix formatting
- `just check` — pre-push checks

## Editor setup

Open in VS Code and install recommended extensions.

## Troubleshooting

- Port 3000/5173 in use? Edit `.env`.
- Lefthook not running? Run `lefthook install`.
