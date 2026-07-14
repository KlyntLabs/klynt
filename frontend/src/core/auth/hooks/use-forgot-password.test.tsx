import { LayerProvider } from "@astryxdesign/core/Layer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import i18n from "@/core/i18n/test-config";
import { server } from "@/test/msw/server";
import { useForgotPassword } from "./use-forgot-password";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nextProvider i18n={i18n}>
        <LayerProvider>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </LayerProvider>
      </I18nextProvider>
    );
  };
}

describe("useForgotPassword", () => {
  // Astryx has no `success` type — the confirmation renders as an `info` toast (`role="status"`).
  it("shows success toast after request", async () => {
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
    const body = await screen.findByText("If an account exists, a reset link has been sent.");
    expect(body.closest('[role="status"]')).not.toBeNull();
  });
});
