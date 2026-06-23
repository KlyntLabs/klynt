import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useToastStore } from "@/core/notifications/toast-store";
import { server } from "@/test/msw/server";
import { useRegister } from "./use-register";

const validInput = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "Str0ng!pass",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("useRegister", () => {
  it("navigates to success page on successful registration", async () => {
    server.use(
      http.post("/api/v1/auth/register", () =>
        HttpResponse.json({ data: "550e8400-e29b-41d4-a716-446655440000" }, { status: 201 })
      )
    );

    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(validInput);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("shows a toast when registration fails", async () => {
    useToastStore.getState().reset();

    server.use(
      http.post("/api/v1/auth/register", () =>
        HttpResponse.json({ error: { code: "conflict", message: "email exists" } }, { status: 409 })
      )
    );

    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync(validInput);
      })
    ).rejects.toBeDefined();
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].type).toBe("error");
  });
});
