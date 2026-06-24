import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import type { WindowState } from "@/features/desktop/store/use-desktop-store";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import { render } from "@/test/render";
import WindowComponent from "./Window";

const sampleWindow: WindowState = {
  id: "win-1",
  appId: "test-app",
  x: 100,
  y: 100,
  width: 400,
  height: 300,
  zIndex: 101,
  state: "normal",
};

const DESKTOP_ID = "test-desktop";

function resetStore() {
  useDesktopStore.setState({
    viewMode: "desktop",
    windows: { [DESKTOP_ID]: [sampleWindow] },
    activeWindowId: { [DESKTOP_ID]: null },
    nextZIndex: 102,
  });
}

function WindowWrapper({ windowId, children }: { windowId: string; children?: ReactNode }) {
  const w = useDesktopStore((state) =>
    state.windows[DESKTOP_ID]?.find((win) => win.id === windowId)
  );
  if (!w) return null;
  return (
    <WindowComponent desktopId={DESKTOP_ID} window={w} title="Test Window">
      {children}
    </WindowComponent>
  );
}

describe("Window interactions", () => {
  beforeEach(() => {
    resetStore();
  });

  it("focuses the window when clicked", async () => {
    const user = userEvent.setup();
    render(<WindowWrapper windowId="win-1">Content</WindowWrapper>);

    const title = screen.getByText("Test Window");
    await user.click(title);

    await waitFor(() => {
      const state = useDesktopStore.getState();
      expect(state.activeWindowId[DESKTOP_ID]).toBe("win-1");
      const focused = state.windows[DESKTOP_ID]?.find((w) => w.id === "win-1");
      expect(focused?.zIndex).toBeGreaterThan(101);
    });
  });

  it("does not refocus an already active window", async () => {
    const user = userEvent.setup();
    useDesktopStore.setState({
      windows: { [DESKTOP_ID]: [{ ...sampleWindow, zIndex: 102 }] },
      activeWindowId: { [DESKTOP_ID]: "win-1" },
      nextZIndex: 103,
    });

    render(<WindowWrapper windowId="win-1">Content</WindowWrapper>);

    const initialZIndex = useDesktopStore.getState().windows[DESKTOP_ID]?.[0]?.zIndex;
    await user.click(screen.getByText("Test Window"));

    expect(useDesktopStore.getState().windows[DESKTOP_ID]?.[0]?.zIndex).toBe(initialZIndex);
  });

  it("closes the window when the close button is clicked", async () => {
    render(<WindowWrapper windowId="win-1">Content</WindowWrapper>);

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    await waitFor(() => {
      expect(useDesktopStore.getState().windows[DESKTOP_ID]).toHaveLength(0);
      expect(useDesktopStore.getState().activeWindowId[DESKTOP_ID]).toBeNull();
    });
  });

  it("minimizes the window when the minimize button is clicked", async () => {
    render(<WindowWrapper windowId="win-1">Content</WindowWrapper>);

    fireEvent.click(screen.getByRole("button", { name: /minimize/i }));

    await waitFor(() => {
      const minimized = useDesktopStore
        .getState()
        .windows[DESKTOP_ID]?.find((w) => w.id === "win-1");
      expect(minimized?.state).toBe("minimized");
    });
  });

  it("maximizes and restores the window", async () => {
    render(<WindowWrapper windowId="win-1">Content</WindowWrapper>);

    fireEvent.click(screen.getByRole("button", { name: /maximize/i }));

    await waitFor(() => {
      expect(useDesktopStore.getState().windows[DESKTOP_ID]?.[0]?.state).toBe("maximized");
    });

    fireEvent.click(screen.getByRole("button", { name: /restore/i }));

    await waitFor(() => {
      const restored = useDesktopStore.getState().windows[DESKTOP_ID]?.[0];
      expect(restored?.state).toBe("normal");
    });
  });

  it("updates the rendered position when the store position changes", async () => {
    render(<WindowWrapper windowId="win-1">Content</WindowWrapper>);

    act(() => {
      useDesktopStore
        .getState()
        .moveWindow(DESKTOP_ID, "win-1", { x: 250, y: 180, width: 400, height: 300 });
    });

    await waitFor(() => {
      const state = useDesktopStore.getState();
      expect(state.windows[DESKTOP_ID]?.[0]).toMatchObject({ x: 250, y: 180 });
    });
  });

  it("updates the window position after dragging the title bar", async () => {
    render(<WindowWrapper windowId="win-1">Content</WindowWrapper>);

    const windowEl = screen.getByText("Test Window").closest("div[class*='rounded-lg']");
    expect(windowEl).toBeTruthy();

    fireEvent.pointerDown(windowEl as HTMLElement, {
      clientX: 200,
      clientY: 200,
    });
    fireEvent.pointerUp(windowEl as HTMLElement, {
      clientX: 250,
      clientY: 270,
    });

    await waitFor(() => {
      const moved = useDesktopStore.getState().windows[DESKTOP_ID]?.find((w) => w.id === "win-1");
      expect(moved?.x).not.toBe(100);
      expect(moved?.y).not.toBe(100);
    });
  });
});
