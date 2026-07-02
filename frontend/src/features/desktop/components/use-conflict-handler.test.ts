import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useConflictHandler } from "./use-conflict-handler";

describe("useConflictHandler", () => {
  it("starts closed", () => {
    const { result } = renderHook(() => useConflictHandler());
    expect(result.current.isOpen).toBe(false);
  });

  it("opens and closes", () => {
    const { result } = renderHook(() => useConflictHandler());

    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it("invokes the registered reload callback and closes", () => {
    const reload = vi.fn();
    const { result } = renderHook(() => useConflictHandler());

    act(() => result.current.setReloadCallback(reload));
    act(() => result.current.open());

    act(() => result.current.onReload());
    expect(reload).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
  });

  it("invokes the registered retry callback and closes", () => {
    const retry = vi.fn();
    const { result } = renderHook(() => useConflictHandler());

    act(() => result.current.setRetryCallback(retry));
    act(() => result.current.open());

    act(() => result.current.onRetry());
    expect(retry).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
  });
});
