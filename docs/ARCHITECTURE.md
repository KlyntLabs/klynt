# Architecture Overview

## Repository Layout

- `backend/` — Rust + Axum API
- `frontend/` — React + Vite SPA
- `docs/` — documentation and ADRs
- `.github/` — CI/CD workflows

## Backend

Single Cargo crate with Clean Architecture modules:

- `api/` — HTTP handlers, routing, middleware, responses
- `application/` — use cases and orchestration
- `domain/` — entities, value objects, repository traits
- `infrastructure/` — concrete implementations (DB, external services)

## Frontend

Feature-based Vite SPA:

- `routes/` — React Router route tree
- `app/` — providers, layouts, error boundaries
- `features/` — business domains
- `components/ui/` — design system primitives
- `lib/` — API client, query client, utilities

## Communication

Frontend proxies `/api/*` to the backend in development. In production, the same origin or explicit CORS origins are used.
