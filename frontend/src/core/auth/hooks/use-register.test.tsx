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
import { useRegister } from "./use-register";

const validInput = {
  name: "Ada Lovelace",
  username: "ada_lovelace",
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

  // `LayerProvider` mounts Astryx's ToastViewport, which is what `useToast()` inside the hook
  // feeds; the toast is asserted on screen rather than in a store.
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
    server.use(
      http.post("/api/v1/auth/register", () =>
        HttpResponse.json(
          { success: false, code: "conflict", error: "email exists" },
          { status: 409 }
        )
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

    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent("email exists");
  });
});
