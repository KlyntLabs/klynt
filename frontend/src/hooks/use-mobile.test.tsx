import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "./use-mobile";

describe("useIsMobile", () => {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  beforeEach(() => {
    listeners.clear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
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

  it("returns the mobile state", () => {
    const { result } = renderHook(() => useIsMobile());
    expect(typeof result.current).toBe("boolean");
  });

  it("updates when the media query changes", () => {
    Object.defineProperty(window, "innerWidth", { value: 1024, writable: true });
    const { result } = renderHook(() => useIsMobile());

    act(() => {
      Object.defineProperty(window, "innerWidth", { value: 375 });
      listeners.forEach((handler) => {
        handler(new Event("change") as MediaQueryListEvent);
      });
    });

    expect(result.current).toBe(true);
  });
});
