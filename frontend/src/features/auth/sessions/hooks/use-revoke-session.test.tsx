import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/core/i18n/test-config";
import { useToastStore } from "@/core/notifications/toast-store";
import { server } from "@/test/msw/server";
import { useRevokeSession } from "./use-revoke-session";

function createTestSetup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </I18nextProvider>
    );
  }

  return { queryClient, Wrapper };
}

beforeEach(() => {
  useToastStore.getState().reset();
});

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

    const addToastSpy = vi.spyOn(useToastStore.getState(), "addToast");
    const { Wrapper } = createTestSetup();
    const { result } = renderHook(() => useRevokeSession(), { wrapper: Wrapper });

    result.current.mutate("s-3");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(addToastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        duration: 5000,
      })
    );
    expect(addToastSpy.mock.calls[0][0].message).toMatch(/Failed to revoke session:/);
  });
});
