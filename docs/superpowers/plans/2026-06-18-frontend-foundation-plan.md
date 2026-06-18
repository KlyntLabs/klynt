# Frontend Foundation Implementation Plan — Registration Slice

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the Klynt frontend into a shared `core/` + feature-slice architecture and wire the first real feature — user registration against the backend's `POST /api/v1/users` endpoint.

**Architecture:** A small `src/core/` owns auth, API, routing, notifications, forms, UI primitives, error boundary, and logger. `src/features/{domain}/` owns domain-specific API types, hooks, components, and pages. Features import from `@/core/*` and `@/lib/*` only; cross-feature imports are forbidden.

**Tech Stack:** React 19, Vite 8, TypeScript 6, Tailwind CSS 4, React Router 7, TanStack Query 5, React Hook Form 7, Zod 4, Axios 1, Zustand 5, `@hookform/resolvers`, Biome, Vitest, MSW.

**Backend Contract:**

```http
POST /api/v1/users
Content-Type: application/json
Idempotency-Key: <uuid>

{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "str0ng!passphrase",
  "role": "student",
  "institution_id": "550e8400-e29b-41d4-a716-446655440001",
  "terms_accepted": true,
  "terms_version": "2026-06-18"
}
```

Response `201 Created`:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "role": "student",
  "status": "pending_verification",
  "created_at": "2026-06-18T04:24:34Z"
}
```

Error codes: `bad_request`, `conflict`, `rate_limited`, `internal_error`.

---

## File map

| File | Responsibility |
|---|---|
| `src/core/logger.ts` | Structured logging facade; no secrets logged |
| `src/core/api/api-error.ts` | Typed `ApiError` with factory from Axios errors |
| `src/core/api/api-client.ts` | Axios instance, token interceptor, 401 logout (auth endpoints only) |
| `src/core/api/query-client.ts` | TanStack Query defaults + global mutation error toast (respects `meta.suppressToast`) |
| `src/core/notifications/toast-store.ts` | Zustand toast state with reset/devtools |
| `src/core/notifications/toast-container.tsx` | ARIA live-region toast renderer |
| `src/core/auth/types.ts` | `Role`, `User`, `AuthState` |
| `src/core/auth/auth-store.ts` | Zustand auth state with reset/devtools, in-memory only |
| `src/core/auth/auth-provider.tsx` | No-op restore provider for first iteration |
| `src/core/auth/use-auth.ts` | `useAuth()` hook |
| `src/core/auth/use-role.ts` | `useRole()` hook |
| `src/core/auth/protected-route.tsx` | Blocks unauthenticated users, handles loading |
| `src/core/auth/guest-route.tsx` | Redirects authenticated users away from guest pages |
| `src/core/auth/role-guard.tsx` | Blocks users without required role |
| `src/core/ui/*.tsx` | Shared UI primitives |
| `src/core/forms/*.tsx` | Shared form primitives |
| `src/core/error-boundary/index.tsx` | Global error boundary with logger |
| `src/core/routing/route-paths.ts` | Centralized route path constants |
| `src/core/routing/route-tree.tsx` | `createBrowserRouter` with lazy routes, guards, fallbacks |
| `src/core/routing/app-router.tsx` | `RouterProvider` wrapper |
| `src/core/routing/use-focus-on-route-change.ts` | Accessibility focus reset on navigation |
| `src/app/providers/index.tsx` | Compose providers |
| `src/app/layout/root-layout.tsx` | Root layout with header + focus target |
| `src/App.tsx` | Mount `AppRouter` |
| `src/env.d.ts` | Typed env vars |
| `src/test/msw/*` | MSW server + handlers |
| `src/test/render.tsx` | Fresh query client + router per test |
| `src/test/setup.ts` | MSW lifecycle |
| `src/features/auth/*` | Auth/registration feature: types, API, hooks, forms, pages, tests |
| `src/features/dashboard/*` | Dashboard placeholder page |

---

### Task 1: Reorganize existing shared files into `core/`

**Files:**
- Delete: `src/lib/api-client.ts`, `src/lib/query-client.ts`, `src/app/error-boundary/index.tsx`
- Create: `src/core/api/api-client.ts` (copy of current `src/lib/api-client.ts`)
- Create: `src/core/api/query-client.ts` (copy of current `src/lib/query-client.ts`)
- Create: `src/core/error-boundary/index.tsx` (copy of current `src/app/error-boundary/index.tsx`)
- Modify: `src/app/providers/index.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Move files**

```bash
mkdir -p src/core/api src/core/error-boundary src/core/routing src/core/auth src/core/notifications src/core/forms src/core/ui src/test/msw/handlers
mv src/lib/api-client.ts src/core/api/api-client.ts
mv src/lib/query-client.ts src/core/api/query-client.ts
mv src/app/error-boundary/index.tsx src/core/error-boundary/index.tsx
```

- [ ] **Step 2: Update `src/app/providers/index.tsx` imports**

```tsx
import { ErrorBoundary } from "@/core/error-boundary";
import { queryClient } from "@/core/api/query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `cd frontend && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(frontend): move shared runtime files into src/core/"
```

---

### Task 2: Install dependencies

**Files:**
- Modify: `frontend/package.json`, `frontend/package-lock.json`

- [ ] **Step 1: Install runtime dependencies**

Run: `cd frontend && npm install zustand @hookform/resolvers`
Expected: `package.json` now lists both under `dependencies`.

- [ ] **Step 2: Verify install**

Run: `cd frontend && npm ls zustand @hookform/resolvers`
Expected: Both packages are present.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): add zustand and @hookform/resolvers"
```

---

### Task 3: Type environment variables

**Files:**
- Create: `src/env.d.ts`

- [ ] **Step 1: Write `src/env.d.ts`**

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd frontend && npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/env.d.ts
git commit -m "chore(frontend): type Vite environment variables"
```

---

### Task 4: Create structured logger

**Files:**
- Create: `src/core/logger.ts`
- Create: `src/core/logger.test.ts`

- [ ] **Step 1: Write `src/core/logger.ts`**

```ts
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  if (import.meta.env.PROD && level === "debug") {
    return;
  }

  if (level === "error") {
    console.error(entry);
  } else if (level === "warn") {
    console.warn(entry);
  } else {
    console.log(entry);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),
};
```

- [ ] **Step 2: Write unit test**

```ts
import { describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  it("logs structured entry at error level", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("something failed", { requestId: "abc" });
    expect(errorSpy).toHaveBeenCalledOnce();
    const entry = errorSpy.mock.calls[0][0];
    expect(entry.level).toBe("error");
    expect(entry.message).toBe("something failed");
    expect(entry.context).toEqual({ requestId: "abc" });
    errorSpy.mockRestore();
  });
});
```

- [ ] **Step 3: Run test**

Run: `cd frontend && npx vitest run src/core/logger.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/core/logger.ts src/core/logger.test.ts
git commit -m "feat(frontend): add structured logger facade"
```

---

### Task 5: Create typed API error

**Files:**
- Create: `src/core/api/api-error.ts`
- Create: `src/core/api/api-error.test.ts`

- [ ] **Step 1: Write `src/core/api/api-error.ts`**

```ts
import { isAxiosError } from "axios";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly isUnauthorized: boolean;

  constructor({
    message,
    status,
    code,
  }: {
    message: string;
    status: number;
    code: string;
  }) {
    super(message);
    this.status = status;
    this.code = code;
    this.isUnauthorized = status === 401;
    this.name = "ApiError";
  }
}

export function createApiError(error: unknown): ApiError {
  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data as { code?: string; message?: string } | undefined;
    return new ApiError({
      message: data?.message ?? error.message ?? "An unexpected error occurred",
      status,
      code: data?.code ?? "UNKNOWN_ERROR",
    });
  }

  if (error instanceof Error) {
    return new ApiError({
      message: error.message,
      status: 0,
      code: "UNKNOWN_ERROR",
    });
  }

  return new ApiError({
    message: "An unexpected error occurred",
    status: 0,
    code: "UNKNOWN_ERROR",
  });
}
```

- [ ] **Step 2: Write unit test**

```ts
import { describe, expect, it } from "vitest";
import { ApiError, createApiError } from "./api-error";
import { AxiosError } from "axios";

describe("createApiError", () => {
  it("creates error from axios error with response body", () => {
    const axiosError = new AxiosError("Request failed", undefined, undefined, undefined, {
      status: 409,
      data: { code: "conflict", message: "email already registered" },
    } as never);

    const error = createApiError(axiosError);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.code).toBe("conflict");
    expect(error.message).toBe("email already registered");
    expect(error.isUnauthorized).toBe(false);
  });

  it("marks 401 errors as unauthorized", () => {
    const axiosError = new AxiosError("Unauthorized", undefined, undefined, undefined, {
      status: 401,
      data: { code: "unauthorized", message: "Unauthorized" },
    } as never);

    const error = createApiError(axiosError);
    expect(error.isUnauthorized).toBe(true);
  });

  it("falls back for unknown errors", () => {
    const error = createApiError("boom");
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.code).toBe("UNKNOWN_ERROR");
  });
});
```

- [ ] **Step 3: Run test**

Run: `cd frontend && npx vitest run src/core/api/api-error.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/core/api/api-error.ts src/core/api/api-error.test.ts
git commit -m "feat(frontend): add typed ApiError and factory"
```

---

### Task 6: Update API client and query client

**Files:**
- Modify: `src/core/api/api-client.ts`
- Modify: `src/core/api/query-client.ts`
- Modify: `src/app/providers/index.tsx`
- Create: `src/core/api/api-client.test.ts`

- [ ] **Step 0: Create auth store first (the API client depends on it)**

Create `src/core/auth/types.ts`:

```ts
export type Role = "student" | "teacher" | "admin" | "parent";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status?: string;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

Create `src/core/auth/auth-store.ts`:

```ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { User } from "./types";

interface AuthStore extends AuthState {
  setSession: (user: User, token: string) => void;
  clearSession: () => void;
  setLoading: (isLoading: boolean) => void;
  reset: () => void;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set) => ({
      ...initialState,
      setSession: (user, token) =>
        set({ user, token, isAuthenticated: true, isLoading: false }),
      clearSession: () => set({ ...initialState, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () => set(initialState),
    }),
    { name: "auth-store" }
  )
);
```

- [ ] **Step 1: Rewrite `src/core/api/api-client.ts`**

```ts
import axios from "axios";
import { useAuthStore } from "@/core/auth/auth-store";
import { createApiError } from "./api-error";
import { logger } from "@/core/logger";

const AUTH_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/refresh"];

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = createApiError(error);

    if (apiError.isUnauthorized) {
      const requestUrl = axios.isAxiosError(error) ? error.config?.url : undefined;
      const isAuthEndpoint = requestUrl ? AUTH_ENDPOINTS.some((path) => requestUrl.endsWith(path)) : false;

      if (!isAuthEndpoint) {
        logger.info("Unauthorized API response; clearing session", { url: requestUrl });
        useAuthStore.getState().clearSession();
      }
    }

    if (apiError.status >= 500) {
      logger.error("Server error", {
        status: apiError.status,
        code: apiError.code,
        url: axios.isAxiosError(error) ? error.config?.url : undefined,
      });
    }

    return Promise.reject(apiError);
  }
);

export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}
```

- [ ] **Step 2: Rewrite `src/core/api/query-client.ts`**

```ts
import { Mutation, MutationCache, QueryClient } from "@tanstack/react-query";
import type { ApiError } from "./api-error";

export interface QueryClientOptions {
  onMutationError?: (
    error: ApiError,
    mutation: Mutation<unknown, unknown, unknown, unknown>
  ) => void;
}

export function createQueryClient({ onMutationError }: QueryClientOptions = {}) {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (onMutationError && error instanceof Error) {
          onMutationError(error as ApiError, mutation);
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
```

- [ ] **Step 3: Update `src/app/providers/index.tsx` to create a fresh query client**

```tsx
import { ErrorBoundary } from "@/core/error-boundary";
import { createQueryClient } from "@/core/api/query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

- [ ] **Step 4: Write `src/core/api/api-client.test.ts`**

```ts
import { describe, expect, it, vi } from "vitest";
import { apiClient, generateIdempotencyKey } from "./api-client";
import { useAuthStore } from "@/core/auth/auth-store";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";

describe("apiClient", () => {
  it("clears session on 401 for protected endpoint", async () => {
    const clearSession = vi.spyOn(useAuthStore.getState(), "clearSession");
    server.use(
      http.get("/api/v1/protected", () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    await expect(apiClient.get("/protected")).rejects.toThrow();
    expect(clearSession).toHaveBeenCalledOnce();
    clearSession.mockRestore();
  });

  it("does not clear session on 401 for login endpoint", async () => {
    const clearSession = vi.spyOn(useAuthStore.getState(), "clearSession");
    server.use(
      http.post("/api/v1/auth/login", () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    await expect(apiClient.post("/auth/login", {})).rejects.toThrow();
    expect(clearSession).not.toHaveBeenCalled();
    clearSession.mockRestore();
  });
});

describe("generateIdempotencyKey", () => {
  it("returns a UUID string", () => {
    const key = generateIdempotencyKey();
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});
```

- [ ] **Step 5: Run typecheck and tests**

Run: `cd frontend && npm run typecheck && npx vitest run src/core/api/api-client.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/auth/types.ts src/core/auth/auth-store.ts src/core/api/api-client.ts src/core/api/query-client.ts src/core/api/api-client.test.ts src/app/providers/index.tsx
git commit -m "feat(frontend): wire api client with auth token, 401 handling, and idempotency helper"
```

---

### Task 7: Build toast notification system

**Files:**
- Create: `src/core/notifications/toast-store.ts`
- Create: `src/core/notifications/toast-store.test.ts`
- Create: `src/core/notifications/toast-container.tsx`
- Create: `src/core/notifications/toast-container.test.tsx`

- [ ] **Step 1: Write `src/core/notifications/toast-store.ts`**

```ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type ToastType = "info" | "success" | "error";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  reset: () => void;
}

const initialState = {
  toasts: [],
};

let toastIdCounter = 0;

export const useToastStore = create<ToastState>()(
  devtools(
    (set) => ({
      ...initialState,
      addToast: (toast) =>
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id: `toast-${++toastIdCounter}` }],
        })),
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
      clearToasts: () => set({ toasts: [] }),
      reset: () => set(initialState),
    }),
    { name: "toast-store" }
  )
);
```

- [ ] **Step 2: Write unit test**

```ts
import { describe, expect, it } from "vitest";
import { useToastStore } from "./toast-store";

describe("toast store", () => {
  it("adds and removes toasts", () => {
    useToastStore.getState().reset();
    useToastStore.getState().addToast({ message: "hello", type: "info", duration: 3000 });
    expect(useToastStore.getState().toasts).toHaveLength(1);

    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().removeToast(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("resets to initial state", () => {
    useToastStore.getState().addToast({ message: "hello", type: "info", duration: 3000 });
    useToastStore.getState().reset();
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Write `src/core/notifications/toast-container.tsx`**

```tsx
import { useToastStore } from "./toast-store";
import { useEffect } from "react";

function ToastItem({ id, message, type, duration }: {
  id: string;
  message: string;
  type: string;
  duration: number;
}) {
  const removeToast = useToastStore((state) => state.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, removeToast]);

  const color =
    type === "error" ? "bg-red-600" : type === "success" ? "bg-green-600" : "bg-slate-800";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`rounded px-4 py-2 text-white shadow ${color}`}
    >
      {message}
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Write test**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToastContainer } from "./toast-container";
import { useToastStore } from "./toast-store";

describe("ToastContainer", () => {
  it("renders toasts from the store", () => {
    useToastStore.getState().reset();
    useToastStore.getState().addToast({ message: "saved", type: "success", duration: 3000 });
    render(<ToastContainer />);
    expect(screen.getByText("saved")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run tests**

Run: `cd frontend && npx vitest run src/core/notifications/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/notifications/
git commit -m "feat(frontend): add toast store and container with a11y live region"
```

---

### Task 8: Set up MSW test infrastructure

**Files:**
- Create: `src/test/msw/server.ts`
- Create: `src/test/msw/handlers.ts`
- Create: `src/test/msw/handlers/users.handlers.ts`
- Modify: `src/test/setup.ts`
- Modify: `src/test/render.tsx`

- [ ] **Step 1: Write `src/test/msw/server.ts`**

```ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

- [ ] **Step 2: Write `src/test/msw/handlers.ts`**

```ts
import { usersHandlers } from "./handlers/users.handlers";

export const handlers = [...usersHandlers];
```

- [ ] **Step 3: Write `src/test/msw/handlers/users.handlers.ts`**

```ts
import { http, HttpResponse } from "msw";

export const usersHandlers = [
  http.post("/api/v1/users", async ({ request }) => {
    const body = (await request.json()) as { email?: string };
    if (body.email === "duplicate@example.com") {
      return HttpResponse.json(
        { code: "conflict", message: "email already registered" },
        { status: 409 }
      );
    }
    if (body.email === "rate@example.com") {
      return HttpResponse.json(
        { code: "rate_limited", message: "too many requests" },
        { status: 429 }
      );
    }
    return HttpResponse.json(
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: body.email?.split("@")[0] ?? "Test User",
        email: body.email ?? "test@example.com",
        role: "student",
        status: "pending_verification",
        created_at: "2026-06-18T04:24:34Z",
      },
      { status: 201 }
    );
  }),
];
```

- [ ] **Step 4: Update `src/test/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { server } from "@/test/msw/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- [ ] **Step 5: Update `src/test/render.tsx`**

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender } from "@testing-library/react";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";

interface RenderOptions {
  initialEntries?: MemoryRouterProps["initialEntries"];
}

export function render(ui: React.ReactElement, options: RenderOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter {...options}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 6: Run a sample test to verify MSW**

Run: `cd frontend && npx vitest run src/core/api/api-client.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/test/
git commit -m "test(frontend): configure MSW server and isolated render helper"
```

---

### Task 9: Add auth store unit tests

**Files:**
- Create: `src/core/auth/auth-store.test.ts`

- [ ] **Step 1: Write unit test**

```ts
import { describe, expect, it } from "vitest";
import { useAuthStore } from "./auth-store";

const mockUser = {
  id: "u-1",
  email: "test@example.com",
  name: "Test User",
  role: "student" as const,
};

describe("auth store", () => {
  it("sets and clears session", () => {
    useAuthStore.getState().reset();
    useAuthStore.getState().setSession(mockUser, "token");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().token).toBe("token");

    useAuthStore.getState().clearSession();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("resets to initial state", () => {
    useAuthStore.getState().setSession(mockUser, "token");
    useAuthStore.getState().reset();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd frontend && npx vitest run src/core/auth/auth-store.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/core/auth/auth-store.test.ts
git commit -m "test(frontend): add auth store unit tests"
```

---

### Task 10: Create auth hooks and provider

**Files:**
- Create: `src/core/auth/use-auth.ts`
- Create: `src/core/auth/use-auth.test.tsx`
- Create: `src/core/auth/use-role.ts`
- Create: `src/core/auth/use-role.test.tsx`
- Create: `src/core/auth/auth-provider.tsx`

- [ ] **Step 1: Write `src/core/auth/use-auth.ts`**

```ts
import { useAuthStore } from "./auth-store";
import type { User } from "./types";

export interface UseAuthResult {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (user: User, token: string) => void;
  clearSession: () => void;
}

export function useAuth(): UseAuthResult {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  return { user, token, isAuthenticated, isLoading, setSession, clearSession };
}
```

- [ ] **Step 2: Write `src/core/auth/use-role.ts`**

```ts
import { useAuth } from "./use-auth";
import type { Role } from "./types";

export function useRole() {
  const { user } = useAuth();
  const role = user?.role ?? null;

  return {
    role,
    isAdmin: role === "admin",
    isTeacher: role === "teacher" || role === "admin",
    isInstructor: role === "teacher" || role === "admin",
    isParent: role === "parent",
    hasRole: (allowedRoles: Role[]) => (role ? allowedRoles.includes(role) : false),
  };
}
```

- [ ] **Step 3: Write `src/core/auth/auth-provider.tsx`**

```tsx
import { useEffect } from "react";
import { useAuthStore } from "./auth-store";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    // The backend has no session/token endpoint yet, so there is nothing to restore.
    // When a persistent session mechanism (e.g., httpOnly cookie + /me) is added,
    // replace this no-op with a real restore call.
    setLoading(false);
  }, [setLoading]);

  return <>{children}</>;
}
```

- [ ] **Step 4: Write tests**

`src/core/auth/use-auth.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth } from "./use-auth";
import { useAuthStore } from "./auth-store";

describe("useAuth", () => {
  it("reflects auth store state", () => {
    useAuthStore.getState().reset();
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);

    result.current.setSession(
      { id: "u-1", email: "a@b.com", name: "A", role: "student" },
      "token"
    );
    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

`src/core/auth/use-role.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRole } from "./use-role";
import { useAuthStore } from "./auth-store";

describe("useRole", () => {
  it("identifies admin role", () => {
    useAuthStore.getState().reset();
    useAuthStore.getState().setSession(
      { id: "u-1", email: "a@b.com", name: "A", role: "admin" },
      "token"
    );
    const { result } = renderHook(() => useRole());
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.hasRole(["admin", "teacher"])).toBe(true);
  });

  it("identifies parent role", () => {
    useAuthStore.getState().reset();
    useAuthStore.getState().setSession(
      { id: "u-2", email: "p@b.com", name: "P", role: "parent" },
      "token"
    );
    const { result } = renderHook(() => useRole());
    expect(result.current.isParent).toBe(true);
    expect(result.current.isTeacher).toBe(false);
  });
});
```

- [ ] **Step 5: Run tests**

Run: `cd frontend && npx vitest run src/core/auth/use-auth.test.tsx src/core/auth/use-role.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/auth/use-auth.ts src/core/auth/use-auth.test.tsx src/core/auth/use-role.ts src/core/auth/use-role.test.tsx src/core/auth/auth-provider.tsx
git commit -m "feat(frontend): add useAuth, useRole, and no-op AuthProvider"
```

---

### Task 11: Implement route guards

**Files:**
- Create: `src/core/auth/protected-route.tsx`
- Create: `src/core/auth/guest-route.tsx`
- Create: `src/core/auth/role-guard.tsx`
- Create: `src/core/auth/route-guards.test.tsx`
- Create: `src/core/ui/spinner.tsx`

- [ ] **Step 1: Write `src/core/ui/spinner.tsx`**

```tsx
interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent ${className ?? ""}`}
    >
      <span className="sr-only">Loading</span>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/core/auth/protected-route.tsx`**

```tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./use-auth";
import { Spinner } from "@/core/ui/spinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/register" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 3: Write `src/core/auth/guest-route.tsx`**

```tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./use-auth";

interface GuestRouteProps {
  children: React.ReactNode;
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 4: Write `src/core/auth/role-guard.tsx`**

```tsx
import { Navigate } from "react-router-dom";
import type { Role } from "./types";
import { useRole } from "./use-role";

interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { hasRole } = useRole();

  if (!hasRole(allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 5: Write `src/core/auth/route-guards.test.tsx`**

```tsx
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@/test/render";
import { ProtectedRoute } from "./protected-route";
import { GuestRoute } from "./guest-route";
import { RoleGuard } from "./role-guard";
import { useAuthStore } from "./auth-store";
import { Routes, Route } from "react-router-dom";

function setup() {
  useAuthStore.getState().reset();
}

describe("route guards", () => {
  it("ProtectedRoute redirects when unauthenticated", () => {
    setup();
    render(
      <Routes>
        <Route path="/register" element={<div>Register page</div>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Dashboard</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { initialEntries: ["/dashboard"] }
    );
    expect(screen.getByText("Register page")).toBeInTheDocument();
  });

  it("GuestRoute redirects when authenticated", () => {
    setup();
    useAuthStore.getState().setSession(
      { id: "u-1", email: "a@b.com", name: "A", role: "student" },
      "token"
    );
    render(
      <Routes>
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <div>Register page</div>
            </GuestRoute>
          }
        />
      </Routes>,
      { initialEntries: ["/register"] }
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("RoleGuard blocks non-admins from admin route", () => {
    setup();
    useAuthStore.getState().setSession(
      { id: "u-1", email: "a@b.com", name: "A", role: "student" },
      "token"
    );
    render(
      <Routes>
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route
          path="/admin"
          element={
            <RoleGuard allowedRoles={["admin"]}>
              <div>Admin</div>
            </RoleGuard>
          }
        />
      </Routes>,
      { initialEntries: ["/admin"] }
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run guard tests**

Run: `cd frontend && npx vitest run src/core/auth/route-guards.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/auth/protected-route.tsx src/core/auth/guest-route.tsx src/core/auth/role-guard.tsx src/core/auth/route-guards.test.tsx src/core/ui/spinner.tsx
git commit -m "feat(frontend): add protected, guest, and role route guards"
```

---

### Task 12: Build route tree with lazy loading and accessibility focus

**Files:**
- Create: `src/core/routing/route-paths.ts`
- Create: `src/core/routing/use-focus-on-route-change.ts`
- Create: `src/core/routing/route-tree.tsx`
- Create: `src/core/routing/app-router.tsx`
- Create: `src/core/routing/not-found-page.tsx`
- Modify: `src/app/layout/root-layout.tsx`
- Modify: `src/App.tsx`
- Delete: `src/routes/route-paths.ts`
- Delete: `src/routes/index.tsx`

- [ ] **Step 1: Write `src/core/routing/route-paths.ts`**

```ts
export const routePaths = {
  home: "/",
  register: "/register",
  registerSuccess: "/register/success",
  dashboard: "/dashboard",
  courses: "/courses",
  course: (id: string) => `/courses/${id}`,
  lesson: (id: string) => `/lessons/${id}`,
  assignments: "/assignments",
  admin: "/admin",
  settings: "/settings",
} as const;
```

- [ ] **Step 2: Write `src/core/routing/use-focus-on-route-change.ts`**

```ts
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useFocusOnRouteChange(mainRef: React.RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    main.focus({ preventScroll: true });
  }, [pathname, mainRef]);
}
```

- [ ] **Step 3: Update `src/app/layout/root-layout.tsx`**

```tsx
import { routePaths } from "@/core/routing/route-paths";
import { useFocusOnRouteChange } from "@/core/routing/use-focus-on-route-change";
import { Link, Outlet } from "react-router-dom";
import { useRef } from "react";

export function RootLayout() {
  const mainRef = useRef<HTMLElement>(null);
  useFocusOnRouteChange(mainRef);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-6 py-4">
        <nav className="flex gap-4">
          <Link to={routePaths.home} className="font-semibold hover:underline">
            Klynt
          </Link>
          <Link to={routePaths.dashboard} className="hover:underline">
            Dashboard
          </Link>
          <Link to={routePaths.register} className="hover:underline">
            Register
          </Link>
        </nav>
      </header>
      <main ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Write lazy feature pages**

`src/features/auth/pages/register-page.tsx`:

```tsx
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-semibold">Create account</h1>
      <RegisterForm />
    </div>
  );
}
```

`src/features/auth/pages/register-success-page.tsx`:

```tsx
import { useLocation, Link } from "react-router-dom";
import { routePaths } from "@/core/routing/route-paths";

interface LocationState {
  user?: { name: string; email: string };
}

export default function RegisterSuccessPage() {
  const location = useLocation();
  const state = location.state as LocationState | undefined;

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-semibold">Account created</h1>
      {state?.user ? (
        <p className="text-slate-700">
          Welcome, {state.user.name}. A verification link has been sent to {state.user.email}.
        </p>
      ) : (
        <p className="text-slate-700">A verification link has been sent to your email.</p>
      )}
      <Link to={routePaths.home} className="mt-4 inline-block text-blue-600 hover:underline">
        Go home
      </Link>
    </div>
  );
}
```

`src/features/dashboard/pages/dashboard-page.tsx`:

```tsx
export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-slate-600">Welcome back.</p>
    </div>
  );
}
```

`src/features/admin/pages/admin-page.tsx`:

```tsx
export default function AdminPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
    </div>
  );
}
```

`src/core/routing/not-found-page.tsx`:

```tsx
import { routePaths } from "./route-paths";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to={routePaths.home} className="mt-4 inline-block text-blue-600 hover:underline">
        Go home
      </Link>
    </div>
  );
}
```

- [ ] **Step 5: Write `src/core/routing/route-tree.tsx`**

```tsx
import { RootLayout } from "@/app/layout/root-layout";
import { GuestRoute } from "@/core/auth/guest-route";
import { ProtectedRoute } from "@/core/auth/protected-route";
import { RoleGuard } from "@/core/auth/role-guard";
import { Spinner } from "@/core/ui/spinner";
import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import { routePaths } from "./route-paths";

const RegisterPage = lazy(() => import("@/features/auth/pages/register-page"));
const RegisterSuccessPage = lazy(() => import("@/features/auth/pages/register-success-page"));
const DashboardPage = lazy(() => import("@/features/dashboard/pages/dashboard-page"));
const AdminPage = lazy(() => import("@/features/admin/pages/admin-page"));
const NotFoundPage = lazy(() => import("./not-found-page"));

function GuestLayout() {
  return (
    <GuestRoute>
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
    </GuestRoute>
  );
}

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
    </ProtectedRoute>
  );
}

function AdminLayout() {
  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={["admin"]}>
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </RoleGuard>
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  {
    path: routePaths.home,
    element: <RootLayout />,
    hydrateFallbackElement: <Spinner />,
    children: [
      { index: true, element: <div className="p-6">Welcome to Klynt</div> },
      {
        element: <GuestLayout />,
        children: [
          { path: routePaths.register, element: <RegisterPage /> },
          { path: routePaths.registerSuccess, element: <RegisterSuccessPage /> },
        ],
      },
      {
        element: <ProtectedLayout />,
        children: [{ path: routePaths.dashboard, element: <DashboardPage /> }],
      },
      {
        element: <AdminLayout />,
        children: [{ path: routePaths.admin, element: <AdminPage /> }],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
```

- [ ] **Step 6: Write `src/core/routing/app-router.tsx`**

```tsx
import { RouterProvider } from "react-router-dom";
import { router } from "./route-tree";

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 7: Update `src/App.tsx`**

```tsx
import { AppRouter } from "@/core/routing/app-router";

export function App() {
  return <AppRouter />;
}
```

- [ ] **Step 8: Delete old route files**

```bash
rm -rf src/routes
```

- [ ] **Step 9: Run typecheck**

Run: `cd frontend && npm run typecheck`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(frontend): add route tree with lazy loading, guards, and focus management"
```

---

### Task 13: Create remaining UI primitives

**Files:**
- Create: `src/core/ui/input.tsx`
- Create: `src/core/ui/label.tsx`
- Create: `src/core/ui/card.tsx`
- Create: `src/core/ui/skeleton.tsx`
- Create: `src/core/ui/empty-state.tsx`
- Create: `src/core/ui/query-error.tsx`
- Modify: `src/core/ui/button.tsx`

- [ ] **Step 1: Write `src/core/ui/label.tsx`**

```tsx
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export function Label({ children, ...props }: LabelProps) {
  return (
    <label className="mb-1 block text-sm font-medium" {...props}>
      {children}
    </label>
  );
}
```

- [ ] **Step 2: Write `src/core/ui/input.tsx`**

```tsx
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400",
          hasError && "border-red-500 focus:ring-red-400",
          className
        )}
        aria-invalid={hasError ? true : undefined}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
```

- [ ] **Step 3: Write `src/core/ui/card.tsx`**

```tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={`rounded border bg-white p-4 shadow-sm ${className ?? ""}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Write `src/core/ui/skeleton.tsx`**

```tsx
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200 ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 5: Write `src/core/ui/empty-state.tsx`**

```tsx
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 text-slate-600">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 6: Write `src/core/ui/query-error.tsx`**

```tsx
import { Button } from "./button";

interface QueryErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function QueryError({
  title = "Something went wrong",
  message = "We couldn't load this data. Please try again.",
  onRetry,
}: QueryErrorProps) {
  return (
    <div className="rounded border border-red-200 bg-red-50 p-4 text-red-800">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Update `src/core/ui/button.tsx`**

```tsx
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  isLoading?: boolean;
}

export function Button({
  variant = "primary",
  className,
  children,
  isLoading,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        variant === "primary" && "bg-slate-900 text-white hover:bg-slate-800",
        variant === "secondary" && "border border-slate-300 hover:bg-slate-100",
        className
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading && <Spinner className="mr-2 h-4 w-4" />}
      {children}
    </button>
  );
}
```

- [ ] **Step 8: Run typecheck and lint**

Run: `cd frontend && npm run check`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/core/ui/
git commit -m "feat(frontend): add Input, Label, Card, Skeleton, EmptyState, QueryError, and loading Button"
```

---

### Task 14: Create form primitives

**Files:**
- Create: `src/core/forms/use-zod-form.ts`
- Create: `src/core/forms/form-field.tsx`
- Create: `src/core/forms/input-field.tsx`
- Create: `src/core/forms/select-field.tsx`
- Create: `src/core/forms/checkbox-field.tsx`

- [ ] **Step 1: Write `src/core/forms/use-zod-form.ts`**

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormProps } from "react-hook-form";
import type { z } from "zod";

export function useZodForm<TSchema extends z.ZodType>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.infer<TSchema>>, "resolver">
) {
  return useForm<z.infer<TSchema>>({
    ...options,
    resolver: zodResolver(schema),
  });
}
```

- [ ] **Step 2: Write `src/core/forms/form-field.tsx`**

```tsx
import { Label } from "@/core/ui/label";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div className="mb-4">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write `src/core/forms/input-field.tsx`**

```tsx
import { useFormContext, Controller } from "react-hook-form";
import { Input } from "@/core/ui/input";
import { FormField } from "./form-field";

interface InputFieldProps {
  name: string;
  label: string;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
}

export function InputField({ name, label, type = "text", placeholder }: InputFieldProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormField label={label} htmlFor={name} error={fieldState.error?.message}>
          <Input
            {...field}
            id={name}
            type={type}
            placeholder={placeholder}
            hasError={!!fieldState.error}
            aria-describedby={fieldState.error ? `${name}-error` : undefined}
          />
        </FormField>
      )}
    />
  );
}
```

- [ ] **Step 4: Write `src/core/forms/select-field.tsx`**

```tsx
import { useFormContext, Controller } from "react-hook-form";
import { cn } from "@/lib/utils";
import { FormField } from "./form-field";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  name: string;
  label: string;
  options: SelectOption[];
  placeholder?: string;
}

export function SelectField({ name, label, options, placeholder }: SelectFieldProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormField label={label} htmlFor={name} error={fieldState.error?.message}>
          <select
            {...field}
            id={name}
            className={cn(
              "w-full rounded border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400",
              fieldState.error && "border-red-500 focus:ring-red-400"
            )}
            aria-invalid={fieldState.error ? true : undefined}
            aria-describedby={fieldState.error ? `${name}-error` : undefined}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
      )}
    />
  );
}
```

- [ ] **Step 5: Write `src/core/forms/checkbox-field.tsx`**

```tsx
import { useFormContext, Controller } from "react-hook-form";
import { Label } from "@/core/ui/label";

interface CheckboxFieldProps {
  name: string;
  label: React.ReactNode;
}

export function CheckboxField({ name, label }: CheckboxFieldProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className="mb-4 flex items-start gap-2">
          <input
            {...field}
            id={name}
            type="checkbox"
            checked={field.value}
            onChange={(e) => field.onChange(e.target.checked)}
            className="mt-1 h-4 w-4"
            aria-invalid={fieldState.error ? true : undefined}
            aria-describedby={fieldState.error ? `${name}-error` : undefined}
          />
          <div>
            <Label htmlFor={name}>{label}</Label>
            {fieldState.error && (
              <p id={`${name}-error`} className="text-sm text-red-600" role="alert">
                {fieldState.error.message}
              </p>
            )}
          </div>
        </div>
      )}
    />
  );
}
```

- [ ] **Step 6: Run typecheck**

Run: `cd frontend && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/forms/
git commit -m "feat(frontend): add useZodForm, InputField, SelectField, and CheckboxField primitives"
```

---

### Task 15: Build registration feature against real backend

**Files:**
- Create: `src/features/auth/api/types.ts`
- Create: `src/features/auth/api/register.ts`
- Create: `src/features/auth/schemas/register-schema.ts`
- Create: `src/features/auth/hooks/use-register.ts`
- Create: `src/features/auth/components/register-form.tsx`
- Create: `src/features/auth/components/register-form.test.tsx`

- [ ] **Step 1: Write `src/features/auth/api/types.ts`**

```ts
import type { Role } from "@/core/auth/types";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  institutionId?: string;
  termsAccepted: boolean;
  termsVersion: string;
}

export interface RegisterResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  created_at: string;
}
```

- [ ] **Step 2: Write `src/features/auth/api/register.ts`**

```ts
import { apiClient, generateIdempotencyKey } from "@/core/api/api-client";
import type { RegisterInput, RegisterResponse } from "./types";

export async function registerUser(input: RegisterInput): Promise<RegisterResponse> {
  const idempotencyKey = generateIdempotencyKey();
  const { data } = await apiClient.post<RegisterResponse>(
    "/users",
    {
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
      institution_id: input.institutionId ?? null,
      terms_accepted: input.termsAccepted,
      terms_version: input.termsVersion,
    },
    {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    }
  );
  return data;
}
```

- [ ] **Step 3: Write `src/features/auth/schemas/register-schema.ts`**

```ts
import { z } from "zod";

const ROLES = ["student", "teacher", "admin", "parent"] as const;

export const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(12, "Password must be at least 12 characters"),
    role: z.enum(ROLES, { invalid_type_error: "Select a role" }),
    institutionId: z.string().uuid("Enter a valid institution ID").optional(),
    termsAccepted: z.boolean().refine((value) => value === true, {
      message: "You must accept the terms",
    }),
    termsVersion: z.string().min(1, "Terms version is required"),
  })
  .superRefine((data, ctx) => {
    if ((data.role === "teacher" || data.role === "admin") && !data.institutionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["institutionId"],
        message: "Institution is required for this role",
      });
    }
  });

export type RegisterSchema = z.infer<typeof registerSchema>;
```

- [ ] **Step 4: Write `src/features/auth/hooks/use-register.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToastStore } from "@/core/notifications/toast-store";
import { ApiError } from "@/core/api/api-error";
import { registerUser } from "@/features/auth/api/register";
import type { RegisterInput } from "@/features/auth/api/types";
import { routePaths } from "@/core/routing/route-paths";

export function useRegister() {
  const navigate = useNavigate();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (input: RegisterInput) => registerUser(input),
    meta: { suppressToast: true },
    onSuccess: (data) => {
      navigate(routePaths.registerSuccess, {
        state: { user: { name: data.name, email: data.email } },
      });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "rate_limited") {
        addToast({
          message: "Too many registration attempts. Please try again later.",
          type: "error",
          duration: 5000,
        });
      }
    },
  });
}
```

- [ ] **Step 5: Write `src/features/auth/components/register-form.tsx`**

```tsx
import { FormProvider } from "react-hook-form";
import { Button } from "@/core/ui/button";
import { InputField } from "@/core/forms/input-field";
import { SelectField } from "@/core/forms/select-field";
import { CheckboxField } from "@/core/forms/checkbox-field";
import { useZodForm } from "@/core/forms/use-zod-form";
import { registerSchema } from "@/features/auth/schemas/register-schema";
import { useRegister } from "@/features/auth/hooks/use-register";
import { ApiError } from "@/core/api/api-error";

const ROLE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
  { value: "admin", label: "Admin" },
  { value: "parent", label: "Parent" },
];

const CURRENT_TERMS_VERSION = "2026-06-18";

export function RegisterForm() {
  const register = useRegister();
  const form = useZodForm(registerSchema, {
    defaultValues: {
      role: "student",
      termsAccepted: false,
      termsVersion: CURRENT_TERMS_VERSION,
    },
  });

  const selectedRole = form.watch("role");
  const requiresInstitution = selectedRole === "teacher" || selectedRole === "admin";

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await register.mutateAsync(data);
    } catch (error) {
      if (error instanceof ApiError && (error.code === "bad_request" || error.code === "conflict")) {
        form.setError("root", { message: error.message });
      }
    }
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <InputField name="name" label="Full name" placeholder="Ada Lovelace" />
        <InputField name="email" label="Email" type="email" placeholder="ada@example.com" />
        <InputField name="password" label="Password" type="password" />
        <SelectField
          name="role"
          label="I am a"
          options={ROLE_OPTIONS}
          placeholder="Select a role"
        />
        {requiresInstitution && (
          <InputField
            name="institutionId"
            label="Institution ID"
            placeholder="550e8400-e29b-41d4-a716-446655440001"
          />
        )}
        <CheckboxField
          name="termsAccepted"
          label={
            <>
              I agree to the{" "}
              <a href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </a>
            </>
          }
        />
        {form.formState.errors.root && (
          <p className="text-sm text-red-600" role="alert">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" isLoading={register.isPending} className="w-full">
          Create account
        </Button>
      </form>
    </FormProvider>
  );
}
```

- [ ] **Step 6: Write `src/features/auth/components/register-form.test.tsx`**

```tsx
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterForm } from "./register-form";
import { render } from "@/test/render";

describe("RegisterForm", () => {
  it("validates required fields", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(await screen.findByText(/at least 12 characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/must accept the terms/i)).toBeInTheDocument();
  });

  it("submits valid student registration", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/password/i), "str0ng!passphrase");
    await user.click(screen.getByLabelText(/i agree/i));
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /create account/i })).not.toBeDisabled();
    });
  });

  it("shows inline error for duplicate email", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/email/i), "duplicate@example.com");
    await user.type(screen.getByLabelText(/password/i), "str0ng!passphrase");
    await user.click(screen.getByLabelText(/i agree/i));
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run registration feature tests**

Run: `cd frontend && npx vitest run src/features/auth/`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/features/auth/
git commit -m "feat(frontend): add registration feature integrated with POST /api/v1/users"
```

---

### Task 16: Compose providers and update error boundary

**Files:**
- Modify: `src/core/error-boundary/index.tsx`
- Modify: `src/app/providers/index.tsx`

- [ ] **Step 1: Rewrite `src/core/error-boundary/index.tsx`**

```tsx
import { logger } from "@/core/logger";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

function Fallback({
  error,
  resetErrorBoundary,
}: {
  error: unknown;
  resetErrorBoundary: () => void;
}) {
  const message = error instanceof Error ? error.message : "Unknown error";
  return (
    <div className="p-6" role="alert">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <pre className="mt-2 text-sm text-red-600">{message}</pre>
      <button
        type="button"
        onClick={resetErrorBoundary}
        className="mt-4 rounded bg-slate-900 px-4 py-2 text-white"
      >
        Try again
      </button>
    </div>
  );
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={Fallback}
      onError={(error, info) => {
        logger.error("Uncaught render error", {
          error: error instanceof Error ? error.message : String(error),
          componentStack: info.componentStack,
        });
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd frontend && npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Update `src/app/providers/index.tsx` to compose AuthProvider and ToastContainer**

```tsx
import { AuthProvider } from "@/core/auth/auth-provider";
import { ErrorBoundary } from "@/core/error-boundary";
import { createQueryClient } from "@/core/api/query-client";
import { ToastContainer } from "@/core/notifications/toast-container";
import { useToastStore } from "@/core/notifications/toast-store";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [queryClient] = useState(() =>
    createQueryClient({
      onMutationError: (error, mutation) => {
        if ((mutation.meta as { suppressToast?: boolean } | undefined)?.suppressToast) {
          return;
        }
        addToast({ message: error.message, type: "error", duration: 5000 });
      },
    })
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
          <ToastContainer />
          <ReactQueryDevtools initialIsOpen={false} />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

- [ ] **Step 4: Run typecheck**

Run: `cd frontend && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/error-boundary/index.tsx src/app/providers/index.tsx
git commit -m "feat(frontend): compose providers and log render errors"
```

---

### Task 17: Manual verification against real backend

**Files:** All of `backend/` and `frontend/`

- [ ] **Step 1: Start backend**

Run: `cd backend && cargo run`
Expected: Server listens on `127.0.0.1:3000`.

- [ ] **Step 2: Start frontend**

In a second terminal, run: `cd frontend && npm run dev`
Expected: Vite dev server listens on `http://localhost:5173`.

- [ ] **Step 3: Submit registration**

Open `http://localhost:5173/register` in a browser.
Fill in:
- Full name: `Ada Lovelace`
- Email: a unique email address
- Password: `str0ng!passphrase`
- Role: `Student`
- Check terms checkbox
Click **Create account**.

Expected:
- Network tab shows `POST http://localhost:5173/api/v1/users` proxied to `http://localhost:3000/api/v1/users`.
- Request includes `Idempotency-Key` header and the JSON body.
- Response is `201 Created` with `status: "pending_verification"`.
- Browser navigates to `/register/success` and shows the welcome message.

- [ ] **Step 4: Verify duplicate handling**

Submit the same email again.
Expected:
- Response is `409 conflict`.
- Form shows inline error: "email already registered: ..." without clearing fields.

- [ ] **Step 5: Verify rate limiting**

Submit the form from the same IP more than 5 times within 15 minutes.
Expected:
- Response is `429 too many requests`.
- A toast appears with: "Too many registration attempts. Please try again later."

- [ ] **Step 6: Record results**

If any step fails, file a bug and fix the plan before claiming completion. If all pass, proceed to Task 18.

---

### Task 18: Final verification

**Files:** All of `frontend/`

- [ ] **Step 1: Run formatting and lint check**

Run: `cd frontend && npm run check`
Expected: PASS with no warnings or errors.

- [ ] **Step 2: Run typecheck**

Run: `cd frontend && npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Run tests**

Run: `cd frontend && npm run test`
Expected: PASS.

- [ ] **Step 4: Build**

Run: `cd frontend && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit final state**

```bash
git add -A
git commit -m "chore(frontend): foundation verification — format, typecheck, tests, build"
```

---

## Plan Self-Review

### Spec Coverage

| Spec Section | Plan Task |
|---|---|
| Backend registration contract | Header, Task 15 |
| Folder structure / core relocation | Task 1, 12 |
| State management / Zustand stores | Task 7, 9, 12 |
| API layer / ApiError / idempotency | Task 4, 5, 6 |
| Routing / lazy loading / guards | Task 11, 12 |
| Role model / RoleGuard | Task 9, 11 |
| Forms | Task 14 |
| Registration feature | Task 15 |
| UI primitives | Task 11, 13 |
| Accessibility / focus | Task 12 |
| Testing / MSW / render | Task 8, 11, 15 |
| Observability / logger | Task 4, 16 |
| Environment types | Task 3 |
| Manual verification against real BE | Task 17 |

### Placeholder Scan

No `TBD`, `TODO`, "implement later", or vague "add appropriate" steps remain. Every task includes exact file paths and code.

### Type Consistency

- `Role` is `student | teacher | admin | parent` everywhere, matching the backend.
- `RegisterInput` maps exactly to the backend `CreateUserRequest` field names (snake_case on the wire, camelCase in TypeScript).
- `ApiError` fields are consistent across factory, interceptor, and tests.

### Gaps

- **Backend login/session:** intentionally deferred; the frontend prepares auth/session scaffolding but registration is the only working flow.
- **Auto-generated TypeScript types from `klynt-contracts`:** deferred; types are manually defined in `features/auth/api/types.ts` and should be regenerated once the build-time generator is available.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-18-frontend-foundation-plan.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `executing-plans`, with checkpoints for review.

Which approach would you like?