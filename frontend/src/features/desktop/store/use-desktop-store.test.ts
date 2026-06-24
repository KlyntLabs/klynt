import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useDesktopStore } from "./use-desktop-store";

describe("useDesktopStore", () => {
  beforeEach(() => {
    act(() => {
      useDesktopStore.getState().reset();
    });
  });

  afterEach(() => {
    act(() => {
      useDesktopStore.getState().reset();
    });
  });

  it("opens a window scoped by desktopId", () => {
    const { result } = renderHook(() => useDesktopStore());

    act(() => {
      result.current.openApp("desktop-1", "app-pricing");
    });

    expect(result.current.windows["desktop-1"]).toHaveLength(1);
    expect(result.current.windows["desktop-1"]?.[0]?.appId).toBe("app-pricing");
    expect(result.current.activeWindowId["desktop-1"]).toBe(
      result.current.windows["desktop-1"]?.[0]?.id
    );
  });

  it("closes a window", () => {
    const { result } = renderHook(() => useDesktopStore());

    act(() => {
      result.current.openApp("desktop-1", "app-pricing");
    });

    const windowId = result.current.windows["desktop-1"]?.[0]?.id;

    act(() => {
      if (windowId) {
        result.current.closeWindow("desktop-1", windowId);
      }
    });

    expect(result.current.windows["desktop-1"]).toHaveLength(0);
    expect(result.current.activeWindowId["desktop-1"]).toBeNull();
  });

  it("focuses an existing window instead of duplicating", () => {
    const { result } = renderHook(() => useDesktopStore());

    act(() => {
      result.current.openApp("desktop-1", "app-pricing");
    });

    const firstId = result.current.windows["desktop-1"]?.[0]?.id;

    act(() => {
      result.current.openApp("desktop-1", "app-docs");
    });

    act(() => {
      result.current.openApp("desktop-1", "app-pricing");
    });

    expect(result.current.windows["desktop-1"]).toHaveLength(2);
    expect(result.current.activeWindowId["desktop-1"]).toBe(firstId);
    expect(result.current.windows["desktop-1"]?.find((w) => w.id === firstId)?.state).toBe(
      "normal"
    );
  });

  it("does not move a maximized window", () => {
    const { result } = renderHook(() => useDesktopStore());

    act(() => {
      result.current.openApp("desktop-1", "app-pricing", {
        x: 100,
        y: 100,
        width: 400,
        height: 300,
      });
    });

    const windowId = result.current.windows["desktop-1"]?.[0]?.id;

    act(() => {
      if (windowId) {
        result.current.maximizeWindow("desktop-1", windowId);
      }
    });

    act(() => {
      if (windowId) {
        result.current.moveWindow("desktop-1", windowId, { x: 10, y: 20, width: 200, height: 150 });
      }
    });

    const moved = result.current.windows["desktop-1"]?.find((w) => w.id === windowId);
    expect(moved?.x).toBe(100);
    expect(moved?.y).toBe(100);
    expect(moved?.width).toBe(400);
    expect(moved?.height).toBe(300);
  });

  it("resets state", () => {
    const { result } = renderHook(() => useDesktopStore());

    act(() => {
      result.current.setActiveDesktop("desktop-1");
      result.current.openApp("desktop-1", "app-pricing");
      result.current.setViewMode("website");
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.activeDesktopId).toBeNull();
    expect(result.current.windows).toEqual({});
    expect(result.current.activeWindowId).toEqual({});
    expect(result.current.viewMode).toBe("desktop");
  });

  it("compacts z-indexes when threshold is exceeded on openApp", () => {
    const { result } = renderHook(() => useDesktopStore());

    act(() => {
      result.current.openApp("desktop-1", "app-pricing");
      result.current.openApp("desktop-1", "app-docs");
    });

    act(() => {
      useDesktopStore.setState({ nextZIndex: 10000 });
    });

    act(() => {
      result.current.openApp("desktop-1", "app-about");
    });

    const windows = result.current.windows["desktop-1"] ?? [];
    expect(result.current.nextZIndex).toBe(104);
    expect(windows.map((w) => w.zIndex).sort((a, b) => a - b)).toEqual([100, 101, 102]);
  });

  it("compacts z-indexes when threshold is exceeded on focusWindow", () => {
    const { result } = renderHook(() => useDesktopStore());

    act(() => {
      result.current.openApp("desktop-1", "app-pricing");
      result.current.openApp("desktop-1", "app-docs");
    });

    const firstId = result.current.windows["desktop-1"]?.[0]?.id;

    act(() => {
      useDesktopStore.setState({ nextZIndex: 10000 });
    });

    act(() => {
      if (firstId) {
        result.current.focusWindow("desktop-1", firstId);
      }
    });

    const focused = result.current.windows["desktop-1"]?.find((w) => w.id === firstId);
    expect(result.current.nextZIndex).toBe(103);
    expect(focused?.zIndex).toBe(101);
  });

  it("compacts z-indexes when threshold is exceeded on closeWindow", () => {
    const { result } = renderHook(() => useDesktopStore());

    act(() => {
      result.current.openApp("desktop-1", "app-pricing");
      result.current.openApp("desktop-1", "app-docs");
      result.current.openApp("desktop-1", "app-about");
    });

    const activeId = result.current.activeWindowId["desktop-1"];

    act(() => {
      useDesktopStore.setState({ nextZIndex: 10000 });
    });

    act(() => {
      if (activeId) {
        result.current.closeWindow("desktop-1", activeId);
      }
    });

    const remaining = result.current.windows["desktop-1"] ?? [];
    expect(remaining).toHaveLength(2);
    expect(result.current.nextZIndex).toBe(103);
    expect(remaining.map((w) => w.zIndex).sort((a, b) => a - b)).toEqual([100, 101]);
  });
});
