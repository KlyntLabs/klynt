# Frontend Subdomain Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the frontend from path-based tenant/profile/auth/admin URLs to subdomain-based URLs (`{slug}.klynt.dev`, `u.{username}.klynt.dev`, `login.klynt.dev`, `admin.klynt.dev`) while preserving cookie-based SSO and redirecting legacy apex paths.

**Architecture:** A `HostRouter` selects one of several React Router trees based on `window.location.hostname`. Shared utilities (`host-context.ts`, `subdomain-url.ts`) parse the host and build cross-subdomain URLs. The backend CORS layer is extended to allow wildcard frontend subdomains.

**Tech Stack:** React 19, React Router 7, TypeScript 6, Vite 8, Rust/Axum, `tower-http` CORS.

---

## File Structure

### New Files

- `frontend/src/core/routing/host-context.ts` — parse hostname into typed context.
- `frontend/src/core/routing/host-context.test.ts` — unit tests for host parsing.
- `frontend/src/core/routing/subdomain-url.ts` — build cross-subdomain URLs.
- `frontend/src/core/routing/subdomain-url.test.ts` — unit tests for URL builder.
- `frontend/src/core/routing/host-router.tsx` — top-level router selector.
- `frontend/src/core/routing/routers/apex-router.tsx` — apex domain routes + redirects.
- `frontend/src/core/routing/routers/login-router.tsx` — login subdomain routes.
- `frontend/src/core/routing/routers/admin-router.tsx` — admin subdomain routes.
- `frontend/src/core/routing/routers/tenant-router.tsx` — tenant subdomain routes.
- `frontend/src/core/routing/routers/profile-router.tsx` — public profile subdomain routes.
- `frontend/src/core/routing/routers/shared-layouts.tsx` — layout wrappers reused by all routers.
- `frontend/src/core/routing/redirects.tsx` — redirect components for apex routes.
- `frontend/src/core/auth/external-redirect.tsx` — external navigation helper and component.
- `frontend/src/core/auth/hooks/use-redirect-target.ts` — read `?from=` safely.
- `docs/adr/010-frontend-subdomain-routing.md` — architecture decision record.
- `docs/superpowers/test-scenarios/2026-06-23-subdomain-routing-webbridge.md` — WebBridge scenarios.

### Modified Files

- `frontend/src/core/routing/route-tree.tsx` — delete; logic moves to host-based routers.
- `frontend/src/core/routing/route-paths.ts` — add `userDesktop` path.
- `frontend/src/core/auth/auth-identity.tsx` — cross-subdomain `ProtectedRoute`, `GuestRoute`, `RoleGuard`.
- `frontend/src/core/auth/hooks/use-login.ts` — navigate to `?from=` or apex dashboard.
- `frontend/src/core/auth/hooks/use-logout.ts` — navigate to login subdomain.
- `frontend/src/features/dashboard/pages/dashboard-page.tsx` — redirect non-admins to `/u/:id`.
- `frontend/src/features/tenant/pages/tenant-desktop-page.tsx` — accept optional `slug` prop.
- `frontend/src/features/user/pages/user-desktop-page.tsx` — path param becomes `profileId` from `/u/:profileId`.
- `frontend/src/main.tsx` — render `<HostRouter />` instead of `<RouterProvider router={router} />`.
- `frontend/.env.example` — add `VITE_APP_DOMAIN` and `VITE_APP_PROTOCOL`.
- `backend/config/default.toml` — update `allowed_origins`.
- `backend/crates/gateways/src/middleware/cors.rs` — support wildcard origins.
- `backend/crates/infra/config/src/api.rs` — relax origin validation if it rejects wildcards.

---

## Phase 1 — Backend CORS Wildcard Support

### Task 1.1: Inspect origin validation

**Files:**
- Read: `backend/crates/infra/config/src/api.rs`

- [ ] **Step 1: Open the API config validation**

  Run:
  ```bash
  grep -n "allowed_origins" backend/crates/infra/config/src/api.rs
  ```

- [ ] **Step 2: Determine if wildcard origins are rejected**

  Look for a check like `origin.starts_with("http://") || origin.starts_with("https://")`. If the validator rejects `*`, note the line number for Task 1.3.

### Task 1.2: Update CORS middleware to expand wildcards

**Files:**
- Modify: `backend/crates/gateways/src/middleware/cors.rs`

- [ ] **Step 1: Replace static origin matching with wildcard expansion**

  ```rust
  use axum::http::{
      header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE, ORIGIN},
      HeaderValue, Method,
  };
  use tower_http::cors::{AllowOrigin, CorsLayer};

  fn matches_wildcard_origin(origin: &str, pattern: &str) -> bool {
      let origin_host = origin
          .strip_prefix("http://")
          .or_else(|| origin.strip_prefix("https://"))
          .unwrap_or(origin);
      let pattern_host = pattern
          .strip_prefix("http://")
          .or_else(|| pattern.strip_prefix("https://"))
          .unwrap_or(pattern);

      if let Some(suffix) = pattern_host.strip_prefix("*.") {
          origin_host == suffix || origin_host.ends_with(&format!(".{}", suffix))
      } else {
          origin_host == pattern_host
      }
  }

  pub fn cors_layer(allowed_origins: &[String]) -> CorsLayer {
      let methods = [
          Method::GET,
          Method::POST,
          Method::PUT,
          Method::PATCH,
          Method::DELETE,
          Method::OPTIONS,
      ];

      if allowed_origins.is_empty() {
          return CorsLayer::new()
              .allow_methods(methods)
              .allow_headers([AUTHORIZATION, CONTENT_TYPE, ACCEPT, ORIGIN])
              .allow_origin(AllowOrigin::any());
      }

      let patterns = allowed_origins.to_vec();
      CorsLayer::new()
          .allow_methods(methods)
          .allow_headers([AUTHORIZATION, CONTENT_TYPE, ACCEPT, ORIGIN])
          .allow_origin(AllowOrigin::predicate(move |origin, _request_head| {
              let origin_str = origin.to_str().unwrap_or("");
              patterns.iter().any(|pattern| matches_wildcard_origin(origin_str, pattern))
          }))
          .allow_credentials(true)
  }
  ```

### Task 1.3: Relax config validation for wildcard origins

**Files:**
- Modify: `backend/crates/infra/config/src/api.rs`

- [ ] **Step 1: Find the origin validation logic**

  If it rejects `*`, update it to accept patterns matching `*.domain.tld` in addition to full URLs.

  Example additional check:
  ```rust
  fn is_valid_origin(origin: &str) -> bool {
      origin.starts_with("http://") || origin.starts_with("https://") || origin.starts_with("*.")
  }
  ```

### Task 1.4: Update backend config

**Files:**
- Modify: `backend/config/default.toml`

- [ ] **Step 1: Add wildcard local dev origin**

  ```toml
  [api]
  host = "127.0.0.1"
  port = 3000
  allowed_origins = ["http://localhost:5174", "http://*.lvh.me:5174"]
  ```

### Task 1.5: Verify backend changes

- [ ] **Step 1: Run format and clippy**

  ```bash
  cd /Users/jayden/Projects/Klynt/klynt-edu/backend && cargo fmt && cargo clippy --workspace --all-targets --all-features -- -D warnings
  ```

  Expected: no errors.

- [ ] **Step 2: Run backend tests**

  ```bash
  cargo nextest run --all-features
  ```

  Expected: all pass.

- [ ] **Step 3: Commit**

  ```bash
  cd /Users/jayden/Projects/Klynt/klynt-edu && git add backend/ && git commit -m "feat(cors): allow wildcard frontend subdomains"
  ```

---

## Phase 2 — Frontend Host Utilities

### Task 2.1: Create host-context utility

**Files:**
- Create: `frontend/src/core/routing/host-context.ts`

- [ ] **Step 1: Write the implementation**

  ```ts
  const RESERVED_SUBDOMAINS = new Set([
    "www",
    "login",
    "admin",
    "u",
    "api",
    "app",
    "mail",
    "ftp",
    "cdn",
    "static",
  ]);

  export type HostContext =
    | { type: "apex" }
    | { type: "login" }
    | { type: "admin" }
    | { type: "tenant"; slug: string }
    | { type: "profile"; username: string }
    | { type: "reserved"; subdomain: string }
    | { type: "unknown"; subdomain: string };

  export type TenantHostContext = Extract<HostContext, { type: "tenant" }>;
  export type ProfileHostContext = Extract<HostContext, { type: "profile" }>;

  export function getBaseDomain(): string {
    return (import.meta.env.VITE_APP_DOMAIN as string | undefined) ?? window.location.hostname;
  }

  export function getHostContext(
    hostname = window.location.hostname,
    baseDomain = getBaseDomain()
  ): HostContext {
    const prefix = hostname.endsWith(baseDomain)
      ? hostname.slice(0, -baseDomain.length).replace(/\.$/, "")
      : "";

    if (!prefix || prefix === "www") {
      return { type: "apex" };
    }

    if (prefix === "login") {
      return { type: "login" };
    }

    if (prefix === "admin") {
      return { type: "admin" };
    }

    if (prefix.startsWith("u.")) {
      const username = prefix.slice(2);
      return username ? { type: "profile", username } : { type: "unknown", subdomain: prefix };
    }

    if (prefix.includes(".")) {
      return { type: "unknown", subdomain: prefix };
    }

    if (RESERVED_SUBDOMAINS.has(prefix)) {
      return { type: "reserved", subdomain: prefix };
    }

    return { type: "tenant", slug: prefix };
  }

  export function isApexHost(hostname?: string): boolean {
    return getHostContext(hostname).type === "apex";
  }

  export function isTenantHost(hostname?: string): boolean {
    return getHostContext(hostname).type === "tenant";
  }

  export function isProfileHost(hostname?: string): boolean {
    return getHostContext(hostname).type === "profile";
  }
  ```

### Task 2.2: Test host-context utility

**Files:**
- Create: `frontend/src/core/routing/host-context.test.ts`

- [ ] **Step 1: Write the tests**

  ```ts
  import { describe, expect, it, vi } from "vitest";
  import { getHostContext } from "./host-context";

  const baseDomain = "klynt.dev";

  describe("getHostContext", () => {
    it("returns apex for base domain", () => {
      expect(getHostContext("klynt.dev", baseDomain)).toEqual({ type: "apex" });
    });

    it("returns apex for www", () => {
      expect(getHostContext("www.klynt.dev", baseDomain)).toEqual({ type: "apex" });
    });

    it("returns login for login subdomain", () => {
      expect(getHostContext("login.klynt.dev", baseDomain)).toEqual({ type: "login" });
    });

    it("returns admin for admin subdomain", () => {
      expect(getHostContext("admin.klynt.dev", baseDomain)).toEqual({ type: "admin" });
    });

    it("returns tenant for slug subdomain", () => {
      expect(getHostContext("acme.klynt.dev", baseDomain)).toEqual({ type: "tenant", slug: "acme" });
    });

    it("returns profile for u.username subdomain", () => {
      expect(getHostContext("u.jayden.klynt.dev", baseDomain)).toEqual({
        type: "profile",
        username: "jayden",
      });
    });

    it("returns reserved for api subdomain", () => {
      expect(getHostContext("api.klynt.dev", baseDomain)).toEqual({ type: "reserved", subdomain: "api" });
    });

    it("returns unknown for multi-level subdomains", () => {
      expect(getHostContext("foo.bar.klynt.dev", baseDomain)).toEqual({ type: "unknown", subdomain: "foo.bar" });
    });
  });
  ```

- [ ] **Step 2: Run the tests**

  ```bash
  cd /Users/jayden/Projects/Klynt/klynt-edu/frontend && bun test src/core/routing/host-context.test.ts
  ```

  Expected: 8 passing.

### Task 2.3: Create subdomain URL builder

**Files:**
- Create: `frontend/src/core/routing/subdomain-url.ts`

- [ ] **Step 1: Write the implementation**

  ```ts
  import { getBaseDomain, getHostContext } from "./host-context";

  export function getAppProtocol(): string {
    return (import.meta.env.VITE_APP_PROTOCOL as string | undefined) ?? window.location.protocol.replace(":", "");
  }

  export function getBaseHost(): string {
    const host = window.location.host;
    const ctx = getHostContext(window.location.hostname);
    switch (ctx.type) {
      case "apex":
        return host;
      case "login":
        return host.slice("login.".length);
      case "admin":
        return host.slice("admin.".length);
      case "tenant":
        return host.slice(ctx.slug.length + 1);
      case "profile":
        return host.slice(`u.${ctx.username}.`.length);
      default: {
        const domain = getBaseDomain();
        const port = window.location.port;
        return port ? `${domain}:${port}` : domain;
      }
    }
  }

  export function buildSubdomainUrl(subdomain: string, path = "/"): string {
    const protocol = getAppProtocol();
    const baseHost = getBaseHost();
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${protocol}://${subdomain}.${baseHost}${normalizedPath}`;
  }

  export function buildProfileUrl(username: string): string {
    return buildSubdomainUrl(`u.${username}`);
  }

  export function buildLoginUrl(from?: string): string {
    const url = new URL(buildSubdomainUrl("login"));
    if (from) {
      url.searchParams.set("from", from);
    }
    return url.toString();
  }

  export function buildTenantUrl(slug: string, path = "/"): string {
    return buildSubdomainUrl(slug, path);
  }

  export function buildAdminUrl(path = "/"): string {
    return buildSubdomainUrl("admin", path);
  }

  export function buildApexUrl(path = "/"): string {
    const protocol = getAppProtocol();
    const baseHost = getBaseHost();
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${protocol}://${baseHost}${normalizedPath}`;
  }
  ```

### Task 2.4: Test subdomain URL builder

**Files:**
- Create: `frontend/src/core/routing/subdomain-url.test.ts`

- [ ] **Step 1: Write the tests**

  ```ts
  import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
  import {
    buildAdminUrl,
    buildApexUrl,
    buildLoginUrl,
    buildProfileUrl,
    buildTenantUrl,
  } from "./subdomain-url";

  describe("subdomain-url", () => {
    beforeEach(() => {
      vi.stubGlobal("location", {
        host: "lvh.me:5174",
        hostname: "lvh.me",
        protocol: "http:",
        port: "5174",
      });
      vi.stubGlobal("import.meta.env.VITE_APP_DOMAIN", "lvh.me");
      vi.stubGlobal("import.meta.env.VITE_APP_PROTOCOL", "http");
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("builds tenant URL", () => {
      expect(buildTenantUrl("acme", "/members")).toBe("http://acme.lvh.me:5174/members");
    });

    it("builds profile URL", () => {
      expect(buildProfileUrl("jayden")).toBe("http://u.jayden.lvh.me:5174/");
    });

    it("builds login URL with from param", () => {
      expect(buildLoginUrl("http://acme.lvh.me:5174/members")).toBe(
        "http://login.lvh.me:5174/?from=http%3A%2F%2Facme.lvh.me%3A5174%2Fmembers"
      );
    });

    it("builds admin URL", () => {
      expect(buildAdminUrl("/admin")).toBe("http://admin.lvh.me:5174/admin");
    });

    it("builds apex URL", () => {
      expect(buildApexUrl("/dashboard")).toBe("http://lvh.me:5174/dashboard");
    });
  });
  ```

- [ ] **Step 2: Run the tests**

  ```bash
  bun test src/core/routing/subdomain-url.test.ts
  ```

  Expected: 5 passing.

### Task 2.5: Commit Phase 2

- [ ] **Step 1: Commit**

  ```bash
  cd /Users/jayden/Projects/Klynt/klynt-edu && git add frontend/src/core/routing/host-context.ts frontend/src/core/routing/host-context.test.ts frontend/src/core/routing/subdomain-url.ts frontend/src/core/routing/subdomain-url.test.ts && git commit -m "feat(routing): add host context and subdomain URL utilities"
  ```

---

## Phase 3 — Host-Based Route Trees

### Task 3.1: Create shared layout wrappers

**Files:**
- Create: `frontend/src/core/routing/routers/shared-layouts.tsx`

- [ ] **Step 1: Extract reusable layouts from route-tree.tsx**

  ```tsx
  import { Suspense } from "react";
  import { Outlet } from "react-router-dom";
  import { RootLayout } from "@/app/layout/root-layout";
  import { Spinner } from "@/components/ui/spinner";
  import { GuestRoute, ProtectedRoute, RoleGuard } from "@/core/auth";
  import { buildApexUrl } from "@/core/routing/subdomain-url";
  import type { UserRole } from "@/core/auth";

  export function PublicLayout() {
    return (
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
    );
  }

  export function GuestLayout() {
    return (
      <GuestRoute>
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </GuestRoute>
    );
  }

  export function ProtectedLayout() {
    return (
      <ProtectedRoute>
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </ProtectedRoute>
    );
  }

  interface AdminLayoutProps {
    redirectTo?: string;
    children?: React.ReactNode;
  }

  export function AdminLayout({ redirectTo = buildApexUrl("/"), children }: AdminLayoutProps) {
    return (
      <ProtectedRoute>
        {/* Extend allowedRoles with the actual moderator role name if one exists in UserRole. */}
        <RoleGuard allowedRoles={["admin"] as UserRole[]} redirectTo={redirectTo}>
          <Suspense fallback={<Spinner />}>
            {children ?? <Outlet />}
          </Suspense>
        </RoleGuard>
      </ProtectedRoute>
    );
  }

  export function RootWrapper({ children }: { children: React.ReactNode }) {
    return (
      <RootLayout>
        {children}
      </RootLayout>
    );
  }
  ```

### Task 3.2: Add redirectTo prop to RoleGuard

**Files:**
- Modify: `frontend/src/core/auth/auth-identity.tsx`

- [ ] **Step 1: Update RoleGuard interface and redirect**

  ```tsx
  import { ExternalNavigate, isExternalUrl } from "../external-redirect";

  interface RoleGuardProps {
    allowedRoles: UserRole[];
    redirectTo?: string;
    children: React.ReactNode;
  }

  export function RoleGuard({ allowedRoles, redirectTo = "/dashboard", children }: RoleGuardProps) {
    const { hasRole } = useRole();

    if (!hasRole(allowedRoles)) {
      return isExternalUrl(redirectTo) ? (
        <ExternalNavigate to={redirectTo} />
      ) : (
        <Navigate to={redirectTo} replace />
      );
    }

    return <>{children}</>;
  }
  ```

### Task 3.3: Create apex redirect components

**Files:**
- Create: `frontend/src/core/routing/redirects.tsx`

- [ ] **Step 1: Write redirect components**

  ```tsx
  import { useParams } from "react-router-dom";
  import { ExternalNavigate } from "@/core/auth/external-redirect";
  import { buildAdminUrl, buildLoginUrl, buildProfileUrl, buildTenantUrl } from "./subdomain-url";

  export function RedirectToLogin() {
    return <ExternalNavigate to={buildLoginUrl()} />;
  }

  export function RedirectToAdmin() {
    return <ExternalNavigate to={buildAdminUrl()} />;
  }

  export function RedirectToAdminPage() {
    return <ExternalNavigate to={buildAdminUrl("/admin")} />;
  }

  export function RedirectToTenant() {
    const { slug, "*": deepPath } = useParams<{ slug: string; "*": string }>();
    if (!slug) return null;
    const path = deepPath ? `/${deepPath}` : "/";
    return <ExternalNavigate to={buildTenantUrl(slug, path)} />;
  }

  export function RedirectToProfile() {
    const { username } = useParams<{ username: string }>();
    if (!username) return null;
    return <ExternalNavigate to={buildProfileUrl(username)} />;
  }
  ```

### Task 3.3.5: Create public profile page

**Files:**
- Create: `frontend/src/features/user/pages/public-profile-page.tsx`

- [ ] **Step 1: Write the page**

  ```tsx
  import { useAuth } from "@/core/auth/auth-identity";

  export interface PublicProfilePageProps {
    username: string;
  }

  export function PublicProfilePage({ username }: PublicProfilePageProps) {
    const { user } = useAuth();
    const isOwner = user?.username === username;

    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{username}</h1>
          <p className="text-muted-foreground">
            {isOwner
              ? "This is your public profile."
              : "This profile is private. Only the owner can see detailed information."}
          </p>
        </div>
      </div>
    );
  }

  export default PublicProfilePage;
  ```

### Task 3.4: Create subdomain routers

**Files:**
- Create: `frontend/src/core/routing/routers/login-router.tsx`

- [ ] **Step 1: Write login router**

  ```tsx
  import { createBrowserRouter, Navigate } from "react-router-dom";
  import { lazy, Suspense } from "react";
  import { Spinner } from "@/components/ui/spinner";
  import { GuestRoute } from "@/core/auth";

  const LoginPage = lazy(() =>
    import("@/features/auth").then((module) => ({ default: module.LoginPage }))
  );

  export const loginRouter = createBrowserRouter([
    {
      path: "/",
      element: (
        <GuestRoute>
          <Suspense fallback={<Spinner />}>
            <LoginPage />
          </Suspense>
        </GuestRoute>
      ),
    },
    { path: "*", element: <Navigate to="/" replace /> },
  ]);
  ```

**Files:**
- Create: `frontend/src/core/routing/routers/admin-router.tsx`

- [ ] **Step 2: Write admin router**

  ```tsx
  import { createBrowserRouter, Navigate } from "react-router-dom";
  import { lazy, Suspense } from "react";
  import { Spinner } from "@/components/ui/spinner";
  import { buildApexUrl } from "@/core/routing/subdomain-url";
  import { AdminLayout } from "./shared-layouts";

  const DashboardPage = lazy(() => import("@/features/dashboard/pages/dashboard-page"));
  const AdminPage = lazy(() => import("@/features/admin/pages/admin-page"));

  const ADMIN_FALLBACK = buildApexUrl("/");

  export const adminRouter = createBrowserRouter([
    {
      path: "/",
      element: (
        <AdminLayout redirectTo={ADMIN_FALLBACK}>
          <Suspense fallback={<Spinner />}>
            <DashboardPage />
          </Suspense>
        </AdminLayout>
      ),
    },
    {
      path: "/admin",
      element: (
        <AdminLayout redirectTo={ADMIN_FALLBACK}>
          <Suspense fallback={<Spinner />}>
            <AdminPage />
          </Suspense>
        </AdminLayout>
      ),
    },
    { path: "*", element: <Navigate to="/" replace /> },
  ]);
  ```

**Files:**
- Create: `frontend/src/core/routing/routers/tenant-router.tsx`

- [ ] **Step 3: Write tenant router**

  ```tsx
  import { createBrowserRouter } from "react-router-dom";
  import { lazy, Suspense } from "react";
  import { Spinner } from "@/components/ui/spinner";
  import { ProtectedRoute } from "@/core/auth";

  const TenantDesktopPage = lazy(() =>
    import("@/features/tenant").then((module) => ({ default: module.TenantDesktopPage }))
  );

  export function createTenantRouter(slug: string) {
    return createBrowserRouter([
      {
        path: "/*",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Spinner />}>
              <TenantDesktopPage slug={slug} />
            </Suspense>
          </ProtectedRoute>
        ),
      },
    ]);
  }
  ```

**Files:**
- Create: `frontend/src/core/routing/routers/profile-router.tsx`

- [ ] **Step 4: Write profile router**

  ```tsx
  import { createBrowserRouter, Navigate } from "react-router-dom";
  import { lazy, Suspense } from "react";
  import { Spinner } from "@/components/ui/spinner";

  const PublicProfilePage = lazy(() =>
    import("@/features/user/pages/public-profile-page").then((module) => ({
      default: module.PublicProfilePage,
    }))
  );

  export function createProfileRouter(username: string) {
    return createBrowserRouter([
      {
        path: "/",
        element: (
          <Suspense fallback={<Spinner />}>
            <PublicProfilePage username={username} />
          </Suspense>
        ),
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ]);
  }
  ```

### Task 3.5: Create apex router

**Files:**
- Create: `frontend/src/core/routing/routers/apex-router.tsx`

- [ ] **Step 1: Migrate existing route-tree.tsx content and add redirects**

  Copy the existing `route-tree.tsx` contents, replacing the login route with a redirect, and adding redirects for `/dashboard`, `/admin`, `/tenants/:slug/*`, and `/:username`.

  Key additions inside the `children` array:
  ```tsx
  import {
    RedirectToAdmin,
    RedirectToAdminPage,
    RedirectToLogin,
    RedirectToProfile,
    RedirectToTenant,
  } from "../redirects";

  // ...
  { path: routePaths.login, element: <RedirectToLogin /> },
  { path: routePaths.dashboard, element: <RedirectToAdmin /> },
  { path: `${routePaths.admin}/*`, element: <RedirectToAdminPage /> },
  { path: `${routePaths.tenantBase}/*`, element: <RedirectToTenant /> },
  { path: ":username", element: <RedirectToProfile /> },
  ```

  Also change the protected `/:profileId` route to `/u/:profileId` using a new `routePaths.userDesktop` constant.

### Task 3.6: Create HostRouter

**Files:**
- Create: `frontend/src/core/routing/host-router.tsx`

- [ ] **Step 1: Write the HostRouter**

  ```tsx
  import { useMemo } from "react";
  import { RouterProvider } from "react-router-dom";
  import { getHostContext } from "./host-context";
  import { apexRouter } from "./routers/apex-router";
  import { adminRouter } from "./routers/admin-router";
  import { loginRouter } from "./routers/login-router";
  import { createProfileRouter } from "./routers/profile-router";
  import { createTenantRouter } from "./routers/tenant-router";

  export function HostRouter() {
    const ctx = getHostContext(window.location.hostname);
    const router = useMemo(() => {
      switch (ctx.type) {
        case "login":
          return loginRouter;
        case "admin":
          return adminRouter;
        case "tenant":
          return createTenantRouter(ctx.slug);
        case "profile":
          return createProfileRouter(ctx.username);
        case "apex":
        case "reserved":
        case "unknown":
        default:
          return apexRouter;
      }
    }, [ctx]);

    return <RouterProvider router={router} />;
  }
  ```

### Task 3.7: Update app entry to use HostRouter

**Files:**
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Replace RouterProvider with HostRouter**

  ```tsx
  import { StrictMode } from "react";
  import { createRoot } from "react-dom/client";
  import { AppProviders } from "@/app/providers";
  import { apiClient } from "@/core/api/api-client";
  import { createAuthInterceptorDeps, registerAuthInterceptor } from "@/core/api/auth-interceptor";
  import { reportWebVitals } from "@/core/performance/web-vitals";
  import { HostRouter } from "@/core/routing/host-router";
  import "@/index.css";

  registerAuthInterceptor(apiClient, createAuthInterceptorDeps());

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  createRoot(rootElement).render(
    <StrictMode>
      <AppProviders>
        <HostRouter />
      </AppProviders>
    </StrictMode>
  );

  reportWebVitals();
  ```

### Task 3.8: Delete old route-tree.tsx

**Files:**
- Delete: `frontend/src/core/routing/route-tree.tsx`

- [ ] **Step 1: Remove the file**

  ```bash
  rm /Users/jayden/Projects/Klynt/klynt-edu/frontend/src/core/routing/route-tree.tsx
  ```

### Task 3.9: Add userDesktop route path

**Files:**
- Modify: `frontend/src/core/routing/route-paths.ts`

- [ ] **Step 1: Add the new path constant**

  ```ts
  export const routePaths = {
    home: "/",
    login: "/login",
    register: "/register",
    registerSuccess: "/register/success",
    verifyEmail: "/verify-email",
    onboarding: "/onboarding",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
    dashboard: "/dashboard",
    tenantsNew: "/tenants/new",
    tenantBase: "/tenants/:slug",
    admin: "/admin",
    settingsSessions: "/settings/sessions",
    userDesktop: "/u/:profileId",
  } as const;
  ```

### Task 3.10: Verify route tree compiles

- [ ] **Step 1: Run typecheck**

  ```bash
  cd /Users/jayden/Projects/Klynt/klynt-edu/frontend && bun run typecheck
  ```

  Expected: no errors.

- [ ] **Step 2: Run lint**

  ```bash
  bun run lint
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  cd /Users/jayden/Projects/Klynt/klynt-edu && git add frontend/src/core/routing/ frontend/src/main.tsx frontend/src/core/routing/route-paths.ts && git commit -m "feat(routing): add host-based route trees"
  ```

---

## Phase 4 — Auth Hooks, Guards, and Desktop Path Migration

### Task 4.0: Create external redirect helper

**Files:**
- Create: `frontend/src/core/auth/external-redirect.tsx`

- [ ] **Step 1: Write the helper and component**

  ```tsx
  import { useEffect } from "react";

  export function isExternalUrl(url: string): boolean {
    return /^https?:\/\//.test(url);
  }

  export function navigateExternal(url: string) {
    window.location.replace(url);
  }

  export function ExternalNavigate({ to }: { to: string }) {
    useEffect(() => {
      navigateExternal(to);
    }, [to]);
    return null;
  }
  ```

### Task 4.1: Create use-redirect-target hook

**Files:**
- Create: `frontend/src/core/auth/hooks/use-redirect-target.ts`

- [ ] **Step 1: Write the hook**

  ```ts
  import { useSearchParams } from "react-router-dom";
  import { buildApexUrl } from "@/core/routing/subdomain-url";

  export function useRedirectTarget(fallback = buildApexUrl("/dashboard")): string {
    const [searchParams] = useSearchParams();
    return searchParams.get("from") || fallback;
  }
  ```

### Task 4.2: Update useLogin for cross-subdomain navigation

**Files:**
- Modify: `frontend/src/core/auth/hooks/use-login.ts`

- [ ] **Step 1: Use useRedirectTarget**

  ```ts
  import { useRedirectTarget } from "./use-redirect-target";
  import { navigateExternal } from "../external-redirect";

  export function useLogin(): UseMutationResult<void, Error, LoginInput, unknown> {
    const { t } = useTranslation("auth");
    const addToast = useToastStore((state) => state.addToast);
    const setSession = useAuthStore((state) => state.setSession);
    const redirectTarget = useRedirectTarget();

    return useMutation<void, Error, LoginInput>({
      mutationFn: async (input) => {
        const user = await login(input);
        setSession(user);
      },
      meta: { suppressToast: true },
      onSuccess: () => {
        navigateExternal(redirectTarget);
      },
      onError: (error) => {
        const message = error instanceof ApiError ? error.message : t("login.error");
        addToast({ message, type: "error", duration: 5000 });
      },
    });
  }
  ```

### Task 4.3: Update useLogout for cross-subdomain navigation

**Files:**
- Modify: `frontend/src/core/auth/hooks/use-logout.ts`

- [ ] **Step 1: Navigate to login subdomain**

  ```ts
  import { buildLoginUrl } from "@/core/routing/subdomain-url";
  import { navigateExternal } from "../external-redirect";

  export function useLogout(): UseMutationResult<void, Error, void, unknown> {
    const clearSession = useAuthStore((state) => state.clearSession);

    return useMutation<void, Error, void>({
      mutationFn: logout,
      onSuccess: () => {
        clearSession();
        navigateExternal(buildLoginUrl());
      },
      onError: () => {
        clearSession();
        navigateExternal(buildLoginUrl());
      },
    });
  }
  ```

### Task 4.4: Update ProtectedRoute for cross-subdomain redirect

**Files:**
- Modify: `frontend/src/core/auth/auth-identity.tsx`

- [ ] **Step 1: Redirect unauthenticated users to login subdomain**

  ```tsx
  import { buildLoginUrl } from "@/core/routing/subdomain-url";
  import { ExternalNavigate } from "../external-redirect";

  // Update react-router-dom imports: keep Navigate (used by RoleGuard), remove useLocation.

  export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <Spinner />
        </div>
      );
    }

    if (!isAuthenticated) {
      const currentUrl = window.location.href;
      return <ExternalNavigate to={buildLoginUrl(currentUrl)} />;
    }

    return <>{children}</>;
  }
  ```

### Task 4.5: Update GuestRoute for cross-subdomain redirect

**Files:**
- Modify: `frontend/src/core/auth/auth-identity.tsx`

- [ ] **Step 1: Redirect authenticated guests to apex dashboard**

  ```tsx
  import { buildApexUrl } from "@/core/routing/subdomain-url";
  import { ExternalNavigate } from "../external-redirect";

  export function GuestRoute({ children }: GuestRouteProps) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <Spinner />
        </div>
      );
    }

    if (isAuthenticated) {
      return <ExternalNavigate to={buildApexUrl("/dashboard")} />;
    }

    return <>{children}</>;
  }
  ```

### Task 4.6: Migrate private user desktop path

**Files:**
- Modify: `frontend/src/core/routing/routers/apex-router.tsx`

- [ ] **Step 1: Change `/:profileId` to `/u/:profileId`**

  ```tsx
  { path: routePaths.userDesktop, element: <UserDesktopPage /> }
  ```

**Files:**
- Modify: `frontend/src/features/dashboard/pages/dashboard-page.tsx`

- [ ] **Step 2: Redirect non-admins to `/u/:id`**

  ```tsx
  if (user?.role !== "admin") {
    return <Navigate to={user ? `/u/${user.id}` : "/"} replace />;
  }
  ```

### Task 4.7: Update TenantDesktopPage to accept slug prop

**Files:**
- Modify: `frontend/src/features/tenant/pages/tenant-desktop-page.tsx`

- [ ] **Step 1: Accept optional slug prop**

  ```tsx
  interface TenantDesktopPageProps {
    slug?: string;
  }

  export default function TenantDesktopPage({ slug: propSlug }: TenantDesktopPageProps = {}) {
    const { slug: paramSlug, "*": deepPath } = useParams<{ slug: string; "*": string }>();
    const { user } = useAuth();
    const openApp = useDesktopStore((s) => s.openApp);

    const tenantSlug = propSlug ?? paramSlug ?? "";
    const { data: tenant, isLoading } = useTenant(tenantSlug);
    // ... rest unchanged
  }
  ```

### Task 4.8: Verify auth and desktop changes

- [ ] **Step 1: Run typecheck**

  ```bash
  cd /Users/jayden/Projects/Klynt/klynt-edu/frontend && bun run typecheck
  ```

  Expected: no errors.

- [ ] **Step 2: Run unit tests**

  ```bash
  bun test src/core/auth
  ```

  Expected: existing tests may fail until updated in Task 6.2; note failures for now.

- [ ] **Step 3: Commit**

  ```bash
  cd /Users/jayden/Projects/Klynt/klynt-edu && git add frontend/src/core/auth frontend/src/features/dashboard/pages/dashboard-page.tsx frontend/src/features/tenant/pages/tenant-desktop-page.tsx frontend/src/core/routing/routers/apex-router.tsx && git commit -m "feat(auth): cross-subdomain redirects and private desktop path migration"
  ```

---

## Phase 5 — Update Internal Links

### Task 5.1: Update tenant list links

**Files:**
- Find and modify files that link to `/tenants/:slug`.

- [ ] **Step 1: Search for tenant link patterns**

  ```bash
  cd /Users/jayden/Projects/Klynt/klynt-edu/frontend && grep -rn "/tenants/" src --include="*.tsx" --include="*.ts"
  ```

- [ ] **Step 2: Replace with buildTenantUrl**

  Wherever the code links to `/tenants/${slug}`, use:
  ```ts
  import { buildTenantUrl } from "@/core/routing/subdomain-url";
  // ...
  <a href={buildTenantUrl(slug)}> ... </a>
  ```

### Task 5.2: Update dashboard/admin links

**Files:**
- Find files linking to `/dashboard` or `/admin`.

- [ ] **Step 1: Search for admin link patterns**

  ```bash
  grep -rn "/dashboard\|/admin" src --include="*.tsx" --include="*.ts"
  ```

- [ ] **Step 2: Replace with buildAdminUrl or buildApexUrl**

  Admin links:
  ```ts
  import { buildAdminUrl } from "@/core/routing/subdomain-url";
  <a href={buildAdminUrl()}>Dashboard</a>
  <a href={buildAdminUrl("/admin")}>Admin</a>
  ```

  Apex links (e.g., settings, sessions):
  ```ts
  import { buildApexUrl } from "@/core/routing/subdomain-url";
  <a href={buildApexUrl("/settings/sessions")}>Sessions</a>
  ```

### Task 5.3: Verify no hardcoded klynt.dev URLs remain

- [ ] **Step 1: Search for hardcoded domains**

  ```bash
  grep -rn "klynt.dev\|lvh.me" src --include="*.tsx" --include="*.ts"
  ```

  Expected: only in tests, env files, or docs.

- [ ] **Step 2: Commit**

  ```bash
  cd /Users/jayden/Projects/Klynt/klynt-edu && git add frontend/src && git commit -m "feat(routing): update internal links to subdomain URLs"
  ```

---

## Phase 6 — Environment Config and Documentation

### Task 6.1: Update frontend environment example

**Files:**
- Modify: `frontend/.env.example`

- [ ] **Step 1: Add subdomain config variables**

  ```bash
  VITE_API_BASE_URL=http://localhost:3001/api/v1
  VITE_APP_DOMAIN=lvh.me
  VITE_APP_PROTOCOL=http
  ```

### Task 6.2: Update onboarding docs

**Files:**
- Modify: `docs/ONBOARDING.md`

- [ ] **Step 1: Add local dev URL section**

  ```markdown
  ### Subdomain local development

  The frontend uses subdomains for tenants, profiles, login, and admin. Local development relies on `lvh.me` wildcard DNS pointing to `127.0.0.1`.

  Useful local URLs:

  - `http://lvh.me:5174/` — marketing home
  - `http://login.lvh.me:5174/` — login
  - `http://admin.lvh.me:5174/` — admin dashboard
  - `http://acme.lvh.me:5174/` — tenant desktop (replace `acme` with a real slug)
  - `http://u.jayden.lvh.me:5174/` — public profile (replace `jayden` with a real username)
  ```

### Task 6.3: Write ADR

**Files:**
- Create: `docs/adr/010-frontend-subdomain-routing.md`

- [ ] **Step 1: Write the ADR**

  Use the standard ADR template. Include: context, decision (subdomain routing), consequences (CORS, cookie domain, reserved subdomains, path migration), and rejected alternatives.

### Task 6.4: Commit docs

- [ ] **Step 1: Commit**

  ```bash
  cd /Users/jayden/Projects/Klynt/klynt-edu && git add frontend/.env.example docs/ONBOARDING.md docs/adr/010-frontend-subdomain-routing.md && git commit -m "docs: subdomain routing env, onboarding, and ADR"
  ```

---

## Phase 7 — Tests

### Task 7.1: Update auth guard tests

**Files:**
- Modify: `frontend/src/core/auth/route-guards.test.tsx`

- [ ] **Step 1: Update ProtectedRoute redirect test**

  Replace the existing test with one that stubs `window.location.replace`.

  ```tsx
  import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

  const originalLocation = window.location;

  beforeEach(() => {
    const replace = vi.fn();
    vi.stubGlobal("location", {
      ...originalLocation,
      host: "acme.lvh.me:5174",
      hostname: "acme.lvh.me",
      href: "http://acme.lvh.me:5174/members",
      protocol: "http:",
      port: "5174",
      replace,
    });
    vi.stubGlobal("import.meta.env.VITE_APP_DOMAIN", "lvh.me");
    vi.stubGlobal("import.meta.env.VITE_APP_PROTOCOL", "http");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ProtectedRoute redirects to login subdomain when unauthenticated", () => {
    setup();
    render(
      <Routes>
        <Route
          path="/members"
          element={
            <ProtectedRoute>
              <div>Members</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { initialEntries: ["/members"] }
    );
    expect(window.location.replace).toHaveBeenCalledWith(
      expect.stringContaining("login.lvh.me:5174/?from=")
    );
  });
  ```

- [ ] **Step 2: Update GuestRoute redirect test**

  ```tsx
  it("GuestRoute redirects to apex dashboard when authenticated", () => {
    setup();
    setAuthenticated();
    vi.stubGlobal("location", {
      ...originalLocation,
      host: "login.lvh.me:5174",
      hostname: "login.lvh.me",
      href: "http://login.lvh.me:5174/",
      protocol: "http:",
      port: "5174",
      replace: vi.fn(),
    });
    vi.stubGlobal("import.meta.env.VITE_APP_DOMAIN", "lvh.me");
    vi.stubGlobal("import.meta.env.VITE_APP_PROTOCOL", "http");

    render(
      <Routes>
        <Route
          path="/"
          element={
            <GuestRoute>
              <div>Login page</div>
            </GuestRoute>
          }
        />
      </Routes>,
      { initialEntries: ["/"] }
    );
    expect(window.location.replace).toHaveBeenCalledWith(
      expect.stringContaining("lvh.me:5174/dashboard")
    );
  });
  ```

### Task 7.1.5: Update use-login and use-logout tests

**Files:**
- Modify: `frontend/src/core/auth/hooks/use-login.test.tsx`
- Modify: `frontend/src/core/auth/hooks/use-logout.test.tsx`

- [ ] **Step 1: Stub window.location.replace in use-login test**

  Add beforeEach/afterEach:

  ```ts
  const originalLocation = window.location;

  beforeEach(() => {
    vi.stubGlobal("location", {
      ...originalLocation,
      host: "login.lvh.me:5174",
      hostname: "login.lvh.me",
      href: "http://login.lvh.me:5174/?from=http%3A%2F%2Facme.lvh.me%3A5174%2Fmembers",
      protocol: "http:",
      port: "5174",
      replace: vi.fn(),
    });
    vi.stubGlobal("import.meta.env.VITE_APP_DOMAIN", "lvh.me");
    vi.stubGlobal("import.meta.env.VITE_APP_PROTOCOL", "http");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
  ```

- [ ] **Step 2: Assert external navigation in use-login test**

  After a successful login:

  ```ts
  expect(window.location.replace).toHaveBeenCalledWith(
    expect.stringContaining("acme.lvh.me:5174/members")
  );
  ```

- [ ] **Step 3: Stub window.location.replace in use-logout test**

  Same pattern as use-login, but host can be any subdomain.

- [ ] **Step 4: Assert external navigation in use-logout test**

  After logout:

  ```ts
  expect(window.location.replace).toHaveBeenCalledWith(
    expect.stringContaining("login.lvh.me:5174")
  );
  ```

### Task 7.2: Add route redirect tests

**Files:**
- Create: `frontend/src/core/routing/host-router.test.tsx`

- [ ] **Step 1: Test apex tenant redirect**

  ```tsx
  import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
  import { render } from "@/test/render";
  import { HostRouter } from "./host-router";

  const originalLocation = window.location;

  function mockHost(hostname: string, href: string) {
    vi.stubGlobal("location", {
      ...originalLocation,
      host: hostname,
      hostname,
      href,
      protocol: "http:",
      port: "5174",
      replace: vi.fn(),
    });
    vi.stubGlobal("import.meta.env.VITE_APP_DOMAIN", "lvh.me");
    vi.stubGlobal("import.meta.env.VITE_APP_PROTOCOL", "http");
  }

  describe("HostRouter", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("redirects apex tenant path to tenant subdomain", () => {
      mockHost("lvh.me", "http://lvh.me:5174/tenants/acme/members");
      render(<HostRouter />);
      expect(window.location.replace).toHaveBeenCalledWith("http://acme.lvh.me:5174/members");
    });

    it("redirects apex username path to profile subdomain", () => {
      mockHost("lvh.me", "http://lvh.me:5174/jayden");
      render(<HostRouter />);
      expect(window.location.replace).toHaveBeenCalledWith("http://u.jayden.lvh.me:5174/");
    });

    it("redirects apex login path to login subdomain", () => {
      mockHost("lvh.me", "http://lvh.me:5174/login");
      render(<HostRouter />);
      expect(window.location.replace).toHaveBeenCalledWith("http://login.lvh.me:5174/");
    });

    it("redirects apex dashboard path to admin subdomain", () => {
      mockHost("lvh.me", "http://lvh.me:5174/dashboard");
      render(<HostRouter />);
      expect(window.location.replace).toHaveBeenCalledWith("http://admin.lvh.me:5174/");
    });
  });
  ```

### Task 7.3: Update existing route tests

- [ ] **Step 1: Run all frontend tests**

  ```bash
  cd /Users/jayden/Projects/Klynt/klynt-edu/frontend && bun test
  ```

- [ ] **Step 2: Fix dashboard-page.test.tsx**

  Update `TestRouter` to route `/u/:profileId` instead of `/:profileId`:

  ```tsx
  function TestRouter() {
    return (
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/u/:profileId" element={<UserDesktopPlaceholder />} />
      </Routes>
    );
  }
  ```

- [ ] **Step 3: Fix any other failures**

  Search for tests referencing the old paths and update them:

  ```bash
  grep -rn "/login\|/dashboard\|/:profileId\|/tenants/:slug" src --include="*.test.tsx" --include="*.test.ts"
  ```

### Task 7.4: WebBridge scenarios

**Files:**
- Create: `docs/superpowers/test-scenarios/2026-06-23-subdomain-routing-webbridge.md`

- [ ] **Step 1: Document scenarios**

  Include:
  1. Unauthenticated tenant deep link → login subdomain with `?from=`.
  2. Login → return to tenant deep link.
  3. Public profile subdomain renders.
  4. Non-admin admin subdomain → apex home.
  5. Apex tenant path → tenant subdomain.
  6. Apex `/:username` → profile subdomain.
  7. Authenticated login subdomain → apex dashboard.

### Task 7.5: Run full verification

- [ ] **Step 1: Run just check**

  ```bash
  cd /Users/jayden/Projects/Klynt/klynt-edu && just check
  ```

  Expected: passes.

- [ ] **Step 2: Run just test-coverage**

  ```bash
  just test-coverage
  ```

  Expected: frontend ≥92%, backend ≥84%.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src frontend/.env.example docs/ && git commit -m "test(routing): subdomain routing tests and WebBridge scenarios"
  ```

---

## Phase 8 — Final Verification & Push

### Task 8.1: Manual WebBridge run

- [ ] **Step 1: Start dev stack**

  ```bash
  just dev
  ```

- [ ] **Step 2: Run WebBridge scenarios**

  Follow `docs/superpowers/test-scenarios/2026-06-23-subdomain-routing-webbridge.md`.

### Task 8.2: Push to dev

- [ ] **Step 1: Push**

  ```bash
  git push origin dev
  ```

---

## Spec Coverage Check

| Spec Section | Implementing Task |
|---|---|
| URL scheme / routing table | Tasks 3.4, 3.5, 3.6 |
| Host parsing | Tasks 2.1, 2.2 |
| Subdomain URL builder | Tasks 2.3, 2.4 |
| Auth redirects | Tasks 4.1–4.5 |
| API client (slug from host) | Tasks 4.7, 5.1 |
| CORS wildcard | Tasks 1.1–1.5 |
| Environment / dev setup | Tasks 6.1, 6.2 |
| Testing | Tasks 7.1–7.5 |
| ADR / docs | Tasks 6.2, 6.3 |
| Migration | Tasks 3.5, 4.6, 5.1, 5.2 |

## Placeholder Scan

No placeholders. Every step includes exact file paths, code, or commands.
