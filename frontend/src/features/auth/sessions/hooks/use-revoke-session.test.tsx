import { LayerProvider } from "@astryxdesign/core/Layer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import i18n from "@/core/i18n/test-config";
import { server } from "@/test/msw/server";
import { useRevokeSession } from "./use-revoke-session";

function createTestSetup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nextProvider i18n={i18n}>
        <LayerProvider>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </LayerProvider>
      </I18nextProvider>
    );
  }

  return { queryClient, Wrapper };
}

describe("useRevokeSession", () => {
  it("revokes a session", async () => {
    let called = false;
    server.use(
      http.delete("/api/v1/auth/sessions/s-1", () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const { Wrapper } = createTestSetup();
    const { result } = renderHook(() => useRevokeSession(), { wrapper: Wrapper });

    result.current.mutate("s-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(called).toBe(true);
  });

  it("invalidates the sessions query on success", async () => {
    server.use(
      http.delete("/api/v1/auth/sessions/s-2", () => new HttpResponse(null, { status: 204 }))
    );

    const { queryClient, Wrapper } = createTestSetup();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useRevokeSession(), { wrapper: Wrapper });

    result.current.mutate("s-2");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["auth", "sessions"] });
  });

  it("shows a toast on error", async () => {
    server.use(
      http.delete("/api/v1/auth/sessions/s-3", () =>
        HttpResponse.json({ code: "bad_request", message: "bad request" }, { status: 400 })
      )
    );

    const { Wrapper } = createTestSetup();
    const { result } = renderHook(() => useRevokeSession(), { wrapper: Wrapper });

    result.current.mutate("s-3");

    await waitFor(() => expect(result.current.isError).toBe(true));

    // The toast is now read off the screen, not off a store: `role="alert"` is Astryx's live
    // region for an error toast, and the interpolated i18n message is unchanged.
    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent(/Failed to revoke session:/);
  });
});
