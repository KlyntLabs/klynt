import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import { useToastStore } from "@/core/notifications/toast-store";
import { server } from "@/test/msw/server";
import { navigateExternal } from "../external-redirect";
import { useLogin } from "./use-login";

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
        <MemoryRouter initialEntries={["/?from=/dashboard"]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
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

describe("useLogin", () => {
  it("sets session on success", async () => {
    useAuthStore.getState().reset();
    server.use(
      http.post("/api/v1/auth/login", () => HttpResponse.json({ data: { user: mockUser } }))
    );

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ email: "a@b.com", password: "pass" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(navigateExternal).toHaveBeenCalledWith("/dashboard");
  });

  it("shows a toast on error", async () => {
    useToastStore.getState().reset();
    server.use(
      http.post("/api/v1/auth/login", () =>
        HttpResponse.json(
          { success: false, code: "unauthorized", error: "Invalid credentials" },
          { status: 401 }
        )
      )
    );

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ email: "a@b.com", password: "pass" });
      })
    ).rejects.toBeDefined();
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].type).toBe("error");
  });
});
