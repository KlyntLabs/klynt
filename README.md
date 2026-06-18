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

## Running with Docker

Copy the environment template first:

```bash
cp .env.example .env
```

### Development (hot reload)

One command brings up the whole stack:

```bash
docker compose -f docker-compose.dev.yml up --build
```

- Frontend: http://localhost:5174
- Backend: http://localhost:3001
- Storybook: http://localhost:6006
- Postgres: `postgresql://klynt:klynt@localhost:5432/klynt`
- Redis: `redis://localhost:6379`

Source code is mounted into the containers, so edits on the host are reflected immediately.

### Production-like

```bash
docker compose up --build
```

- Frontend: http://localhost:5174
- Backend: http://localhost:3001
- Postgres: `postgresql://klynt:klynt@localhost:5432/klynt`
- Redis: `redis://localhost:6379`

To use different host ports (e.g. if defaults are already taken):

```bash
KLYNT_BACKEND_PORT=3002 KLYNT_FRONTEND_PORT=5175 docker compose up --build
```

For real deployments, put this behind a reverse proxy that terminates TLS (e.g. Traefik, Caddy, or Nginx) and update `VITE_API_BASE_URL` and `KLYNT_API__ALLOWED_ORIGINS='["https://your-public-url"]'` to your public URLs. Change the Postgres/Redis credentials and use managed services where appropriate.

> **Note:** If you have an existing `.env` from before Docker support, update `KLYNT_API_HOST` / `KLYNT_API_PORT` to `KLYNT_API__HOST` / `KLYNT_API__PORT` (the backend config loader uses `__` as the nested-key separator).

## Commands

| Command | Description |
|---------|-------------|
| `just dev` | Run backend + frontend together |
| `just test` | Run backend (`cargo nextest`) and frontend tests |
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
