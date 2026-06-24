import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "./use-media-query";

describe("useMediaQuery", () => {
  let matches = false;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  beforeEach(() => {
    matches = false;
    listeners.clear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches,
        addEventListener: vi.fn((_: string, handler: (event: MediaQueryListEvent) => void) => {
          listeners.add(handler);
        }),
        removeEventListener: vi.fn((_: string, handler: (event: MediaQueryListEvent) => void) => {
          listeners.delete(handler);
        }),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("returns current match state", () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)"));
    expect(result.current).toBe(false);
  });

  it("updates when the media query changes", () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)"));

    act(() => {
      listeners.forEach((handler) => {
        const event = new Event("change") as MediaQueryListEvent;
        Object.defineProperty(event, "matches", { value: true });
        handler(event);
      });
    });

    expect(result.current).toBe(true);
  });
});
