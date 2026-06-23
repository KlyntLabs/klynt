import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import { server } from "@/test/msw/server";
import { useMe } from "./use-me";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const mockUser = {
  id: "u-1",
  email: "a@b.com",
  full_name: "A",
  role: "student" as const,
  status: "active" as const,
  created_at: "2024-01-01T00:00:00Z",
};

describe("useMe", () => {
  it("sets session on success", async () => {
    useAuthStore.getState().reset();
    useAuthStore.getState().setLoading(true);
    server.use(http.get("/api/v1/users/me", () => HttpResponse.json({ data: mockUser })));

    renderHook(() => useMe(), { wrapper: createWrapper() });

    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
    expect(useAuthStore.getState().user?.email).toBe("a@b.com");
  });

  it("clears session on 401", async () => {
    useAuthStore.getState().reset();
    useAuthStore.getState().setLoading(true);
    server.use(http.get("/api/v1/users/me", () => new HttpResponse(null, { status: 401 })));

    renderHook(() => useMe(), { wrapper: createWrapper() });

    await waitFor(() => expect(useAuthStore.getState().isLoading).toBe(false));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
