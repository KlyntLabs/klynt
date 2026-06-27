import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { generateIdempotencyKey } from "./api-client";
import { useApiMutation, useApiQuery, useIdempotentMutation } from "./api-module";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("generateIdempotencyKey", () => {
  it("returns unique UUID-like strings", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const key = generateIdempotencyKey();
      expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
    expect(keys.size).toBe(10);
  });
});

describe("useApiQuery", () => {
  it("returns query result and accepts options", async () => {
    const queryFn = vi.fn().mockResolvedValue("hello");

    const { result } = renderHook(() => useApiQuery(["test"], queryFn, { enabled: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe("hello");
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});

describe("useApiMutation", () => {
  it("returns mutation helpers and accepts options", async () => {
    const mutationFn = vi.fn().mockResolvedValue("done");
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useApiMutation(mutationFn, { onSuccess }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync("input");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe("done");
    expect(mutationFn).toHaveBeenCalledWith("input", expect.any(Object));
    expect(onSuccess).toHaveBeenCalledWith("done", "input", undefined, expect.any(Object));
  });
});

describe("useIdempotentMutation", () => {
  it("passes a generated idempotency key to the mutation function", async () => {
    const mutationFn = vi.fn().mockResolvedValue("ok");

    const { result } = renderHook(() => useIdempotentMutation(mutationFn), {
      wrapper: createWrapper(),
    });

    const input = { amount: 100 };

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mutationFn).toHaveBeenCalledTimes(1);

    const [calledVariables, calledKey] = mutationFn.mock.calls[0];
    expect(calledVariables).toEqual(input);
    expect(calledKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("passes through additional options", async () => {
    const mutationFn = vi.fn().mockResolvedValue("ok");
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useIdempotentMutation(mutationFn, { onSuccess }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ value: 1 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccess).toHaveBeenCalledWith("ok", expect.any(Object), undefined, expect.any(Object));
  });
});
