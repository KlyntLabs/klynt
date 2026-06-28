import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import type { Permission, Role, Tenant } from "@/features/tenant";
import { listMyTenants } from "../api/tenant-api";
import { listPermissions, listRoles } from "./api";
import { usePermission, usePermissions } from "./permissions-module";

vi.mock("@/core/auth/auth-store", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("./api", () => ({
  listPermissions: vi.fn(),
  listRoles: vi.fn(),
  createRole: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
}));

vi.mock("../api/tenant-api", () => ({
  listMyTenants: vi.fn(),
  createTenant: vi.fn(),
  getTenant: vi.fn(),
  updateTenant: vi.fn(),
  removeTenant: vi.fn(),
  acceptTenantInvite: vi.fn(),
  tenantApi: {},
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const catalog: Permission[] = [
  {
    id: "perm-courses-read",
    name: "courses:read",
    description: "View courses",
    category: "content",
  },
  {
    id: "perm-tenant-view",
    name: "tenant.view",
    description: "View tenant",
    category: "tenant",
  },
];

const roles: Role[] = [
  {
    id: "role-admin",
    tenantId: "tenant-acme",
    name: "admin",
    description: "Admin role",
    isSystem: false,
    permissionIds: ["perm-courses-read"],
    createdAt: "2026-06-22T00:00:00Z",
    updatedAt: "2026-06-22T00:00:00Z",
  },
];

const tenant: Tenant = {
  id: "tenant-acme",
  slug: "acme",
  name: "Acme",
  role: "admin",
  joinedAt: "2026-06-22T00:00:00Z",
};

describe("usePermissions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns hasPermission('courses:read') === true when the role grants it", async () => {
    vi.mocked(useAuthStore).mockReturnValue(tenant);
    vi.mocked(listPermissions).mockResolvedValue(catalog);
    vi.mocked(listRoles).mockResolvedValue(roles);

    const { result } = renderHook(() => usePermissions("acme"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasPermission("courses:read")).toBe(true);
  });

  it("returns hasPermission('admin:delete') === false when the role does not grant it", async () => {
    vi.mocked(useAuthStore).mockReturnValue(tenant);
    vi.mocked(listPermissions).mockResolvedValue(catalog);
    vi.mocked(listRoles).mockResolvedValue(roles);

    const { result } = renderHook(() => usePermissions("acme"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasPermission("admin:delete")).toBe(false);
  });

  it("sets isLoading to false after data resolves", async () => {
    vi.mocked(useAuthStore).mockReturnValue(tenant);
    vi.mocked(listPermissions).mockResolvedValue(catalog);
    vi.mocked(listRoles).mockResolvedValue(roles);

    const { result } = renderHook(() => usePermissions("acme"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("resolves role from listMyTenants when active tenant does not match slug", async () => {
    vi.mocked(useAuthStore).mockReturnValue({ ...tenant, slug: "other", role: "member" });
    vi.mocked(listPermissions).mockResolvedValue(catalog);
    vi.mocked(listRoles).mockResolvedValue(roles);
    vi.mocked(listMyTenants).mockResolvedValue([tenant]);

    const { result } = renderHook(() => usePermissions("acme"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.role).toBe("admin");
    expect(result.current.hasPermission("courses:read")).toBe(true);
  });

  it("supports hasAllPermissions and hasAnyPermission", async () => {
    vi.mocked(useAuthStore).mockReturnValue(tenant);
    vi.mocked(listPermissions).mockResolvedValue(catalog);
    vi.mocked(listRoles).mockResolvedValue(roles);

    const { result } = renderHook(() => usePermissions("acme"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasAnyPermission(["courses:read", "admin:delete"])).toBe(true);
    expect(result.current.hasAllPermissions(["courses:read", "admin:delete"])).toBe(false);
    expect(result.current.allowedPermissions.has("courses:read")).toBe(true);
  });
});

describe("usePermission backward compatibility", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns allowed === true for granted permissions", async () => {
    vi.mocked(useAuthStore).mockReturnValue(tenant);
    vi.mocked(listPermissions).mockResolvedValue(catalog);
    vi.mocked(listRoles).mockResolvedValue(roles);

    const { result } = renderHook(() => usePermission("acme", "courses:read"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allowed).toBe(true);
  });
});
