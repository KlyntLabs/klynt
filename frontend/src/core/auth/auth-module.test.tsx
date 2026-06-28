import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "./auth-store";
import type { User } from "./types";

const mockUser: User = {
  id: "u-1",
  email: "a@b.com",
  username: "a",
  name: "A",
  role: "student",
  status: "active",
  createdAt: "2024-01-01T00:00:00Z",
};

const mockGetMe = vi.fn<() => Promise<User>>();

vi.mock("./api/auth-api", () => ({
  getMe: () => mockGetMe(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("auth module", () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
    useAuthStore.getState().setLoading(true);
    mockGetMe.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("hydrates successfully: loading becomes false, authenticated true, user truthy", async () => {
    mockGetMe.mockResolvedValue(mockUser);

    const { useAuthModule } = await import("./auth-module");
    const { result } = renderHook(() => useAuthModule(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it("401 / error path: unauthenticated, user null", async () => {
    mockGetMe.mockRejectedValue(new Error("Unauthorized"));

    const { useAuthModule } = await import("./auth-module");
    const { result } = renderHook(() => useAuthModule(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
