import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import type { UserRole } from "@/core/auth/types";
import { server } from "@/test/msw/server";
import { createAdminRouter } from "./admin-router";

vi.mock("@/features/dashboard/pages/dashboard-page", () => ({
  default: () => <div data-testid="dashboard-page">Dashboard</div>,
}));

vi.mock("@/features/admin/pages/admin-page", () => ({
  default: () => <div data-testid="admin-page">Admin</div>,
}));

const originalDomain = import.meta.env.VITE_APP_DOMAIN;
const originalProtocol = import.meta.env.VITE_APP_PROTOCOL;

const mockUser = {
  id: "u-1",
  email: "a@b.com",
  full_name: "Jayden",
  role: "student" as const,
  status: "active" as const,
  created_at: "2024-01-01T00:00:00Z",
};

function stubLocation(href: string) {
  const url = new URL(href);
  Object.defineProperty(window, "location", {
    value: {
      origin: url.origin,
      host: url.host,
      hostname: url.hostname,
      href: url.href,
      protocol: url.protocol,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      replace: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
  import.meta.env.VITE_APP_DOMAIN = "lvh.me";
  import.meta.env.VITE_APP_PROTOCOL = "http";
}

function setAuthenticated(role: UserRole) {
  useAuthStore.getState().setSession({
    id: "u-1",
    email: "a@b.com",
    username: "jayden",
    name: "Jayden",
    role,
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
  });
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function render(ui: React.ReactElement) {
  return rtlRender(ui, { wrapper: createWrapper() });
}

function mockMeResponse(role: UserRole | null) {
  server.use(
    http.get("/api/v1/users/me", () =>
      role
        ? HttpResponse.json({ data: { ...mockUser, role } })
        : new HttpResponse(null, { status: 401 })
    )
  );
}

describe("createAdminRouter", () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    useAuthStore.getState().reset();
    useAuthStore.getState().setLoading(false);
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    import.meta.env.VITE_APP_DOMAIN = originalDomain;
    import.meta.env.VITE_APP_PROTOCOL = originalProtocol;
  });

  it("renders the dashboard for admins", async () => {
    setAuthenticated("admin");
    mockMeResponse("admin");
    stubLocation("http://admin.lvh.me:5174/");
    const router = createAdminRouter();
    const { getByTestId } = render(<RouterProvider router={router} />);
    await waitFor(() => expect(getByTestId("dashboard-page")).toBeInTheDocument());
  });

  it("renders the admin page at /admin for admins", async () => {
    setAuthenticated("admin");
    mockMeResponse("admin");
    stubLocation("http://admin.lvh.me:5174/admin");
    const router = createAdminRouter();
    const { getByTestId } = render(<RouterProvider router={router} />);
    await waitFor(() => expect(getByTestId("admin-page")).toBeInTheDocument());
  });

  it("redirects non-admins to the apex home", async () => {
    setAuthenticated("student");
    mockMeResponse("student");
    stubLocation("http://admin.lvh.me:5174/");
    const router = createAdminRouter();
    render(<RouterProvider router={router} />);
    await waitFor(() =>
      expect(window.location.replace).toHaveBeenCalledWith("http://lvh.me:5174/")
    );
  });
});
