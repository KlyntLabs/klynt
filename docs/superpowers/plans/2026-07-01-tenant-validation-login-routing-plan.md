# Tenant Validation & Login Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject invalid tenant subdomains with a "system invalid" page + 5-second redirect, and force all tenant login flows to a single canonical `login.{baseDomain}` page.

**Architecture:** A lightweight public backend endpoint tells the frontend whether a tenant slug exists before auth. The tenant router wraps its protected tree in a `TenantGuard` that either renders the desktop or an `InvalidTenantPage`. Login URL construction and host parsing are fixed so `login.{tenant}.{domain}` is never generated and is redirected to the canonical login host.

**Tech Stack:** Rust (Axum), React 19 + React Router 7 + TanStack Query, TypeScript, Zod/i18n, Vitest, cargo nextest.

## Global Constraints

- All user-facing strings must be mirrored in `en`, `vi`, and `cn` i18n namespaces.
- Frontend source files stay under 300 lines; backend source files stay under 400 lines.
- All backend SQLx queries use compile-time-checked macros and update `.sqlx` offline cache via `just sqlx-prepare`.
- No new compiler, Clippy, or Biome warnings (`just check`).
- Frontend tests must pass with coverage; backend integration tests must pass.
- `VITE_APP_DOMAIN` must be the real base domain (`localhost` for local dev, `klynt.dev` for production).

---

## File map

| File | Responsibility |
|------|---------------|
| `backend/crates/gateways/src/routes/tenants.rs` | Add `GET /{tenant_slug}/public` handler and wire it **outside** the membership-required middleware. |
| `backend/crates/services/tenant_service/src/lib.rs` | Expose `get_by_slug_public(slug)` (reuses existing `get_by_slug`). |
| `frontend/src/features/tenant/api/tenant-api.ts` | Add `getTenantPublic(slug): Promise<PublicTenant>` function. |
| `frontend/src/features/tenant/hooks/use-tenant.ts` | Add `useTenantPublic(slug)` hook using `getTenantPublic`. |
| `frontend/src/core/routing/components/invalid-tenant-page.tsx` | New page: blank centered layout, localized "system invalid" message, 5-second redirect to apex. |
| `frontend/src/core/routing/components/tenant-guard.tsx` | New component: fetches public tenant, renders spinner/invalid/children. |
| `frontend/src/core/routing/routers/tenant-router.tsx` | Replace direct `TenantDesktopPage` with `TenantGuard -> ProtectedRoute -> TenantDesktopPage`. |
| `frontend/src/core/routing/host-context.ts` | Add `isLoginMisrouteHost(hostname, baseDomain)` helper; `getHostContext` returns `{ type: "login_misroute" }` for `login.{something}.{baseDomain}`. |
| `frontend/src/core/routing/host-router.tsx` | Handle `login_misroute` by redirecting to `buildLoginUrl()`. |
| `frontend/src/core/routing/redirects.tsx` | Add `RedirectToCanonicalLogin` component. |
| i18n files (`public/locales/{en,vi,cn}/errors.json`) | Add `systemInvalid`, `systemInvalidRedirect`. |
| `frontend/src/core/routing/host-context.test.ts` | Test `login.tenant.domain` returns login misroute. |
| `frontend/src/core/routing/subdomain-router.test.ts` | Test `buildLoginUrl()` never contains tenant sub-domain. |
| `frontend/src/core/routing/components/invalid-tenant-page.test.tsx` | Test render + redirect after timer. |
| `backend/crates/gateways/tests/tenant_routes_test.rs` | Integration test for public tenant lookup. |
| `.env.example` + local `.env` | Set `VITE_APP_DOMAIN=localhost`, `KLYNT_COOKIE_DOMAIN=localhost`, and allowed origins for `*.localhost`. |

---

### Task 1: Backend public tenant lookup endpoint

**Files:**
- Modify: `backend/crates/gateways/src/routes/tenants.rs`
- Test: `backend/crates/gateways/tests/tenant_routes_test.rs`

**Interfaces:**
- Consumes: `tenant_service::get_by_slug(&ctx, slug)`
- Produces: `GET /api/v1/tenants/{tenant_slug}/public` → `200 { data: PublicTenantResponse }` or `404`

- [ ] **Step 1: Write the failing backend integration test**

```rust
#[tokio::test]
async fn public_tenant_lookup_returns_200_for_existing_tenant() {
    let ctx = TestContext::new().await;
    let token = ctx.create_user_and_login("owner@example.com").await;
    let _ = ctx.create_tenant(&token, "acme-public", "Acme Public").await;

    let resp = ctx
        .client
        .get(&format!("{}/api/v1/tenants/acme-public/public", ctx.api_url))
        .send()
        .await;

    assert_eq!(resp.status(), StatusCode::OK);
    let body = resp.json::<serde_json::Value>().await.unwrap();
    assert_eq!(body["data"]["slug"], "acme-public");
    assert_eq!(body["data"]["name"], "Acme Public");
}

#[tokio::test]
async fn public_tenant_lookup_returns_404_for_missing_tenant() {
    let ctx = TestContext::new().await;
    let resp = ctx
        .client
        .get(&format!("{}/api/v1/tenants/no-such-tenant/public", ctx.api_url))
        .send()
        .await;

    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && cargo nextest run -p klynt-gateways public_tenant_lookup`
Expected: FAIL with 404 because route/handler not defined.

- [ ] **Step 3: Add the public route and handler**

In `tenants.rs`, add a new response type and handler:

```rust
#[derive(serde::Serialize)]
struct PublicTenantResponse {
    slug: String,
    name: String,
}

async fn get_tenant_public(
    State(services): State<Services>,
    Path(tenant_slug): Path<String>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let ctx = base::ctx::ExecutionContext::anonymous(); // public, no actor
    let slug = domain::TenantSlug::parse(&tenant_slug)
        .map_err(|e| crate::GatewayError::BadRequest(e.to_string()))?;
    let tenant = services
        .tenant
        .get_by_slug(&ctx, &slug)
        .await?
        .ok_or_else(|| crate::GatewayError::NotFound(format!("Tenant not found: {slug}")))?;

    Ok(Json(SuccessResponse::ok(PublicTenantResponse {
        slug: tenant.slug.to_string(),
        name: tenant.name.to_string(),
    })))
}
```

Wire it in `routes()` before the member-required merge:

```rust
axum::Router::new()
    .route("/", axum::routing::post(create_tenant))
    .route("/", axum::routing::get(list_my_tenants))
    .route("/{tenant_slug}/public", axum::routing::get(get_tenant_public))
    .route("/invites/{token}/accept", axum::routing::post(accept_invite))
    .merge(member_required_routes)
```

> Note: `get_by_slug` currently takes `&ExecutionContext`; if it requires auth context internally, use `ExecutionContext::anonymous()` or the existing empty context helper. Ensure no unauthorized data leaks.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && cargo nextest run -p klynt-gateways public_tenant_lookup`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/crates/gateways/src/routes/tenants.rs backend/crates/gateways/tests/tenant_routes_test.rs
just sqlx-prepare
git add backend/.sqlx
git commit -m "feat(api): public tenant lookup endpoint for subdomain validation"
```

---

### Task 2: Frontend public tenant API + hook

**Files:**
- Modify: `frontend/src/features/tenant/api/tenant-api.ts`
- Modify: `frontend/src/features/tenant/types.ts`
- Modify: `frontend/src/features/tenant/hooks/use-tenant.ts`
- Test: create `frontend/src/features/tenant/api/tenant-api.test.ts` (if not existing; otherwise add cases)

**Interfaces:**
- Consumes: `apiClient.get`/`
- Produces: `getTenantPublic(slug: string): Promise<PublicTenant>`; `useTenantPublic(slug: string)`

- [ ] **Step 1: Add `PublicTenant` type**

In `frontend/src/features/tenant/types.ts`:

```typescript
export interface PublicTenant {
  slug: string;
  name: string;
}
```

- [ ] **Step 2: Add API function**

In `frontend/src/features/tenant/api/tenant-api.ts`:

```typescript
export async function getTenantPublic(slug: string): Promise<PublicTenant> {
  const { data } = await apiClient.get<{ data: PublicTenant }>(`/tenants/${slug}/public`);
  return data.data;
}
```

- [ ] **Step 3: Add hook**

In `frontend/src/features/tenant/hooks/use-tenant.ts`:

```typescript
export function useTenantPublic(slug: string) {
  return useQuery({
    queryKey: ["tenants", slug, "public"],
    queryFn: () => getTenantPublic(slug),
    enabled: slug.length > 0,
    retry: false,
  });
}
```

- [ ] **Step 4: Add unit test**

```typescript
import { describe, it, expect } from "vitest";
import { getTenantPublic } from "./tenant-api";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";

describe("getTenantPublic", () => {
  it("returns tenant data on 200", async () => {
    server.use(
      http.get("/api/v1/tenants/acme/public", () =>
        HttpResponse.json({ data: { slug: "acme", name: "Acme" } })
      )
    );
    const result = await getTenantPublic("acme");
    expect(result).toEqual({ slug: "acme", name: "Acme" });
  });

  it("throws on 404", async () => {
    server.use(
      http.get("/api/v1/tenants/acme/public", () =>
        HttpResponse.json({ error: "not found" }, { status: 404 })
      )
    );
    await expect(getTenantPublic("acme")).rejects.toThrow();
  });
});
```

- [ ] **Step 5: Run frontend unit tests**

Run: `cd frontend && bun run test tenant-api`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/tenant
git commit -m "feat(tenant): public tenant lookup hook and api"
```

---

### Task 3: Invalid tenant page + TenantGuard

**Files:**
- Create: `frontend/src/core/routing/components/invalid-tenant-page.tsx`
- Create: `frontend/src/core/routing/components/tenant-guard.tsx`
- Create: `frontend/src/core/routing/components/invalid-tenant-page.test.tsx`
- Modify: `frontend/src/core/routing/routers/tenant-router.tsx`

**Interfaces:**
- Consumes: `useTenantPublic(slug)`, `buildApexUrl("/")`, `navigateExternal(url)`, i18n `t("errors:systemInvalid")`
- Produces: `<TenantGuard slug={slug}>{children}</TenantGuard>`, `<InvalidTenantPage />`

- [ ] **Step 1: Write failing test for `InvalidTenantPage`**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { InvalidTenantPage } from "./invalid-tenant-page";
import * as externalRedirect from "@/core/auth/external-redirect";

describe("InvalidTenantPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(externalRedirect, "navigateExternal").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders system invalid message and redirects after 5 seconds", async () => {
    render(<InvalidTenantPage />);
    expect(screen.getByText(/system invalid/i)).toBeInTheDocument();
    vi.advanceTimersByTime(5000);
    await waitFor(() =>
      expect(externalRedirect.navigateExternal).toHaveBeenCalledWith(expect.stringContaining("localhost:5174"))
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && bun run test invalid-tenant-page`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement `InvalidTenantPage`**

```tsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { navigateExternal } from "@/core/auth/external-redirect";
import { buildApexUrl } from "@/core/routing/subdomain-router";

const REDIRECT_DELAY_MS = 5000;

export function InvalidTenantPage() {
  const { t } = useTranslation(["errors"]);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigateExternal(buildApexUrl("/"));
    }, REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">{t("errors:systemInvalid")}</h1>
      <p className="text-muted-foreground">{t("errors:systemInvalidRedirect")}</p>
    </div>
  );
}
```

- [ ] **Step 4: Implement `TenantGuard`**

```tsx
import { Spinner } from "@/components/ui/spinner";
import { useTenantPublic } from "@/features/tenant/hooks/use-tenant";
import { InvalidTenantPage } from "./invalid-tenant-page";

interface TenantGuardProps {
  slug: string;
  children: React.ReactNode;
}

export function TenantGuard({ slug, children }: TenantGuardProps) {
  const { data: tenant, isLoading, error } = useTenantPublic(slug);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !tenant) {
    return <InvalidTenantPage />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 5: Wire `TenantGuard` into tenant router**

Replace `frontend/src/core/routing/routers/tenant-router.tsx`:

```tsx
import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { ProtectedRoute } from "@/core/auth/route-guards";
import { TenantGuard } from "@/core/routing/components/tenant-guard";

const TenantDesktopPage = lazy(() =>
  import("@/features/tenant").then((module) => ({ default: module.TenantDesktopPage }))
);

export function createTenantRouter(slug: string) {
  return createBrowserRouter([
    {
      path: "/*",
      element: (
        <TenantGuard slug={slug}>
          <ProtectedRoute>
            <Suspense fallback={<Spinner />}>
              <TenantDesktopPage slug={slug} />
            </Suspense>
          </ProtectedRoute>
        </TenantGuard>
      ),
    },
  ]);
}
```

- [ ] **Step 6: Run tests**

Run: `cd frontend && bun run test invalid-tenant-page tenant-guard tenant-router`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/core/routing
git commit -m "feat(routing): tenant guard and invalid tenant page"
```

---

### Task 4: Fix login host parsing and canonical redirect

**Files:**
- Modify: `frontend/src/core/routing/host-context.ts`
- Modify: `frontend/src/core/routing/host-router.tsx`
- Modify: `frontend/src/core/routing/redirects.tsx`
- Test: `frontend/src/core/routing/host-context.test.ts`, `frontend/src/core/routing/subdomain-router.test.ts`, `frontend/src/core/routing/host-router.test.tsx`

**Interfaces:**
- Consumes: `buildLoginUrl()`
- Produces: `HostContext` gains `{ type: "login_misroute" }`; `RedirectToCanonicalLogin`

- [ ] **Step 1: Add failing tests for login misroute**

In `frontend/src/core/routing/host-context.test.ts`:

```typescript
it("treats login.tenant.baseDomain as login_misroute", () => {
  expect(getHostContext("login.tenant.klynt.dev", "klynt.dev")).toEqual({ type: "login_misroute" });
});

it("treats login.baseDomain as login", () => {
  expect(getHostContext("login.klynt.dev", "klynt.dev")).toEqual({ type: "login" });
});
```

In `frontend/src/core/routing/subdomain-router.test.ts`:

```typescript
it("buildLoginUrl from a tenant host uses base domain only", () => {
  stubLocation("http://acme.klynt.dev:5174/dashboard");
  expect(buildLoginUrl()).toBe("http://login.klynt.dev:5174/");
  expect(buildLoginUrl("http://acme.klynt.dev:5174/dashboard")).toBe(
    "http://login.klynt.dev:5174/?from=http%3A%2F%2Facme.klynt.dev%3A5174%2Fdashboard"
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && bun run test host-context subdomain-router`
Expected: FAIL — `login_misroute` type and behavior not implemented.

- [ ] **Step 3: Update `HostContext` type and `getHostContext`**

```typescript
export type HostContext =
  | { type: "apex" }
  | { type: "login" }
  | { type: "login_misroute" }
  | { type: "admin" }
  | { type: "tenant"; slug: string }
  | { type: "profile"; username: string }
  | { type: "reserved"; subdomain: string }
  | { type: "unknown"; subdomain: string };
```

Update the prefix branch:

```typescript
if (prefix && prefix !== "www") {
  // ... existing login/admin/profile checks ...

  if (prefix.includes(".")) {
    // e.g. "login.tenant" — any multi-label prefix starting with "login." is a login misroute
    if (prefix.startsWith("login.")) {
      return { type: "login_misroute" };
    }
    return { type: "unknown", subdomain: prefix };
  }

  // ... rest unchanged ...
}
```

Also update the fallback heuristic to treat `login.*.*` as misroute:

```typescript
if (host.startsWith("login.")) {
  // If we can't resolve base domain, any login host is at least a login host;
  // when base domain is unknown we can't distinguish canonical vs misroute,
  // so treat as canonical login to avoid breaking fallback behavior.
  return { type: "login" };
}
```

- [ ] **Step 4: Add `RedirectToCanonicalLogin`**

In `frontend/src/core/routing/redirects.tsx`:

```tsx
export function RedirectToCanonicalLogin() {
  return <ExternalNavigate to={buildLoginUrl()} />;
}
```

- [ ] **Step 5: Handle `login_misroute` in `HostRouter`**

```tsx
case "login_misroute":
  return createBrowserRouter([{ path: "*", element: <RedirectToCanonicalLogin /> }]);
```

- [ ] **Step 6: Run tests**

Run: `cd frontend && bun run test host-context subdomain-router host-router`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/core/routing
git commit -m "fix(routing): canonical login domain and redirect login.tenant.* misroutes"
```

---

### Task 5: i18n strings

**Files:**
- Modify: `frontend/public/locales/en/errors.json`
- Modify: `frontend/public/locales/vi/errors.json`
- Modify: `frontend/public/locales/cn/errors.json`

- [ ] **Step 1: Add keys**

```json
{
  "systemInvalid": "System invalid",
  "systemInvalidRedirect": "This organization does not exist. Redirecting to the homepage..."
}
```

Mirror in `vi`:

```json
{
  "systemInvalid": "Hệ thống không hợp lệ",
  "systemInvalidRedirect": "Tổ chức này không tồn tại. Đang chuyển về trang chủ..."
}
```

Mirror in `cn`:

```json
{
  "systemInvalid": "系统无效",
  "systemInvalidRedirect": "该组织不存在。正在返回首页..."
}
```

- [ ] **Step 2: Run i18n checks / typecheck**

Run: `cd frontend && bun run typecheck`
Expected: PASS (no missing keys if types are generated; otherwise just no TS errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/public/locales
git commit -m "i18n: system invalid tenant messages"
```

---

### Task 6: Local environment configuration

**Files:**
- Modify: `.env.example`
- Modify: `frontend/.env`
- Modify: `backend/.env`

- [ ] **Step 1: Update `.env.example`**

```bash
# Frontend
VITE_API_BASE_URL=/api/v1
VITE_APP_NAME=Klynt
VITE_APP_DOMAIN=localhost
VITE_APP_PROTOCOL=http

# Backend
KLYNT_API__ALLOWED_ORIGINS='["http://localhost:5174", "http://*.localhost:5174", "http://lvh.me:5174", "http://*.lvh.me:5174"]'
KLYNT_BASE_URL=http://localhost:5174
KLYNT_COOKIE_DOMAIN=localhost
```

- [ ] **Step 2: Apply to local `.env` files**

Ensure `frontend/.env` has `VITE_APP_DOMAIN=localhost`.
Ensure `backend/.env` has `KLYNT_COOKIE_DOMAIN=localhost` and allowed origins include `*.localhost`.

- [ ] **Step 3: Restart dev servers**

```bash
# Stop existing frontend server, then:
cd frontend && bun run dev
# Backend env changes require restart if KLYNT_API__ALLOWED_ORIGINS is only in .env (not config file).
cargo run --bin server
```

- [ ] **Step 4: Commit config changes**

```bash
git add .env.example frontend/.env backend/.env
git commit -m "chore(config): localhost subdomain dev environment"
```

---

### Task 7: Browser regression tests

- [ ] **Step 1: Invalid tenant page**
  - Navigate to `http://invalid.localhost:5174`.
  - Expect blank page with "System invalid" message.
  - After 5 seconds, expect redirect to `http://localhost:5174/`.

- [ ] **Step 2: Valid tenant login redirect**
  - Navigate to `http://acme-test.localhost:5174` while logged out.
  - Expect redirect to `http://login.localhost:5174/?from=http%3A%2F%2Facme-test.localhost%3A5174%2F`.

- [ ] **Step 3: Login.tenant misroute**
  - Navigate to `http://login.acme-test.localhost:5174`.
  - Expect redirect to `http://login.localhost:5174/`.

- [ ] **Step 4: Login and desktop shell**
  - Submit valid credentials on `login.localhost:5174`.
  - Expect redirect back to `acme-test.localhost:5174` and the authenticated desktop shell.

- [ ] **Step 5: Document results**
  - Update the test-plan/validation report with the new cases.

---

## Self-review checklist

- [ ] Spec coverage: public endpoint, TenantGuard, invalid page, canonical login, i18n, tests, config all mapped to tasks.
- [ ] No placeholders: every step has exact file paths, code, and commands.
- [ ] Type consistency: `PublicTenant`, `getTenantPublic`, `useTenantPublic`, `login_misroute`, `RedirectToCanonicalLogin` names are stable across tasks.
- [ ] File-size limits: new files are small; existing files only get small additions.
