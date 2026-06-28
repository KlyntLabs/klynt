import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw/server";
import { useSessions } from "./use-sessions";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const rawSessions = [
  {
    id: "s-1",
    user_id: "u-1",
    kind: "access",
    created_at: "2026-06-20T08:00:00Z",
    expires_at: "2026-06-20T09:00:00Z",
  },
];

describe("useSessions", () => {
  it("returns camelized sessions", async () => {
    server.use(
      http.get("/api/v1/auth/sessions", () =>
        HttpResponse.json({ data: { sessions: rawSessions } })
      )
    );

    const { result } = renderHook(() => useSessions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      {
        id: "s-1",
        userId: "u-1",
        createdAt: "2026-06-20T08:00:00Z",
        expiresAt: "2026-06-20T09:00:00Z",
        kind: "access",
      },
    ]);
  });
});
