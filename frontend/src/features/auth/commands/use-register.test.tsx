import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { type ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useRegister } from "./use-register";

const validInput = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "str0ng!passphrase",
  role: "student" as const,
  termsAccepted: true,
  termsVersion: "2026-06-18",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: 1 },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

function successResponse() {
  return HttpResponse.json(
    {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Ada Lovelace",
      email: "ada@example.com",
      role: "student",
      status: "pending_verification",
      created_at: "2026-06-18T04:24:34Z",
    },
    { status: 201 }
  );
}

describe("useRegister", () => {
  it("reuses the idempotency key on TanStack Query retry", async () => {
    const keys: string[] = [];

    server.use(
      http.post("/api/v1/users", async ({ request }) => {
        keys.push(request.headers.get("Idempotency-Key") ?? "");
        if (keys.length === 1) {
          return new HttpResponse(null, { status: 500 });
        }
        return successResponse();
      })
    );

    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isIdle).toBe(true));

    await result.current.mutateAsync(validInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(keys.length).toBe(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it("generates a new idempotency key for each user intent", async () => {
    const keys: string[] = [];

    server.use(
      http.post("/api/v1/users", async ({ request }) => {
        keys.push(request.headers.get("Idempotency-Key") ?? "");
        return successResponse();
      })
    );

    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isIdle).toBe(true));

    await result.current.mutateAsync(validInput);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await result.current.mutateAsync({ ...validInput, email: "grace@example.com" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(keys.length).toBe(2);
    expect(keys[0]).not.toBe(keys[1]);
  });
});
