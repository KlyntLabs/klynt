# ADR-010: Frontend Subdomain Routing

## Status

Accepted

## Date

2026-06-23

## Context

Klynt serves distinct user contexts that were previously mixed under a single path-based URL scheme on the apex domain (`klynt.dev`):

- Tenant workspaces: `/tenants/:slug/*`
- Public user profiles: `/:username`
- Authentication: `/login`
- Admin dashboard: `/dashboard` and `/admin`

This had several drawbacks:

- Tenant and profile paths were awkwardly nested or ambiguous (`/tenants/acme` vs. a username).
- Branding and bookmarks felt second-class for tenant workspaces.
- Cross-subdomain cookie-based SSO (ADR-004) was not fully exploited because the frontend kept switching contexts on the same origin.

We needed a URL scheme that made tenants and profiles first-class while preserving the shared session cookie and keeping the deployment simple.

## Decision

Route the frontend by hostname using a top-level `HostRouter` that selects one of several React Router trees:

- `{slug}.klynt.dev` — tenant workspace (tenant router)
- `u.{username}.klynt.dev` — public profile (profile router)
- `login.klynt.dev` — authentication pages (login router)
- `admin.klynt.dev` — admin dashboard (admin router)
- `klynt.dev` / `www.klynt.dev` — marketing, onboarding, settings, and legacy redirects (apex router)

Cross-subdomain navigation uses shared URL builders (`buildTenantUrl`, `buildProfileUrl`, `buildLoginUrl`, `buildAdminUrl`, `buildApexUrl`) and `window.location.replace` instead of React Router's client-side navigation.

Legacy apex paths (`/login`, `/dashboard`, `/tenants/:slug/*`, `/:username`) issue external redirects to the canonical subdomain.

## Alternatives Considered

### Keep path-based URLs
- Pros: simpler CORS, one router, fewer DNS concerns.
- Cons: poor UX for tenants, ambiguous `/:username` route, wastes the cookie-based SSO domain.
- Rejected.

### Run separate frontend apps per subdomain
- Pros: complete isolation, each app can be optimized independently.
- Cons: duplicated routing/layout code, harder deployments, inconsistent UI.
- Rejected.

### Use a wildcard TLS certificate and a more complex reverse proxy
- Pros: production-grade hostname handling.
- Cons: adds operational complexity before we need it; Vite dev server handles `lvh.me` wildcards well for local development.
- Rejected for now; we can add a proxy layer later without changing the routing model.

## Consequences

- **CORS**: the backend must allow wildcard origins (`http://*.lvh.me:5174` locally, `https://*.klynt.dev` in production) so API calls from subdomains are accepted.
- **Cookie domain**: session cookies must be scoped to the parent domain (`.klynt.dev`, `.lvh.me`) so authentication is shared across subdomains.
- **Reserved subdomains**: `www`, `login`, `admin`, `u`, `api`, `app`, `mail`, `ftp`, `cdn`, `static` are reserved and cannot be used as tenant slugs.
- **Path migration**: the private user desktop moved from `/:profileId` to `/u/:profileId` on the apex domain to avoid clashing with the public profile subdomain scheme.
- **Environment**: two new frontend variables are required: `VITE_APP_DOMAIN` (base domain, e.g., `lvh.me`) and `VITE_APP_PROTOCOL` (e.g., `http`).
- **Testing**: unit tests stub `window.location` and assert external redirects to subdomain URLs.
