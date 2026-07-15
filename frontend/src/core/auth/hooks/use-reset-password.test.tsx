import { LayerProvider } from "@astryxdesign/core/Layer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import i18n from "@/core/i18n/test-config";
import { server } from "@/test/msw/server";
import { useResetPassword } from "./use-reset-password";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nextProvider i18n={i18n}>
        <LayerProvider>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        </LayerProvider>
      </I18nextProvider>
    );
  };
}

describe("useResetPassword", () => {
  // Astryx has no `success` type — a confirmation renders as an `info` toast, whose live region
  // is `role="status"`. The message is unchanged; only the colour is (it is no longer green).
  it("shows success toast after reset", async () => {
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
    const body = await screen.findByText("Password reset successfully. Please log in.");
    expect(body.closest('[role="status"]')).not.toBeNull();
  });
});
