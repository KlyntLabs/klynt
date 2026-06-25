import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import { buildLoginUrl } from "@/core/routing/subdomain-url";
import { server } from "@/test/msw/server";
import { navigateExternal } from "../external-redirect";
import { useLogout } from "./use-logout";

vi.mock("../external-redirect", () => ({
  navigateExternal: vi.fn(),
  isExternalUrl: vi.fn(() => true),
  ExternalNavigate: ({ to }: { to: string }) => <div>{to}</div>,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("useLogout", () => {
  it("clears session on success", async () => {
    useAuthStore.getState().setSession({
      id: "u-1",
      email: "a@b.com",
      username: "a",
      name: "A",
      role: "student",
      status: "active",
      createdAt: "2024-01-01T00:00:00Z",
    });
    server.use(http.post("/api/v1/auth/logout", () => HttpResponse.json({ message: "ok" })));

    const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(navigateExternal).toHaveBeenCalledWith(buildLoginUrl());
  });

  it("clears session on error", async () => {
    useAuthStore.getState().setSession({
      id: "u-1",
      email: "a@b.com",
      username: "a",
      name: "A",
      role: "student",
      status: "active",
      createdAt: "2024-01-01T00:00:00Z",
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(http.post("/api/v1/auth/logout", () => HttpResponse.error()));

    const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });

    await act(async () => {
      try {
        await result.current.mutateAsync();
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(navigateExternal).toHaveBeenCalledWith(buildLoginUrl());
    consoleError.mockRestore();
  });
});
