import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import { usePermission } from "./use-permission";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const baseTenant = {
  id: "t-1",
  slug: "acme",
  name: "Acme",
  joinedAt: "2026-06-22T00:00:00Z",
};

describe("usePermission", () => {
  it("grants permissions matching the active tenant role", async () => {
    useAuthStore.getState().setActiveTenant({ ...baseTenant, role: "owner" });

    const { result } = renderHook(() => usePermission("acme", "tenant.manage_members"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allowed).toBe(true);
  });

  it("denies permissions not granted by the active tenant role", async () => {
    useAuthStore.getState().setActiveTenant({ ...baseTenant, role: "member" });

    const { result } = renderHook(() => usePermission("acme", "tenant.manage_members"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allowed).toBe(false);
  });
});
