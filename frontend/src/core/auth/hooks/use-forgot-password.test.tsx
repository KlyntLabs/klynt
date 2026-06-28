import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useToastStore } from "@/core/notifications/toast-store";
import { server } from "@/test/msw/server";
import { useForgotPassword } from "./use-forgot-password";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useForgotPassword", () => {
  it("shows success toast after request", async () => {
    useToastStore.getState().reset();
    server.use(
      http.post("/api/v1/auth/request-password-reset", () =>
        HttpResponse.json({ message: "If the email exists, a reset link has been sent" })
      )
    );

    const { result } = renderHook(() => useForgotPassword(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ email: "a@b.com" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useToastStore.getState().toasts[0].type).toBe("success");
  });
});
