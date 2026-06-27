import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useActiveWindowId, useDesktopWindows, useWindowManager } from "./window-module";

describe("useWindowManager", () => {
  beforeEach(() => {
    act(() => {
      useWindowManager.getState().reset();
    });
  });

  afterEach(() => {
    act(() => {
      useWindowManager.getState().reset();
    });
  });

  it("opens a window scoped by desktopId", () => {
    const { result } = renderHook(() => useWindowManager());

    act(() => {
      result.current.openApp("desktop-1", "app-pricing");
    });

    expect(result.current.windows["desktop-1"]).toHaveLength(1);
    expect(result.current.windows["desktop-1"]?.[0]?.appId).toBe("app-pricing");
    expect(result.current.activeWindowId["desktop-1"]).toBe(
      result.current.windows["desktop-1"]?.[0]?.id
    );
  });

  it("raises the z-index of a window when it is focused", () => {
    const { result } = renderHook(() => useWindowManager());

    act(() => {
      result.current.openApp("desktop-1", "app-pricing");
      result.current.openApp("desktop-1", "app-docs");
    });

    const firstId = result.current.windows["desktop-1"]?.[0]?.id;
    const secondId = result.current.windows["desktop-1"]?.[1]?.id;

    act(() => {
      if (firstId) {
        result.current.focusWindow("desktop-1", firstId);
      }
    });

    const focused = result.current.windows["desktop-1"]?.find((w) => w.id === firstId);
    const other = result.current.windows["desktop-1"]?.find((w) => w.id === secondId);

    expect(focused?.zIndex).toBeGreaterThan(other?.zIndex ?? 0);
    expect(result.current.activeWindowId["desktop-1"]).toBe(firstId);
  });

  it("minimizes and restores a window", () => {
    const { result } = renderHook(() => useWindowManager());

    act(() => {
      result.current.openApp("desktop-1", "app-pricing");
    });

    const windowId = result.current.windows["desktop-1"]?.[0]?.id;

    act(() => {
      if (windowId) {
        result.current.minimizeWindow("desktop-1", windowId);
      }
    });

    expect(result.current.windows["desktop-1"]?.find((w) => w.id === windowId)?.state).toBe(
      "minimized"
    );

    act(() => {
      if (windowId) {
        result.current.restoreWindow("desktop-1", windowId);
      }
    });

    expect(result.current.windows["desktop-1"]?.find((w) => w.id === windowId)?.state).toBe(
      "normal"
    );
  });

  it("closes a window and makes the top remaining window active", () => {
    const { result } = renderHook(() => useWindowManager());

    act(() => {
      result.current.openApp("desktop-1", "app-pricing");
      result.current.openApp("desktop-1", "app-docs");
    });

    const activeId = result.current.activeWindowId["desktop-1"];
    const remainingId = result.current.windows["desktop-1"]?.find((w) => w.id !== activeId)?.id;

    act(() => {
      if (activeId) {
        result.current.closeWindow("desktop-1", activeId);
      }
    });

    expect(result.current.windows["desktop-1"]).toHaveLength(1);
    expect(result.current.activeWindowId["desktop-1"]).toBe(remainingId);
  });

  it("updates window geometry with moveWindow and ignores maximized windows", () => {
    const { result } = renderHook(() => useWindowManager());

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
        result.current.moveWindow("desktop-1", windowId, {
          x: 10,
          y: 20,
          width: 200,
          height: 150,
        });
      }
    });

    const moved = result.current.windows["desktop-1"]?.find((w) => w.id === windowId);
    expect(moved?.x).toBe(10);
    expect(moved?.y).toBe(20);
    expect(moved?.width).toBe(200);
    expect(moved?.height).toBe(150);

    act(() => {
      if (windowId) {
        result.current.maximizeWindow("desktop-1", windowId);
      }
    });

    const maximized = result.current.windows["desktop-1"]?.find((w) => w.id === windowId);
    expect(maximized?.state).toBe("maximized");
    expect(maximized?.x).toBe(0);
    expect(maximized?.y).toBe(36);
    expect(maximized?.width).toBe(window.innerWidth);
    expect(maximized?.height).toBe(window.innerHeight - 36);

    act(() => {
      if (windowId) {
        result.current.moveWindow("desktop-1", windowId, {
          x: 999,
          y: 888,
          width: 111,
          height: 222,
        });
      }
    });

    const stillMaximized = result.current.windows["desktop-1"]?.find((w) => w.id === windowId);
    expect(stillMaximized?.x).toBe(0);
    expect(stillMaximized?.y).toBe(36);
    expect(stillMaximized?.width).toBe(window.innerWidth);
    expect(stillMaximized?.height).toBe(window.innerHeight - 36);
  });

  it("compacts z-indexes when the threshold is exceeded", () => {
    const { result } = renderHook(() => useWindowManager());

    act(() => {
      result.current.openApp("desktop-1", "app-pricing");
      result.current.openApp("desktop-1", "app-docs");
    });

    act(() => {
      useWindowManager.setState({ nextZIndex: 10000 });
    });

    act(() => {
      result.current.openApp("desktop-1", "app-about");
    });

    const windows = result.current.windows["desktop-1"] ?? [];
    expect(result.current.nextZIndex).toBe(104);
    expect(windows.map((w) => w.zIndex).sort((a, b) => a - b)).toEqual([100, 101, 102]);
  });

  it("resets state", () => {
    const { result } = renderHook(() => useWindowManager());

    act(() => {
      result.current.openApp("desktop-1", "app-pricing");
      result.current.focusWindow("desktop-1", "unknown");
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.windows).toEqual({});
    expect(result.current.activeWindowId).toEqual({});
  });

  it("selectors return desktop-scoped state", () => {
    const { result } = renderHook(() => useWindowManager());

    act(() => {
      result.current.openApp("desktop-1", "app-pricing");
    });

    const { result: windowsResult } = renderHook(() => useDesktopWindows("desktop-1"));
    const { result: activeResult } = renderHook(() => useActiveWindowId("desktop-1"));

    expect(windowsResult.current).toHaveLength(1);
    expect(windowsResult.current?.[0]?.appId).toBe("app-pricing");
    expect(activeResult.current).toBe(windowsResult.current?.[0]?.id);
  });
});
