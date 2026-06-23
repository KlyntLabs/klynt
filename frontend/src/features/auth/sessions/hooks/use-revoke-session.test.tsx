import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw/server";
import { useRevokeSession } from "./use-revoke-session";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
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

    const { result } = renderHook(() => useRevokeSession(), { wrapper: createWrapper() });

    result.current.mutate("s-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(called).toBe(true);
  });
});
