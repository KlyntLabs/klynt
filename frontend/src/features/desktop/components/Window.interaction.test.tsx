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
  route: "/",
  title: "Test Window",
  position: { x: 100, y: 100 },
  size: { width: 400, height: 300 },
  zIndex: 101,
  isMinimized: false,
  isMaximized: false,
  isActive: false,
};

function resetStore() {
  useDesktopStore.setState({
    viewMode: "desktop",
    windows: [sampleWindow],
    activeWindowId: null,
    cookieDismissed: true,
    nextZIndex: 101,
  });
}

function WindowWrapper({ windowId, children }: { windowId: string; children?: ReactNode }) {
  const w = useDesktopStore((state) => state.windows.find((win) => win.id === windowId));
  if (!w) return null;
  return <WindowComponent window={w}>{children}</WindowComponent>;
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
      expect(state.activeWindowId).toBe("win-1");
      const focused = state.windows.find((w) => w.id === "win-1");
      expect(focused?.isActive).toBe(true);
      expect(focused?.zIndex).toBeGreaterThan(101);
    });
  });

  it("does not refocus an already active window", async () => {
    const user = userEvent.setup();
    useDesktopStore.setState({
      windows: [{ ...sampleWindow, isActive: true }],
      activeWindowId: "win-1",
      nextZIndex: 101,
    });

    render(<WindowWrapper windowId="win-1">Content</WindowWrapper>);

    const initialZIndex = useDesktopStore.getState().windows[0]?.zIndex;
    await user.click(screen.getByText("Test Window"));

    expect(useDesktopStore.getState().windows[0]?.zIndex).toBe(initialZIndex);
  });

  it("closes the window when the close button is clicked", async () => {
    render(<WindowWrapper windowId="win-1">Content</WindowWrapper>);

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    await waitFor(() => {
      expect(useDesktopStore.getState().windows).toHaveLength(0);
      expect(useDesktopStore.getState().activeWindowId).toBeNull();
    });
  });

  it("minimizes the window when the minimize button is clicked", async () => {
    render(<WindowWrapper windowId="win-1">Content</WindowWrapper>);

    fireEvent.click(screen.getByRole("button", { name: /minimize/i }));

    await waitFor(() => {
      const minimized = useDesktopStore.getState().windows.find((w) => w.id === "win-1");
      expect(minimized?.isMinimized).toBe(true);
      expect(minimized?.isActive).toBe(false);
    });
  });

  it("maximizes and restores the window", async () => {
    render(<WindowWrapper windowId="win-1">Content</WindowWrapper>);

    fireEvent.click(screen.getByRole("button", { name: /maximize/i }));

    await waitFor(() => {
      expect(useDesktopStore.getState().windows[0]?.isMaximized).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: /restore/i }));

    await waitFor(() => {
      const restored = useDesktopStore.getState().windows[0];
      expect(restored?.isMaximized).toBe(false);
      expect(restored?.isMinimized).toBe(false);
    });
  });

  it("updates the rendered position when the store position changes", async () => {
    render(<WindowWrapper windowId="win-1">Content</WindowWrapper>);

    act(() => {
      useDesktopStore.getState().setWindowPosition("win-1", { x: 250, y: 180 });
    });

    await waitFor(() => {
      const state = useDesktopStore.getState();
      expect(state.windows[0]?.position).toEqual({ x: 250, y: 180 });
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
      const moved = useDesktopStore.getState().windows.find((w) => w.id === "win-1");
      expect(moved?.position.x).not.toBe(100);
      expect(moved?.position.y).not.toBe(100);
    });
  });
});
