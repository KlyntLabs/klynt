# Tenant Validation & Login Routing Design

## Context

The Klynt frontend uses subdomain routing (`slug.base.domain`) to identify tenants. Currently, any host that parses as a tenant subdomain is accepted by `HostRouter`, and an invalid/non-existent tenant is only detected after the desktop shell mounts and the authenticated `getTenant` call fails. We also observed that with a misconfigured `VITE_APP_DOMAIN`, the login URL can be generated as `login.tenant.domain` instead of the canonical `login.domain`.

## Goals

1. Reject invalid/non-existent tenant subdomains early and show a user-facing "system invalid" page before redirecting to the apex homepage.
2. Ensure all tenant login redirects go to a single canonical login page at `login.{baseDomain}` (e.g. `login.klynt.dev`), never `login.{tenant}.{baseDomain}`.
3. Keep the change isolated to routing/tenant layers and preserve existing auth behavior.

## Non-Goals

- Changing how valid tenants authenticate or how sessions are issued.
- Adding new marketing content or redesigning the desktop shell.
- Supporting wildcard/custom tenant domains outside the `{slug}.{baseDomain}` pattern.

## Proposed Solution (Approach A)

### Backend: Public tenant lookup

Add a new public endpoint:

```text
GET /api/v1/tenants/:slug/public
```

- Returns `200 OK` with `{ "data": { "slug": "...", "name": "..." } }` if the tenant exists.
- Returns `404 Not Found` if the tenant does not exist or the slug is invalid.
- No authentication required.
- Implementation lives next to the existing tenant routes in `backend/crates/gateways/src/routes/tenants.rs` and delegates to `tenant_service::get_by_slug`.

### Frontend: Tenant guard

Introduce a `TenantGuard` component mounted inside the tenant router, **outside** `ProtectedRoute` so it can validate the tenant even for unauthenticated visitors.

Flow:

1. `HostRouter` resolves the hostname to `{ type: "tenant", slug }` as before.
2. `createTenantRouter(slug)` renders `<TenantGuard slug={slug}>`.
3. `TenantGuard` calls the public lookup endpoint:
   - **Loading** → show spinner.
   - **Valid** → render `<ProtectedRoute><TenantDesktopPage slug={slug} /></ProtectedRoute>`.
   - **Invalid** → render `<InvalidTenantPage />`.

### Frontend: Invalid tenant page

`frontend/src/core/routing/components/invalid-tenant-page.tsx`:

- Minimal blank-centered page.
- Displays localized message using `errors:systemInvalid`.
- Shows a countdown/redirect message using `errors:systemInvalidRedirect`.
- After 5 seconds, calls `navigateExternal(buildApexUrl("/"))`.
- Clears the timeout on unmount.

### Login routing fixes

1. **Configuration**: `VITE_APP_DOMAIN` must be the real base domain (`localhost` locally, `klynt.dev` in production). With this set, `buildLoginUrl()` naturally produces `login.{baseDomain}`.
2. **Misroute handling**: Update `getHostContext` so any hostname that starts with `login.` but is not exactly the canonical login host is treated as a login misroute. `HostRouter` will redirect it to `buildLoginUrl()`.
   - Example: `login.tenant.klynt.dev` → redirects to `http://login.klynt.dev/`.
   - The canonical login host is `login.{baseDomain}` (with optional port in dev).

### i18n

Add keys to `en`, `vi`, and `cn` under the `errors` namespace:

- `systemInvalid`: short message (e.g. "System invalid").
- `systemInvalidRedirect`: message informing the user they will be redirected home.

### Tests

- Backend integration test for `GET /api/v1/tenants/:slug/public` (200 and 404).
- Frontend unit tests for:
  - `getHostContext("login.tenant.klynt.dev", "klynt.dev")` returns login misroute/unknown and triggers redirect.
  - `buildLoginUrl()` never contains `login.{tenant}.{domain}` when `VITE_APP_DOMAIN` is configured.
  - `InvalidTenantPage` renders message and redirects after 5 seconds (mocked timers).
  - `TenantGuard` shows spinner, then valid tenant desktop, then invalid page on 404.

### Configuration changes

Update `.env.example` and the local `.env` to use `localhost` for local subdomain testing:

```bash
VITE_APP_DOMAIN=localhost
KLYNT_COOKIE_DOMAIN=localhost
KLYNT_API__ALLOWED_ORIGINS='["http://localhost:5174", "http://*.localhost:5174", "http://lvh.me:5174", "http://*.lvh.me:5174"]'
KLYNT_BASE_URL=http://localhost:5174
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Extra network request on every tenant page load | Public lookup is tiny and cacheable; React Query can cache it for the session. |
| Existing `TenantDesktopPage` already calls `useTenant`; duplication | `TenantGuard` uses the lightweight public endpoint; `TenantDesktopPage` keeps the existing authenticated `useTenant` for role/data. |
| `login.tenant.domain` bookmarked by users | Redirect to canonical login page preserves UX. |

## Success Criteria

- Accessing `http://invalid.localhost:5174` shows "System invalid" and redirects to `http://localhost:5174/` after ~5 seconds.
- Accessing `http://acme-test.localhost:5174` while unauthenticated redirects to `http://login.localhost:5174/?from=...`.
- Accessing `http://login.acme-test.localhost:5174` redirects to `http://login.localhost:5174/`.
- After logging in on `login.localhost:5174`, the user is redirected back to the original tenant desktop and can use the Virtual Desktop normally.
