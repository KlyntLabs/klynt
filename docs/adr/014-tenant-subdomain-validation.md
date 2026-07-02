# ADR-014: Tenant Subdomain Validation and Canonical Login Routing

## Status

Accepted

## Date

2026-07-01

## Context

After moving tenant workspaces to `{slug}.klynt.dev` (ADR-010), we discovered two
related gaps in the subdomain routing model:

1. **Invalid tenant subdomains were silently treated as real tenants.**
   Visiting `https://not-a-tenant.klynt.dev` rendered the tenant router, which
   then hit authenticated APIs and either flashed a broken page or redirected to
   login without explaining that the organization did not exist.
2. **The `login` subdomain was ambiguous when combined with a tenant slug.**
   Some flows and bookmarks produced `http://login.acme.klynt.dev/` (a
   tenant-scoped login host). The frontend parsed this as a tenant subdomain
   named `login`, which is a reserved slug, so the login page was unreachable
   from that URL.

We needed tenant subdomains to be validated before rendering the tenant
experience, and we needed a clear, user-friendly behavior for non-existent
organizations and misrouted login hosts.

## Decision

1. **Public tenant lookup endpoint**
   The backend exposes `GET /api/v1/tenants/{tenant_slug}/public`, which returns
   a minimal tenant payload (`slug`, `name`) without authentication. This lets
   the frontend validate a subdomain before trying to load the full tenant
   desktop.

2. **`TenantGuard` on the tenant router**
   The tenant router now wraps its routes in a `TenantGuard` component that:
   - calls the public lookup for the subdomain slug;
   - shows a loading spinner while fetching;
   - renders an `<InvalidTenantPage>` if the tenant is missing.

3. **Invalid-tenant page**
   `InvalidTenantPage` shows a localized "This organization does not exist"
   message and automatically redirects the user to the apex domain after a short
   delay.

4. **Canonical login redirect for `login.{slug}` misroutes**
   `HostContext` recognizes hosts of the form `login.{slug}.{baseDomain}` as a
   `login_misroute`. The router renders `<RedirectToCanonicalLogin>`, which
   strips the slug and redirects to the canonical `login.{baseDomain}` host.
   This preserves the user's intent to log in while avoiding the reserved-slug
   ambiguity.

5. **Unauthenticated tenant subdomain behavior preserved**
   A valid but unauthenticated tenant subdomain still redirects to the login
   subdomain via `ProtectedRoute`, exactly as before. The difference is that the
   tenant must now be valid before `ProtectedRoute` is reached.

## Alternatives Considered

### Validate the tenant only after authentication
- Pros: keeps the existing flow, fewer API calls for logged-out users.
- Cons: produces confusing UX (login page for a non-existent tenant) and leaks
  the existence check behind auth.
- Rejected.

### Redirect unknown tenant subdomains immediately from the backend
- Pros: no public endpoint needed, fast failure.
- Cons: requires backend to know the frontend apex URL and complicates
  deployment; the frontend is in a better position to render a localized,
  branded error page.
- Rejected.

### Allow `login.{slug}` as a valid tenant-scoped login host
- Pros: visually explicit about which tenant the user is joining.
- Cons: collides with the reserved `login` subdomain, requires wildcard DNS
  for two-level subdomains, and does not match the rest of the routing model.
- Rejected.

## Consequences

- A new public backend route is part of the tenant API surface and must remain
  unauthenticated.
- The tenant router has an extra network call on first load; this is cached by
  React Query and avoids heavier authenticated calls for invalid tenants.
- `VITE_APP_DOMAIN` and `VITE_APP_PROTOCOL` now also support `localhost`
  subdomains (`http://*.localhost:5174`) for local development without
  `lvh.me`.
- Reserved subdomains now explicitly include `login`, `admin`, `u`, `api`,
  `app`, `www`, `mail`, `ftp`, `cdn`, and `static`.
- Unit tests stub the public tenant lookup when asserting unauthenticated
  tenant redirects.
