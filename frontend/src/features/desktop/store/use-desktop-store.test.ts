import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDesktopStore } from "./use-desktop-store";

function createStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
}

describe("useDesktopStore", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorage(),
      writable: true,
    });
    useDesktopStore.setState({
      viewMode: "desktop",
      windows: [],
      activeWindowId: null,
      cookieDismissed: false,
      nextZIndex: 100,
    });
  });

  afterEach(() => {
    globalThis.localStorage.clear();
  });

  it("opens a window and marks it active", () => {
    const { result } = renderHook(() => useDesktopStore());

    act(() => {
      result.current.openWindow("/pricing", "Pricing");
    });

    expect(result.current.windows).toHaveLength(1);
    expect(result.current.windows[0]?.title).toBe("Pricing");
    expect(result.current.windows[0]?.isActive).toBe(true);
    expect(result.current.activeWindowId).toBe(result.current.windows[0]?.id);
  });

  it("focuses an existing window instead of opening a duplicate", () => {
    const { result } = renderHook(() => useDesktopStore());

    act(() => {
      result.current.openWindow("/pricing", "Pricing");
    });

    const firstId = result.current.windows[0]?.id;

    act(() => {
      result.current.openWindow("/docs", "Docs");
    });

    act(() => {
      result.current.openWindow("/pricing", "Pricing");
    });

    expect(result.current.windows).toHaveLength(2);
    expect(result.current.activeWindowId).toBe(firstId);
  });

  it("closes a window and activates the previous one", () => {
    const { result } = renderHook(() => useDesktopStore());

    act(() => {
      result.current.openWindow("/pricing", "Pricing");
    });

    act(() => {
      result.current.openWindow("/docs", "Docs");
    });

    const firstId = result.current.windows[0]?.id;
    const secondId = result.current.windows[1]?.id;

    act(() => {
      result.current.closeWindow(secondId ?? "");
    });

    expect(result.current.windows).toHaveLength(1);
    expect(result.current.activeWindowId).toBe(firstId);
    expect(result.current.windows[0]?.isActive).toBe(true);
  });

  it("focuses a window and bumps its z-index", () => {
    const { result } = renderHook(() => useDesktopStore());

    act(() => {
      result.current.openWindow("/pricing", "Pricing");
    });

    act(() => {
      result.current.openWindow("/docs", "Docs");
    });

    const firstId = result.current.windows[0]?.id;
    const initialZIndex = result.current.windows[0]?.zIndex ?? 0;

    act(() => {
      result.current.focusWindow(firstId ?? "");
    });

    const focused = result.current.windows.find((w) => w.id === firstId);
    expect(focused?.isActive).toBe(true);
    expect(focused?.zIndex).toBeGreaterThan(initialZIndex);
  });

  it("minimizes and restores a window", () => {
    const { result } = renderHook(() => useDesktopStore());

    act(() => {
      result.current.openWindow("/pricing", "Pricing");
    });

    const id = result.current.windows[0]?.id ?? "";

    act(() => {
      result.current.minimizeWindow(id);
    });

    expect(result.current.windows[0]?.isMinimized).toBe(true);
    expect(result.current.windows[0]?.isActive).toBe(false);

    act(() => {
      result.current.restoreWindow(id);
    });

    expect(result.current.windows[0]?.isMinimized).toBe(false);
    expect(result.current.windows[0]?.isMaximized).toBe(false);
  });

  it("maximizes a window", () => {
    const { result } = renderHook(() => useDesktopStore());

    act(() => {
      result.current.openWindow("/pricing", "Pricing");
    });

    const id = result.current.windows[0]?.id ?? "";

    act(() => {
      result.current.maximizeWindow(id);
    });

    expect(result.current.windows[0]?.isMaximized).toBe(true);
  });

  it("updates window position and size", () => {
    const { result } = renderHook(() => useDesktopStore());

    act(() => {
      result.current.openWindow("/pricing", "Pricing");
    });

    const id = result.current.windows[0]?.id ?? "";

    act(() => {
      result.current.setWindowPosition(id, { x: 10, y: 20 });
    });

    expect(result.current.windows[0]?.position).toEqual({ x: 10, y: 20 });

    act(() => {
      result.current.setWindowSize(id, { width: 100, height: 200 });
    });

    expect(result.current.windows[0]?.size).toEqual({ width: 100, height: 200 });
  });

  it("switches view mode", () => {
    const { result } = renderHook(() => useDesktopStore());

    act(() => {
      result.current.setViewMode("website");
    });

    expect(result.current.viewMode).toBe("website");
  });

  it("dismisses the cookie banner and persists to localStorage", () => {
    const { result } = renderHook(() => useDesktopStore());

    act(() => {
      result.current.dismissCookie();
    });

    expect(result.current.cookieDismissed).toBe(true);
    expect(localStorage.getItem("cookie-dismissed")).toBe("true");
  });
});
