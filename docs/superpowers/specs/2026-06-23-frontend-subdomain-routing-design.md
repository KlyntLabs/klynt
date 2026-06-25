# Frontend Subdomain Routing Design

## Status

Draft — pending implementation planning.

## Context

The Klynt backend already supports multi-tenancy. The frontend currently routes tenants and public profiles through path segments:

- `klynt.dev/tenants/:slug/*` for tenant desktops
- `klynt.dev/:profileId` for the private user desktop
- `klynt.dev/login` for login

This design moves tenant access, public profiles, the login page, and the admin dashboard to dedicated subdomains:

- `{slug}.klynt.dev` for tenants
- `u.{username}.klynt.dev` for public profiles
- `login.klynt.dev` for login
- `admin.klynt.dev` for admin/mod dashboard

The apex domain (`klynt.dev`) keeps marketing, registration, onboarding, settings, and private user desktop routes.

## Goals

- Provide true subdomain URLs for tenants, public profiles, login, and admin.
- Redirect legacy apex paths to their canonical subdomain URLs.
- Preserve cookie-based SSO across all subdomains.
- Minimize backend changes.
- Keep the implementation testable and maintainable.

## Non-Goals

- Changing the API path structure (tenant slug remains in API paths for now).
- Rewriting backend tenant resolution logic.
- Adding custom domains per tenant.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Auth subdomain scope | Only `/login` on `login.klynt.dev` | Minimal scope; register/forgot-password stay on apex. |
| Tenant subdomain scope | Only existing tenants (`{slug}.klynt.dev`) | New tenants cannot have a slug before creation; `/tenants/new` stays on apex. |
| Public profile subdomain | `u.{username}.klynt.dev` | `@{username}` is invalid in DNS; `u.` is short and unambiguous. |
| Private user desktop | Moves from `/:profileId` to `/u/:profileId` | Avoids collision with public-profile redirects. |
| Admin dashboard | `admin.klynt.dev` | Clear admin-only signal; both `/dashboard` and `/admin` move here. |
| Apex behavior for old paths | 302 redirect to canonical subdomain | SEO-friendly and enforces the new scheme. |
| API tenant resolution | Frontend extracts slug and passes it in existing API paths | No backend routing changes; minimal risk. |
| Local dev domain | `lvh.me:5174` | Public wildcard DNS to 127.0.0.1; zero local config. |

## URL Scheme

### Production

| Host | Path | Behavior |
|---|---|---|
| `klynt.dev` | `/` | Marketing home |
| `klynt.dev` | `/login` | 302 → `login.klynt.dev/` |
| `klynt.dev` | `/dashboard` | 302 → `admin.klynt.dev/` |
| `klynt.dev` | `/admin` | 302 → `admin.klynt.dev/admin` |
| `klynt.dev` | `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Stay on apex |
| `klynt.dev` | `/onboarding`, `/settings/sessions`, `/tenants/new`, `/u/:profileId` | Authenticated area, stay on apex |
| `klynt.dev` | `/tenants/:slug/*` | 302 → `{slug}.klynt.dev/*` |
| `klynt.dev` | `/:username` | 302 → `u.{username}.klynt.dev/` |
| `login.klynt.dev` | `/` | `<LoginPage />` |
| `login.klynt.dev` | `/*` | 302 → `/` |
| `login.klynt.dev` | `/` when authenticated | 302 → `klynt.dev/dashboard` |
| `admin.klynt.dev` | `/` | Admin dashboard |
| `admin.klynt.dev` | `/admin` | Admin page |
| `admin.klynt.dev` | `/*` | 302 → `/` |
| `admin.klynt.dev` | any path when not admin/moderator | 302 → `klynt.dev/` |
| `{slug}.klynt.dev` | `/` | Tenant desktop home |
| `{slug}.klynt.dev` | `/members`, `/roles`, `/settings` | Tenant app deep links |
| `{slug}.klynt.dev` | `/*` | Tenant 404 |
| `u.{username}.klynt.dev` | `/` | Public profile page |
| `u.{username}.klynt.dev` | `/*` | 302 → `/` |

### Local Development

Replace `klynt.dev` with `lvh.me:5174`:

- `http://lvh.me:5174/` — marketing
- `http://login.lvh.me:5174/` — login
- `http://admin.lvh.me:5174/` — admin
- `http://acme.lvh.me:5174/` — tenant desktop
- `http://u.jayden.lvh.me:5174/` — public profile

### Reserved Subdomains

The following labels are reserved and will not be treated as tenant slugs:

`www`, `login`, `admin`, `u`, `api`, `app`, `mail`, `ftp`, `cdn`, `static`.

Unknown or reserved subdomains fall back to apex behavior.

## Architecture

### Host Context Utility

A new module `frontend/src/core/routing/host-context.ts` parses `window.location.hostname` into a typed context.

```ts
type HostContext =
  | { type: "apex" }
  | { type: "login" }
  | { type: "admin" }
  | { type: "tenant"; slug: string }
  | { type: "profile"; username: string }
  | { type: "reserved"; subdomain: string }
  | { type: "unknown"; subdomain: string };

type TenantHostContext = Extract<HostContext, { type: "tenant" }>;
type ProfileHostContext = Extract<HostContext, { type: "profile" }>;
```

Parsing rules:

1. Remove the configured base domain suffix (e.g., `klynt.dev` or `lvh.me:5174`). The remainder is the subdomain prefix.
2. If there is no prefix → `apex`.
3. If the prefix is exactly `www` → `apex`.
4. If the prefix is exactly `login` → `login`.
5. If the prefix is exactly `admin` → `admin`.
6. If the prefix starts with `u.` → extract username from `u.{username}`.
7. If the prefix contains a `.` → `unknown`.
8. If the prefix is in the reserved list → `reserved`.
9. Otherwise, treat the prefix as a tenant slug → `tenant`.

### Subdomain URL Builder

A helper module `frontend/src/core/routing/subdomain-url.ts` builds full cross-subdomain URLs using the current protocol and configured base domain.

```ts
buildSubdomainUrl("acme", "/members");
// "https://acme.klynt.dev/members"

buildProfileUrl("jayden");
// "https://u.jayden.klynt.dev/"

buildLoginUrl("https://acme.klynt.dev/members");
// "https://login.klynt.dev/?from=https%3A%2F%2Facme.klynt.dev%2Fmembers"
```

### Host-Based Route Trees

A top-level `HostRouter` selects a router based on the host context.

```tsx
export function HostRouter() {
  const ctx = getHostContext(window.location.hostname);
  const router = useMemo(() => {
    switch (ctx.type) {
      case "apex": return apexRouter;
      case "login": return loginRouter;
      case "admin": return adminRouter;
      case "tenant": return createTenantRouter(ctx.slug);
      case "profile": return createProfileRouter(ctx.username);
      default: return apexRouter;
    }
  }, [ctx]);
  return <RouterProvider router={router} />;
}
```

Route tree files:

- `frontend/src/core/routing/routers/apex-router.tsx`
- `frontend/src/core/routing/routers/login-router.tsx`
- `frontend/src/core/routing/routers/admin-router.tsx`
- `frontend/src/core/routing/routers/tenant-router.tsx`
- `frontend/src/core/routing/routers/profile-router.tsx`

All routers share the same root providers and layout wrappers.

### Apex Router Redirects

The apex router keeps existing marketing, guest, and protected routes, plus redirect routes:

- `/login` → `https://login.klynt.dev/`
- `/dashboard` → `https://admin.klynt.dev/`
- `/admin/*` → `https://admin.klynt.dev/admin/:splat`
- `/tenants/:slug/*` → `https://:slug.klynt.dev/*`
- `/:username` → `https://u.:username.klynt.dev/`

### Subdomain Routers

- **Login:** only `/` renders `<LoginPage />`; all other paths redirect to `/`.
- **Admin:** `/` renders admin dashboard, `/admin` renders admin page, all other paths redirect to `/`. Wrapped in a role guard requiring an admin or moderator role.
- **Tenant:** `/*` renders `<TenantDesktopPage slug={slug} />`.
- **Profile:** `/` renders `<PublicProfilePage username={username} />`; all other paths redirect to `/`.

## Auth Flows Across Subdomains

The session cookie is scoped to `.klynt.dev`, so auth state is shared across subdomains.

### Login

1. Unauthenticated user visits `acme.klynt.dev/members`.
2. `ProtectedRoute` redirects to `https://login.klynt.dev/?from=https%3A%2F%2Facme.klynt.dev%2Fmembers`.
3. User logs in on `login.klynt.dev`.
4. `useLogin` reads `?from=` and navigates there; if missing, navigates to `https://klynt.dev/dashboard`.

### Logout

1. User logs out from any subdomain.
2. `useLogout` calls the logout API, then navigates to `https://login.klynt.dev/`.

### Guest Routes

On `login.klynt.dev`, authenticated users are redirected to `https://klynt.dev/dashboard`.

### Admin Access Control

On `admin.klynt.dev`, non-admin/mod users are redirected to `https://klynt.dev/`.

## API Client

The API client keeps a single `baseURL`. Tenant and profile components extract the slug/username from the host context and pass them to existing API hooks.

```ts
const { slug } = getHostContext(window.location.hostname) as TenantHostContext;
const { data } = useTenant(slug);
```

## CORS Requirement

The backend CORS allow-list is currently static. It must be updated to allow all frontend subdomains:

- Production: `https://*.klynt.dev`, `https://klynt.dev`
- Local dev: `http://*.lvh.me:5174`, `http://lvh.me:5174`

This is the only required backend change.

## Environment & Dev Setup

### Frontend `.env.example`

```bash
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_APP_DOMAIN=lvh.me:5174
VITE_APP_PROTOCOL=http
```

Production:

```bash
VITE_API_BASE_URL=https://api.klynt.dev/api/v1
VITE_APP_DOMAIN=klynt.dev
VITE_APP_PROTOCOL=https
```

### Backend Config

```toml
# Local
allowed_origins = ["http://localhost:5174", "http://*.lvh.me:5174"]

# Production
allowed_origins = ["https://*.klynt.dev", "https://klynt.dev"]
```

### Cookie Config

```bash
KLYNT_COOKIE_DOMAIN=.klynt.dev   # leading dot enables cross-subdomain SSO
KLYNT_COOKIE_SECURE=true         # false for local dev
```

### Vite Dev Server

No change required. `lvh.me` resolves to `127.0.0.1`, so the existing `server.port: 5174` binding works for all subdomains.

## Testing Strategy

### Unit Tests

- `host-context.test.ts` — all context types, reserved list, `www`, port handling.
- `subdomain-url.test.ts` — URL building with protocol, port, and path variants.

### Route / Guard Tests

- Update `ProtectedRoute`, `GuestRoute`, `useLogin`, `useLogout` tests for cross-subdomain URLs and `?from=` query params.
- Add tests for apex redirect routes.

### WebBridge Scenarios

- Unauthenticated visit to tenant deep link → login subdomain with `?from=`.
- Login → return to original tenant deep link.
- Visit public profile subdomain → profile renders.
- Non-admin visit to admin subdomain → redirect to apex home.
- Apex tenant path → redirect to tenant subdomain.
- Apex `/:username` → redirect to profile subdomain.

## Migration Plan

### Frontend

1. Move private user desktop from `/:profileId` to `/u/:profileId`.
2. Update dashboard non-admin redirect from `/{user.id}` to `/u/{user.id}`.
3. Refactor `route-tree.tsx` into `host-router.tsx` and per-host routers.
4. Add `host-context.ts` and `subdomain-url.ts` utilities.
5. Update auth hooks and route guards for cross-subdomain navigation.
6. Update tenant list and dashboard links to emit subdomain URLs.

### Backend

1. Update CORS layer to allow wildcard frontend subdomains.

### Documentation

1. Add ADR: `docs/adr/00X-frontend-subdomain-routing.md`.
2. Update `docs/ONBOARDING.md` with local dev URLs.
3. Update `.env.example`.

## Backward Compatibility

Old apex paths redirect to the new subdomain URLs with HTTP 302:

- `/tenants/:slug/*` → `{slug}.klynt.dev/*`
- `/:username` → `u.{username}.klynt.dev/`
- `/login` → `login.klynt.dev/`
- `/dashboard` → `admin.klynt.dev/`
- `/admin` → `admin.klynt.dev/admin`

## Open Questions

None — all clarifying questions resolved.

## Risks

- **CORS misconfiguration** could break cross-subdomain API calls. Mitigation: explicit test coverage and staged rollout.
- **Cookie domain mismatch** between local and production. Mitigation: align `.env.example` and deployment configs.
- **Reserved subdomain collisions** if future features need new reserved labels. Mitigation: keep reserved list centralized and documented.
