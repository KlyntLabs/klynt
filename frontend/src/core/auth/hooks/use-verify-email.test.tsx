import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useToastStore } from "@/core/notifications/toast-store";
import { server } from "@/test/msw/server";
import { useVerifyEmail } from "./use-verify-email";

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

describe("useVerifyEmail", () => {
  it("shows success toast on verification", async () => {
    useToastStore.getState().reset();
    server.use(
      http.post("/api/v1/auth/verify-email", () =>
        HttpResponse.json({ message: "Email verified successfully" })
      )
    );

    const { result } = renderHook(() => useVerifyEmail(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ token: "token-123" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useToastStore.getState().toasts[0].type).toBe("success");
  });
});
