# Klynt Education Platform

A modern education platform built with Rust + Axum and React + Vite.

## Quick Start

```bash
git clone <repo-url> && cd klynt-edu
just setup
cp .env.example .env
just dev
```

Open http://localhost:5174 for the frontend and http://localhost:3001/api/v1/health/live for the backend health check.

## Commands

| Command | Description |
|---------|-------------|
| `just dev` | Run backend + frontend together |
| `just test` | Run all tests |
| `just fmt` | Format all code |
| `just lint` | Run all linters |
| `just check` | Run fast pre-push checks |
| `just build` | Build production artifacts |

## Documentation

- [Onboarding](docs/ONBOARDING.md)
- [Architecture](docs/ARCHITECTURE.md)
- [CI/CD Guide](docs/CI_CD_GUIDE.md)
- [Security Baseline](docs/SECURITY_BASELINE.md)
- [ADRs](docs/adr/)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
