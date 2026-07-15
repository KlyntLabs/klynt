import { LayerProvider } from "@astryxdesign/core/Layer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import i18n from "@/core/i18n/config";
import { server } from "@/test/msw/server";
import { useVerifyEmail } from "./use-verify-email";

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

describe("useVerifyEmail", () => {
  // Astryx has no `success` type — the confirmation renders as an `info` toast (`role="status"`).
  it("shows success toast on verification", async () => {
    server.use(
      http.post("/api/v1/auth/verify-email", () =>
        HttpResponse.json({ message: "Email verified successfully" })
      ),
      http.get("/api/v1/users/me", () =>
        HttpResponse.json({
          data: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            email: "ada@example.com",
            fullName: "Ada Lovelace",
            role: "student",
            isEmailVerified: true,
          },
        })
      )
    );

    const { result } = renderHook(() => useVerifyEmail(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ token: "token-123" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const body = await screen.findByText(
      "Email verified successfully. Let's set up your workspace."
    );
    expect(body.closest('[role="status"]')).not.toBeNull();
  });
});
