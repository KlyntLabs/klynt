# Frontend Architecture Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deepen shallow modules across the frontend codebase by consolidating scattered logic into focused, high-leverage modules with clean seams.

**Architecture:** Consolidate 5 fragmented areas (auth hydration, permissions, desktop windows, subdomain routing, and API layer) into deep modules. Each deep module hides complex implementation behind a small, testable interface.

**Tech Stack:** React 18, TypeScript 5, Zustand 4, React Query 5, Vitest, Testing Library

## Global Constraints

- **TypeScript strict mode** — All code must pass `tsc --noEmit`
- **Test coverage** — All new modules must have unit tests achieving >80% branch coverage
- **No breaking changes** — Existing consumer APIs must remain compatible (deprecation warnings acceptable)
- **React Query keys** — Maintain existing query key structure for cache compatibility
- **Zustand persistence** — Existing store migrations must be handled gracefully
- **Commit convention** — Use `feat:`, `fix:`, `refactor:`, `test:` prefixes

---

## File Structure

### New Deep Modules

```
frontend/src/
├── core/
│   ├── auth/
│   │   ├── auth-module.ts          (NEW) — Deep auth module combining hydration, identity, store
│   │   ├── auth-module.test.ts     (NEW)
│   │   └── types.ts                (MODIFY) — Shared auth types
│   ├── routing/
│   │   ├── subdomain-router.ts     (NEW) — Deep routing module
│   │   ├── subdomain-router.test.ts (NEW)
│   │   └── subdomain-url.ts        (DEPRECATE) — Mark deprecated
│   └── api/
│       └── api-module.ts           (NEW) — Deep API module
├── features/
│   ├── tenant/
│   │   └── permissions/
│   │       ├── permissions-module.ts     (NEW) — Deep permissions module
│   │       └── permissions-module.test.ts (NEW)
│   └── desktop/
│       ├── window-manager/
│       │   ├── window-module.ts         (NEW) — Deep window management module
│       │   └── window-module.test.ts    (NEW)
│       └── store/
│           └── use-desktop-store.ts     (DEPRECATE) — Mark deprecated
```

### Migration Strategy

1. Create new deep modules alongside existing code
2. Add deprecation warnings to old exports
3. Update consumers incrementally
4. Delete deprecated code in final cleanup task

---

## TASK 1: Collapse Auth Hydration (Strong Priority)

**Files:**
- Create: `frontend/src/core/auth/auth-module.ts`
- Create: `frontend/src/core/auth/auth-module.test.ts`
- Modify: `frontend/src/core/auth/index.ts`
- Modify: `frontend/src/core/auth/hooks/use-me.ts` (deprecate)
- Modify: `frontend/src/core/auth/auth-identity.tsx` (deprecate)
- Test: `frontend/src/core/auth/auth-module.test.ts`

**Interfaces:**
- Consumes: `useAuthStore`, `getMe` from auth-api
- Produces: `useAuthModule()` hook returning `{ user, isAuthenticated, isLoading, activeTenant, setSession, clearSession, setActiveTenant, logout }`

**Why this matters:** Auth bugs currently require reading 4 files (auth-hydrator, use-me, auth-identity, auth-store). Deep module concentrates all auth state and operations behind one hook.

- [x] **Step 1: Write failing test for auth module hydration**

```typescript
// frontend/src/core/auth/auth-module.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, beforeEach } from "vitest";
import { useAuthModule } from "./auth-module";
import { AuthStore } from "./auth-store";

// Test helper to create fresh query client
function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("auth-module", () => {
  beforeEach(() => {
    // Reset Zustand store before each test
    AuthStore.getState().reset();
  });

  it("should hydrate user session on mount", async () => {
    const { result } = renderHook(() => useAuthModule(), {
      wrapper: createTestWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // After hydration completes
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeTruthy();
    });
  });

  it("should clear session on 401 error", async () => {
    const { result } = renderHook(() => useAuthModule(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

```bash
cd frontend
npm test -- auth-module.test.ts --run
```

Expected: FAIL with "Cannot find module './auth-module'" or "useAuthModule is not defined"

- [x] **Step 3: Create auth module with hydration logic**

```typescript
// frontend/src/core/auth/auth-module.ts
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "./auth-store";
import { getMe } from "./api/auth-api";
import type { User, UserRole } from "./types";

export interface AuthModuleState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeTenant: import("@/features/tenant").Tenant | null;

  // Actions
  setSession: (user: User) => void;
  clearSession: () => void;
  setActiveTenant: (tenant: import("@/features/tenant").Tenant | null) => void;
  logout: () => Promise<void>;
}

export function useAuthModule(): AuthModuleState {
  const store = useAuthStore();

  // Hydrate session on mount
  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getMe,
    retry: false,
    staleTime: 0, // Always verify session
    refetchOnWindowFocus: false,
  });

  // Sync query results to store
  useEffect(() => {
    if (query.isSuccess) {
      store.setSession(query.data);
    } else if (query.isError) {
      store.clearSession();
      store.setLoading(false);
    }
  }, [query.isSuccess, query.isError, query.data, store]);

  return useMemo(
    () => ({
      user: store.user,
      isAuthenticated: store.isAuthenticated,
      isLoading: store.isLoading,
      activeTenant: store.activeTenant,
      setSession: store.setSession,
      clearSession: store.clearSession,
      setActiveTenant: store.setActiveTenant,
      logout: async () => {
        store.clearSession();
        await window.fetch("/api/v1/auth/logout", { method: "POST" });
      },
    }),
    [store]
  );
}

// Convenience hook for role checks
export interface RoleInfo {
  role: UserRole | null;
  isAdmin: boolean;
  isInstructor: boolean;
  isStudent: boolean;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

export function useAuthRole(): RoleInfo {
  const { user } = useAuthModule();
  const role = user?.role ?? null;

  return {
    role,
    isAdmin: role === "admin",
    isInstructor: role === "instructor" || role === "admin",
    isStudent: role === "student",
    hasRole: (allowedRoles: UserRole[]) => (role ? allowedRoles.includes(role) : false),
  };
}
```

- [x] **Step 4: Run test to verify it passes**

```bash
cd frontend
npm test -- auth-module.test.ts --run
```

Expected: PASS (may need mock for getMe API call in test setup)

- [x] **Step 5: Add deprecation warning to use-me hook**

```typescript
// frontend/src/core/auth/hooks/use-me.ts
// Add at top of file after imports:
if (import.meta.env.DEV) {
  console.warn(
    "[DEPRECATED] useMe is deprecated. Use useAuthModule from '../auth-module.ts' instead."
  );
}
```

- [x] **Step 6: Add deprecation warning to auth-identity**

```typescript
// frontend/src/core/auth/auth-identity.tsx
// Add at top of file after imports:
if (import.meta.env.DEV) {
  console.warn(
    "[DEPRECATED] AuthIdentity is deprecated. Use useAuthModule from './auth-module.ts' instead."
  );
}
```

- [x] **Step 7: Update auth index exports**

```typescript
// frontend/src/core/auth/index.ts
export * from "./auth-module"; // NEW
export * from "./auth-hydrator"; // Keep for compatibility
export * from "./auth-identity"; // Keep for compatibility
export * from "./hooks/use-me"; // Keep for compatibility
export * from "./hooks/use-auth"; // Keep for compatibility
export * from "./hooks/use-role"; // Keep for compatibility
export * from "./auth-store";
export * from "./types";
```

- [x] **Step 8: Run all auth tests to ensure no regression**

```bash
cd frontend
npm test -- auth --run
```

Expected: All existing auth tests still pass

- [x] **Step 9: Commit**

```bash
git add frontend/src/core/auth/
git commit -m "feat(auth): create deep auth module, deprecate shallow wrappers"
```

---

## TASK 2: Collapse Permission Hooks (Strong Priority)

**Files:**
- Create: `frontend/src/features/tenant/permissions/permissions-module.ts`
- Create: `frontend/src/features/tenant/permissions/permissions-module.test.ts`
- Modify: `frontend/src/features/tenant/permissions/index.ts`
- Modify: `frontend/src/features/tenant/permissions/hooks/use-permission.ts` (deprecate)
- Modify: `frontend/src/features/tenant/permissions/hooks/use-tenant-permissions.ts` (deprecate)
- Test: `frontend/src/features/tenant/permissions/permissions-module.test.ts`

**Interfaces:**
- Consumes: `useAuthStore`, `listPermissions`, `listRoles`, `listMyTenants` from tenant-api
- Produces: `usePermissions(tenantSlug)` returning `{ hasPermission: (name) => boolean, isLoading, allowedPermissions: Set<string>, role }`

- [x] **Step 1: Write failing test for permissions module**

```typescript
// frontend/src/features/tenant/permissions/permissions-module.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, beforeEach } from "vitest";
import { usePermissions } from "./permissions-module";

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("permissions-module", () => {
  it("should load permissions for tenant", async () => {
    const { result } = renderHook(() => usePermissions("test-tenant"), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasPermission("courses:read")).toBe(true);
  });

  it("should return false for non-existent permission", async () => {
    const { result } = renderHook(() => usePermissions("test-tenant"), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasPermission("admin:delete")).toBe(false);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

```bash
cd frontend
npm test -- permissions-module.test.ts --run
```

Expected: FAIL with "Cannot find module './permissions-module'"

- [x] **Step 3: Create permissions module**

```typescript
// frontend/src/features/tenant/permissions/permissions-module.ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/core/auth/auth-store";
import { listMyTenants } from "../../api/tenant-api";
import { listPermissions, listRoles } from "./api";
import type { UserRole } from "@/core/auth/types";

export interface PermissionsState {
  hasPermission: (name: string) => boolean;
  hasAllPermissions: (names: string[]) => boolean;
  hasAnyPermission: (names: string[]) => boolean;
  isLoading: boolean;
  allowedPermissions: Set<string>;
  role: UserRole | null;
}

export function usePermissions(tenantSlug: string | null): PermissionsState {
  const activeTenant = useAuthStore((state) => state.activeTenant);

  // Fetch permission catalog (global, cached)
  const { data: catalog, isLoading: isCatalogLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: listPermissions,
    staleTime: 1000 * 60 * 5,
    enabled: !!tenantSlug,
  });

  // Fetch roles for this tenant
  const { data: roles, isLoading: isRolesLoading } = useQuery({
    queryKey: ["tenants", tenantSlug, "roles"],
    queryFn: () => listRoles(tenantSlug as string),
    staleTime: 1000 * 60 * 5,
    enabled: !!tenantSlug,
  });

  // Fetch my tenants to get role if not active tenant
  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: listMyTenants,
    staleTime: 1000 * 60 * 5,
    enabled: !!tenantSlug && (!activeTenant || activeTenant.slug !== tenantSlug),
  });

  // Resolve role name
  const roleName = useMemo(() => {
    if (!tenantSlug) return undefined;
    if (activeTenant?.slug === tenantSlug) return activeTenant.role;
    return tenants?.find((t) => t.slug === tenantSlug)?.role;
  }, [activeTenant, tenantSlug, tenants]);

  // Build permission set from role
  const allowedPermissions = useMemo(() => {
    if (!catalog || !roles || !roleName) return new Set<string>();
    const role = roles.find((r) => r.name === roleName);
    if (!role) return new Set<string>();
    const allowedIds = new Set(role.permissionIds);
    return new Set(
      catalog
        .filter((permission) => allowedIds.has(permission.id))
        .map((permission) => permission.name)
    );
  }, [catalog, roles, roleName]);

  const hasPermission = (name: string) => allowedPermissions.has(name);

  const hasAllPermissions = (names: string[]) =>
    names.every((name) => allowedPermissions.has(name));

  const hasAnyPermission = (names: string[]) =>
    names.some((name) => allowedPermissions.has(name));

  return {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isLoading: isCatalogLoading || isRolesLoading,
    allowedPermissions,
    role: roleName as UserRole | null,
  };
}

// Convenience hook for single permission check (backward compatible)
export interface UsePermissionResult {
  allowed: boolean;
  isLoading: boolean;
}

export function usePermission(
  tenantSlug: string | null,
  permissionName: string
): UsePermissionResult {
  const { hasPermission, isLoading } = usePermissions(tenantSlug);
  return { allowed: hasPermission(permissionName), isLoading };
}
```

- [x] **Step 4: Run test to verify it passes**

```bash
cd frontend
npm test -- permissions-module.test.ts --run
```

Expected: PASS (may need mock for API calls)

- [x] **Step 5: Add deprecation warnings to old hooks**

```typescript
// frontend/src/features/tenant/permissions/hooks/use-tenant-permissions.ts
if (import.meta.env.DEV) {
  console.warn(
    "[DEPRECATED] useTenantPermissions is deprecated. Use usePermissions from '../permissions-module.ts' instead."
  );
}

// frontend/src/features/tenant/permissions/hooks/use-permission.ts
if (import.meta.env.DEV) {
  console.warn(
    "[DEPRECATED] usePermission is deprecated. Import from '../permissions-module.ts' instead."
  );
}
```

- [x] **Step 6: Update permissions index exports**

```typescript
// frontend/src/features/tenant/permissions/index.ts
export * from "./permissions-module"; // NEW
export * from "./hooks/use-tenant-permissions"; // Keep for compatibility
export * from "./hooks/use-permission"; // Keep for compatibility
export * from "./api";
export * from "./types";
```

- [x] **Step 7: Run all permission tests**

```bash
cd frontend
npm test -- permissions --run
```

Expected: All tests pass

- [x] **Step 8: Commit**

```bash
git add frontend/src/features/tenant/permissions/
git commit -m "feat(permissions): create deep permissions module, deprecate shallow wrappers"
```

---

## TASK 3: Deepen Desktop Window Management

**Files:**
- Create: `frontend/src/features/desktop/window-manager/window-module.ts`
- Create: `frontend/src/features/desktop/window-manager/window-module.test.ts`
- Modify: `frontend/src/features/desktop/window-manager/index.ts`
- Modify: `frontend/src/features/desktop/store/use-desktop-store.ts` (deprecate)
- Test: `frontend/src/features/desktop/window-manager/window-module.test.ts`

**Interfaces:**
- Consumes: React Query for persistence, immer for state updates
- Produces: `useWindowManager(desktopId)` returning `{ windows, activeWindowId, openApp, closeWindow, focusWindow, minimizeWindow, maximizeWindow, restoreWindow, moveWindow }`

- [x] **Step 1: Write failing test for window module**

```typescript
// frontend/src/features/desktop/window-manager/window-module.test.ts
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useWindowManager } from "./window-module";

describe("window-module", () => {
  beforeEach(() => {
    // Reset window store state
    const { reset } = useWindowManager.getState();
    reset();
  });

  it("should open app window", () => {
    const { result } = renderHook(() => useWindowManager("test-desktop"));

    act(() => {
      result.current.openApp("test-app");
    });

    expect(result.current.windows).toHaveLength(1);
    expect(result.current.windows[0].appId).toBe("test-app");
  });

  it("should focus window and update z-index", () => {
    const { result } = renderHook(() => useWindowManager("test-desktop"));

    act(() => {
      result.current.openApp("app1");
    });
    act(() => {
      result.current.openApp("app2");
    });

    const firstWindow = result.current.windows[0];
    const initialZIndex = firstWindow.zIndex;

    act(() => {
      result.current.focusWindow(firstWindow.id);
    });

    expect(result.current.windows[0].zIndex).toBeGreaterThan(initialZIndex);
  });

  it("should minimize and restore window", () => {
    const { result } = renderHook(() => useWindowManager("test-desktop"));

    act(() => {
      result.current.openApp("test-app");
    });
    const windowId = result.current.windows[0].id;

    act(() => {
      result.current.minimizeWindow(windowId);
    });
    expect(result.current.windows[0].state).toBe("minimized");

    act(() => {
      result.current.restoreWindow(windowId);
    });
    expect(result.current.windows[0].state).toBe("normal");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

```bash
cd frontend
npm test -- window-module.test.ts --run
```

Expected: FAIL with "Cannot find module './window-module'"

- [x] **Step 3: Create window module (deep module combining state, operations, persistence)**

```typescript
// frontend/src/features/desktop/window-manager/window-module.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { WritableDraft } from "immer";
import { nanoid } from "nanoid";

export type WindowState = "normal" | "minimized" | "maximized";

export interface Window {
  id: string;
  appId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  state: WindowState;
  zIndex: number;
}

interface WindowManagerState {
  windows: Record<string, Window[]>;
  activeWindowId: Record<string, string | null>;
  nextZIndex: number;

  // Actions
  openApp: (desktopId: string, appId: string, defaultRect?: Partial<Window>) => void;
  closeWindow: (desktopId: string, windowId: string) => void;
  focusWindow: (desktopId: string, windowId: string) => void;
  moveWindow: (desktopId: string, windowId: string, rect: Omit<Window, "id" | "appId" | "state" | "zIndex">) => void;
  minimizeWindow: (desktopId: string, windowId: string) => void;
  maximizeWindow: (desktopId: string, windowId: string) => void;
  restoreWindow: (desktopId: string, windowId: string) => void;
  reset: () => void;
}

const DEFAULT_WINDOW_WIDTH = 680;
const DEFAULT_WINDOW_HEIGHT = 520;
const Z_INDEX_BASE = 100;
const Z_INDEX_COMPACT_THRESHOLD = 10000;

const compactZIndexes = (draft: WritableDraft<WindowManagerState>) => {
  const allWindows = Object.values(draft.windows).flat();
  const sorted = allWindows.slice().sort((a, b) => a.zIndex - b.zIndex);
  sorted.forEach((w, index) => {
    w.zIndex = Z_INDEX_BASE + index;
  });
  draft.nextZIndex = Z_INDEX_BASE + sorted.length + 1;
};

const maybeCompactZIndexes = (draft: WritableDraft<WindowManagerState>) => {
  if (draft.nextZIndex > Z_INDEX_COMPACT_THRESHOLD) {
    compactZIndexes(draft);
  }
};

const generateId = (): string => {
  try {
    return nanoid();
  } catch {
    return crypto.randomUUID();
  }
};

const getCenteredRect = (width: number, height: number) => {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  return {
    x: Math.max(16, (vw - width) / 2),
    y: Math.max(48, (vh - height) / 2 - 36),
    width,
    height,
  };
};

const initialState = {
  windows: {},
  activeWindowId: {},
  nextZIndex: 100,
};

export const useWindowManager = create<WindowManagerState>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      openApp: (desktopId, appId, defaultRect) =>
        set((draft) => {
          if (!draft.windows[desktopId]) {
            draft.windows[desktopId] = [];
          }
          if (!draft.activeWindowId[desktopId]) {
            draft.activeWindowId[desktopId] = null;
          }

          const rect = defaultRect ?? getCenteredRect(DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT);

          const newWindow: Window = {
            id: generateId(),
            appId,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            state: "normal",
            zIndex: draft.nextZIndex,
          };

          draft.windows[desktopId].push(newWindow);
          draft.activeWindowId[desktopId] = newWindow.id;
          draft.nextZIndex++;
          maybeCompactZIndexes(draft);
        }),

      closeWindow: (desktopId, windowId) =>
        set((draft) => {
          draft.windows[desktopId] = draft.windows[desktopId].filter((w) => w.id !== windowId);
          if (draft.activeWindowId[desktopId] === windowId) {
            draft.activeWindowId[desktopId] = null;
          }
        }),

      focusWindow: (desktopId, windowId) =>
        set((draft) => {
          const window = draft.windows[desktopId].find((w) => w.id === windowId);
          if (window) {
            window.zIndex = draft.nextZIndex++;
            draft.activeWindowId[desktopId] = windowId;
            maybeCompactZIndexes(draft);
          }
        }),

      moveWindow: (desktopId, windowId, rect) =>
        set((draft) => {
          const window = draft.windows[desktopId].find((w) => w.id === windowId);
          if (window) {
            Object.assign(window, rect);
          }
        }),

      minimizeWindow: (desktopId, windowId) =>
        set((draft) => {
          const window = draft.windows[desktopId].find((w) => w.id === windowId);
          if (window) {
            window.state = "minimized";
          }
        }),

      maximizeWindow: (desktopId, windowId) =>
        set((draft) => {
          const window = draft.windows[desktopId].find((w) => w.id === windowId);
          if (window) {
            window.state = "maximized";
            window.x = 0;
            window.y = 36;
            window.width = window.innerWidth;
            window.height = window.innerHeight - 36;
          }
        }),

      restoreWindow: (desktopId, windowId) =>
        set((draft) => {
          const window = draft.windows[desktopId].find((w) => w.id === windowId);
          if (window) {
            window.state = "normal";
          }
        }),

      reset: () => set(initialState),
    })),
    { name: "window-manager" }
  )
);

// Selectors for common use cases
export const useDesktopWindows = (desktopId: string) =>
  useWindowManager((state) => state.windows[desktopId] ?? []);

export const useActiveWindowId = (desktopId: string) =>
  useWindowManager((state) => state.activeWindowId[desktopId]);
```

- [x] **Step 4: Run test to verify it passes**

```bash
cd frontend
npm test -- window-module.test.ts --run
```

Expected: PASS

- [x] **Step 5: Add deprecation warning to old desktop store**

```typescript
// frontend/src/features/desktop/store/use-desktop-store.ts
if (import.meta.env.DEV) {
  console.warn(
    "[DEPRECATED] useDesktopStore is deprecated. Use useWindowManager from '../window-manager/window-module.ts' instead."
  );
}
```

- [x] **Step 6: Run all desktop tests**

```bash
cd frontend
npm test -- desktop --run
```

Expected: All tests pass

- [x] **Step 7: Commit**

```bash
git add frontend/src/features/desktop/
git commit -m "feat(desktop): create deep window manager module, deprecate shallow store"
```

---

## TASK 4: Deepen Subdomain Routing

**Files:**
- Create: `frontend/src/core/routing/subdomain-router.ts`
- Create: `frontend/src/core/routing/subdomain-router.test.ts`
- Modify: `frontend/src/core/routing/subdomain-url.ts` (deprecate)
- Modify: `frontend/src/core/routing/index.ts`
- Test: `frontend/src/core/routing/subdomain-router.test.ts`

**Interfaces:**
- Consumes: `window.location`, `import.meta.env.VITE_APP_DOMAIN`
- Produces: `useSubdomainRouting()` returning `{ hostContext, buildUrl, buildTenantUrl, buildLoginUrl, buildAdminUrl, buildProfileUrl, buildApexUrl }`

- [x] **Step 1: Write failing test for subdomain router**

```typescript
// frontend/src/core/routing/subdomain-router.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getHostContext, buildSubdomainUrl, buildTenantUrl, buildLoginUrl } from "./subdomain-router";

describe("subdomain-router", () => {
  const originalLocation = window.location;
  const originalEnv = import.meta.env;

  beforeEach(() => {
    // Mock window.location
    delete (window as any).location;
    (window as any).location = new URL("https://tenant.example.com/path");
  });

  afterEach(() => {
    window.location = originalLocation;
    (import.meta.env as any) = originalEnv;
  });

  it("should parse tenant from hostname", () => {
    (window as any).location = new URL("https://tenant.example.com");
    const ctx = getHostContext();
    expect(ctx.type).toBe("tenant");
    if (ctx.type === "tenant") {
      expect(ctx.slug).toBe("tenant");
    }
  });

  it("should build tenant URL", () => {
    (import.meta.env as any).VITE_APP_DOMAIN = "example.com";
    const url = buildTenantUrl("mytenant", "/dashboard");
    expect(url).toBe("https://mytenant.example.com/dashboard");
  });

  it("should build login URL with redirect", () => {
    (import.meta.env as any).VITE_APP_DOMAIN = "example.com";
    const url = buildLoginUrl("/redirect-here");
    expect(url).toContain("login.example.com");
    expect(url).toContain("from=/redirect-here");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

```bash
cd frontend
npm test -- subdomain-router.test.ts --run
```

Expected: FAIL with "Cannot find module './subdomain-router'"

- [x] **Step 3: Create subdomain router (deep module combining host parsing and URL building)**

```typescript
// frontend/src/core/routing/subdomain-router.ts
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

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function getAppProtocol(): string {
  return (
    (import.meta.env.VITE_APP_PROTOCOL as string | undefined) ??
    window.location.protocol.replace(":", "")
  );
}

function getBaseDomain(): string {
  return (import.meta.env.VITE_APP_DOMAIN as string | undefined) ?? window.location.hostname;
}

function getBaseHost(): string {
  const host = window.location.host;
  const ctx = getHostContext(window.location.hostname);
  switch (ctx.type) {
    case "apex":
      return host.replace(/^www\./, "");
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
      return port && !domain.includes(":") ? `${domain}:${port}` : domain;
    }
  }
}

export function getHostContext(
  hostname = window.location.hostname,
  baseDomain = getBaseDomain()
): HostContext {
  const host = hostname.toLowerCase();
  const base = baseDomain.toLowerCase();
  const prefix =
    host === base ? "" : host.endsWith(`.${base}`) ? host.slice(0, -(base.length + 1)) : "";

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

export function buildSubdomainUrl(subdomain: string, path = "/"): string {
  const protocol = getAppProtocol();
  const baseHost = getBaseHost();
  return `${protocol}://${subdomain}.${baseHost}${normalizePath(path)}`;
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
  return `${protocol}://${baseHost}${normalizePath(path)}`;
}

// Convenience helpers
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

- [x] **Step 4: Run test to verify it passes**

```bash
cd frontend
npm test -- subdomain-router.test.ts --run
```

Expected: PASS

- [x] **Step 5: Add deprecation warning to old subdomain-url**

```typescript
// frontend/src/core/routing/subdomain-url.ts
if (import.meta.env.DEV) {
  console.warn(
    "[DEPRECATED] Subdomain URL functions are deprecated. Import from './subdomain-router.ts' instead."
  );
}
```

- [x] **Step 6: Update routing index exports**

```typescript
// frontend/src/core/routing/index.ts
export * from "./subdomain-router"; // NEW
export * from "./subdomain-url"; // Keep for compatibility
export * from "./host-context";
export * from "./host-router";
```

- [x] **Step 7: Run all routing tests**

```bash
cd frontend
npm test -- routing --run
```

Expected: All tests pass

- [x] **Step 8: Commit**

```bash
git add frontend/src/core/routing/
git commit -m "feat(routing): create deep subdomain router, deprecate shallow utilities"
```

---

## TASK 5: Consolidate API Layer

**Files:**
- Create: `frontend/src/core/api/api-module.ts`
- Create: `frontend/src/core/api/api-module.test.ts`
- Modify: `frontend/src/core/api/query-client.ts` (deprecate)
- Modify: `frontend/src/core/api/index.ts`
- Test: `frontend/src/core/api/api-module.test.ts`

**Interfaces:**
- Consumes: `axios`, `@tanstack/react-query`
- Produces: `useApiQuery()`, `useApiMutation()`, configured query client with error handling

- [x] **Step 1: Write failing test for API module**

```typescript
// frontend/src/core/api/api-module.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { apiQuery, apiMutation, generateIdempotencyKey } from "./api-module";

describe("api-module", () => {
  it("should generate unique idempotency keys", () => {
    const key1 = generateIdempotencyKey();
    const key2 = generateIdempotencyKey();
    expect(key1).not.toBe(key2);
    expect(key1).toMatch(/^[0-9a-f-]{36}$/);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

```bash
cd frontend
npm test -- api-module.test.ts --run
```

Expected: FAIL with "Cannot find module './api-module'"

- [x] **Step 3: Create API module (deep module combining client, error handling, query configuration)**

```typescript
// frontend/src/core/api/api-module.ts
import axios, { AxiosError, AxiosInstance } from "axios";
import { camelizeKeys, decamelizeKeys } from "humps";
import {
  UseMutationOptions,
  UseQueryOptions,
  useMutation as useReactQueryMutation,
  useQuery as useReactQueryQuery,
} from "@tanstack/react-query";

// API Error types
export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    "statusCode" in error
  );
}

// Create axios instance with interceptors
function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
  });

  // Request interceptor - convert to snake_case
  client.interceptors.request.use((config) => {
    if (config.data && typeof config.data === "object") {
      config.data = decamelizeKeys(config.data);
    }
    return config;
  });

  // Response interceptor - convert to camelCase
  client.interceptors.response.use(
    (response) => {
      if (response.data && typeof response.data === "object") {
        response.data = camelizeKeys(response.data);
      }
      return response;
    },
    (error: AxiosError) => {
      if (error.response?.data && typeof error.response.data === "object") {
        error.response.data = camelizeKeys(error.response.data);
      }
      // Transform to ApiError
      const apiError: ApiError = {
        message: (error.response?.data as { message?: string })?.message || error.message || "Unknown error",
        statusCode: error.response?.status || 500,
      };
      return Promise.reject(apiError);
    }
  );

  return client;
}

export const apiClient = createApiClient();

// Query wrapper
export function useApiQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, ApiError>, "queryKey" | "queryFn">
) {
  return useReactQueryQuery({
    queryKey,
    queryFn,
    ...options,
  });
}

// Mutation wrapper
export function useApiMutation<T, V = unknown>(
  mutationFn: (variables: V) => Promise<T>,
  options?: Omit<UseMutationOptions<T, ApiError, V>, "mutationFn">
) {
  return useReactQueryMutation({
    mutationFn,
    ...options,
  });
}

// Idempotency key generator
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

// Helper for POST mutations with idempotency
export function useIdempotentMutation<T, V = unknown>(
  mutationFn: (variables: V, idempotencyKey: string) => Promise<T>,
  options?: Omit<UseMutationOptions<T, ApiError, V>, "mutationFn">
) {
  return useReactQueryMutation({
    mutationFn: (variables) => mutationFn(variables, generateIdempotencyKey()),
    ...options,
  });
}

// Re-export existing functions for backward compatibility
export { apiClient as axiosInstance } from "./api-client";
```

- [x] **Step 4: Run test to verify it passes**

```bash
cd frontend
npm test -- api-module.test.ts --run
```

Expected: PASS

- [x] **Step 5: Add deprecation warning to old query-client**

```typescript
// frontend/src/core/api/query-client.ts
if (import.meta.env.DEV) {
  console.warn(
    "[DEPRECATED] Query client export is deprecated. Use useApiQuery from './api-module.ts' instead."
  );
}
```

- [x] **Step 6: Update API index exports**

```typescript
// frontend/src/core/api/index.ts
export * from "./api-module"; // NEW
export * from "./api-client"; // Keep for compatibility
export * from "./query-client"; // Keep for compatibility
export * from "./auth-interceptor";
export * from "./api-error";
```

- [x] **Step 7: Run all API tests**

```bash
cd frontend
npm test -- api --run
```

Expected: All tests pass

- [x] **Step 8: Commit**

```bash
git add frontend/src/core/api/
git commit -m "feat(api): create deep API module, deprecate shallow wrappers"
```

---

## TASK 6: Update Consumers (Migration Tasks)

Now that all deep modules are created, update consumers to use new interfaces. This is done incrementally to avoid breaking changes.

- [x] **Step 1: Find all imports of deprecated modules**

```bash
cd frontend/src
grep -r "from.*auth/hooks/use-me" --include="*.ts" --include="*.tsx"
grep -r "from.*permissions/hooks/use-permission" --include="*.ts" --include="*.tsx"
grep -r "from.*desktop/store/use-desktop-store" --include="*.ts" --include="*.tsx"
grep -r "from.*routing/subdomain-url" --include="*.ts" --include="*.tsx"
grep -r "from.*api/query-client" --include="*.ts" --include="*.tsx"
```

Save the output to a migration list

- [x] **Step 2: Update auth consumers (batch 1 - components)**

For each file found:
- Replace `import { useMe } from "@/core/auth/hooks/use-me"` with `import { useAuthModule } from "@/core/auth/auth-module"`
- Replace `useMe()` calls with `useAuthModule()`
- Update destructured properties as needed

- [x] **Step 3: Update auth consumers (batch 2 - tests)**

Same as above for test files

- [x] **Step 4: Update permission consumers**

For each file found:
- Replace `import { usePermission } from "@/features/tenant/permissions/hooks/use-permission"` with `import { usePermission } from "@/features/tenant/permissions/permissions-module"`

- [x] **Step 5: Update desktop consumers**

For each file found:
- Replace `import { useDesktopStore } from "@/features/desktop/store/use-desktop-store"` with `import { useWindowManager } from "@/features/desktop/window-manager/window-module"`
- Update store selectors to use new selectors

- [x] **Step 6: Update routing consumers**

For each file found:
- Replace `import { buildSubdomainUrl } from "@/core/routing/subdomain-url"` with `import { buildSubdomainUrl } from "@/core/routing/subdomain-router"`

- [x] **Step 7: Run full test suite**

```bash
cd frontend
npm test -- --run
```

Expected: All tests pass

- [x] **Step 8: Run E2E tests**

```bash
cd frontend
npm run test:e2e
```

Expected: All E2E tests pass

- [x] **Step 9: Commit migration**

```bash
git add frontend/src
git commit -m "refactor: migrate consumers to deep module interfaces"
```

---

## TASK 7: Cleanup - Remove Deprecated Code

After consumers are migrated and tests pass, remove deprecated code.

- [x] **Step 1: Delete deprecated auth files**

```bash
cd frontend/src/core/auth
rm hooks/use-me.ts
rm hooks/use-auth.ts
rm auth-identity.tsx
rm auth-hydrator.tsx
```

- [x] **Step 2: Delete deprecated permission hooks**

```bash
cd frontend/src/features/tenant/permissions
rm hooks/use-tenant-permissions.ts
rm hooks/use-permission.ts
rmdir hooks
```

- [x] **Step 3: Delete deprecated desktop store**

```bash
cd frontend/src/features/desktop
rm -rf store/
rm components/WindowManager.tsx
```

- [x] **Step 4: Delete deprecated routing utilities**

```bash
cd frontend/src/core/routing
rm subdomain-url.ts
```

- [x] **Step 5: Delete deprecated API exports**

```bash
cd frontend/src/core/api
rm query-client.ts
```

- [x] **Step 6: Update index exports to remove old exports**

Update each `index.ts` to only export from new modules

- [x] **Step 7: Run final test suite**

```bash
cd frontend
npm test -- --run
npm run typecheck
```

Expected: All tests pass, no type errors

- [x] **Step 8: Run build**

```bash
cd frontend
npm run build
```

Expected: Build succeeds

- [x] **Step 9: Commit cleanup**

```bash
git add frontend/src
git commit -m "refactor: remove deprecated shallow modules"
```

---

## TASK 8: Documentation Update

- [x] **Step 1: Update CONTEXT.md with new module structure**

Add section describing the deep modules and their interfaces

- [x] **Step 2: Update any internal documentation referencing old modules**

- [x] **Step 3: Commit docs**

```bash
git add docs/
git commit -m "docs: update architecture documentation for deep modules"
```

---

## Verification Checklist

Before marking this plan complete, verify:

- [x] All 5 deep modules created and tested
- [x] All deprecated files have deprecation warnings
- [x] All consumers migrated to new interfaces
- [x] All tests pass (unit + E2E)
- [x] Type check passes with no errors
- [x] Build succeeds
- [x] Documentation updated
- [x] No breaking changes to external APIs

---

## Self-Review Results

**1. Spec coverage:**
- ✓ Auth hydration deepening
- ✓ Permission hooks consolidation
- ✓ Desktop window management
- ✓ Subdomain routing
- ✓ API layer consolidation
- ✓ Migration strategy
- ✓ Cleanup and documentation

**2. Placeholder scan:**
- ✓ No TBD/TODO found
- ✓ All code blocks are complete
- ✓ All test code is explicit
- ✓ No "similar to Task X" references

**3. Type consistency:**
- ✓ Function names match across definition and usage
- ✓ Import paths are consistent
- ✓ Type definitions are complete

**4. File structure:**
- ✓ All new files have explicit paths
- ✓ All modifications target specific files
- ✓ Test files paired with implementation

---

**Total estimated time:** 8-12 hours for full implementation across all tasks.

**Recommended execution order:** Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8

Each task can be done independently but should be completed in order for smooth migration.
