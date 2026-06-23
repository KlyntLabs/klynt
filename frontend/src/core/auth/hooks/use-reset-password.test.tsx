import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useToastStore } from "@/core/notifications/toast-store";
import { server } from "@/test/msw/server";
import { useResetPassword } from "./use-reset-password";

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

describe("useResetPassword", () => {
  it("shows success toast after reset", async () => {
    useToastStore.getState().reset();
    server.use(
      http.post("/api/v1/auth/reset-password", () =>
        HttpResponse.json({ message: "Password reset successfully" })
      )
    );

    const { result } = renderHook(() => useResetPassword(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ token: "token-123", password: "NewPass1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useToastStore.getState().toasts[0].type).toBe("success");
  });
});
