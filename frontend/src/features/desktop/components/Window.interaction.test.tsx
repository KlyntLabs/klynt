import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Window } from "@/features/desktop/window-manager/window-module";
import { useWindowManager } from "@/features/desktop/window-manager/window-module";
import { render } from "@/test/render";
import WindowComponent from "./Window";

const sampleWindow: Window = {
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
  useWindowManager.setState({
    viewMode: "desktop",
    windows: { [DESKTOP_ID]: [sampleWindow] },
    activeWindowId: { [DESKTOP_ID]: null },
    nextZIndex: 102,
  });
}

function WindowWrapper({ windowId, children }: { windowId: string; children?: ReactNode }) {
  const w = useWindowManager((state) =>
    state.windows[DESKTOP_ID]?.find((win) => win.id === windowId)
  );
  if (!w) return null;
  return (
    <WindowComponent desktopId={DESKTOP_ID} window={w} title="Test Window">
      {children}
    </WindowComponent>
  );
}

function LockedWindowWrapper({ windowId, children }: { windowId: string; children?: ReactNode }) {
  const w = useWindowManager((state) =>
    state.windows[DESKTOP_ID]?.find((win) => win.id === windowId)
  );
  if (!w) return null;
  return (
    <WindowComponent desktopId={DESKTOP_ID} window={w} title="Test Window" locked>
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
      const state = useWindowManager.getState();
      expect(state.activeWindowId[DESKTOP_ID]).toBe("win-1");
      const focused = state.windows[DESKTOP_ID]?.find((w) => w.id === "win-1");
      expect(focused?.zIndex).toBeGreaterThan(101);
    });
  });

  it("does not refocus an already active window", async () => {
    const user = userEvent.setup();
    useWindowManager.setState({
      windows: { [DESKTOP_ID]: [{ ...sampleWindow, zIndex: 102 }] },
      activeWindowId: { [DESKTOP_ID]: "win-1" },
      nextZIndex: 103,
    });

    render(<WindowWrapper windowId="win-1">Content</WindowWrapper>);

    const initialZIndex = useWindowManager.getState().windows[DESKTOP_ID]?.[0]?.zIndex;
    await user.click(screen.getByText("Test Window"));

    expect(useWindowManager.getState().windows[DESKTOP_ID]?.[0]?.zIndex).toBe(initialZIndex);
  });

  it("closes the window when the close button is clicked", async () => {
    render(<WindowWrapper windowId="win-1">Content</WindowWrapper>);

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    await waitFor(() => {
      expect(useWindowManager.getState().windows[DESKTOP_ID]).toHaveLength(0);
      expect(useWindowManager.getState().activeWindowId[DESKTOP_ID]).toBeNull();
    });
  });

  it("minimizes the window when the minimize button is clicked", async () => {
    render(<WindowWrapper windowId="win-1">Content</WindowWrapper>);

    fireEvent.click(screen.getByRole("button", { name: /minimize/i }));

    await waitFor(() => {
      const minimized = useWindowManager
        .getState()
        .windows[DESKTOP_ID]?.find((w) => w.id === "win-1");
      expect(minimized?.state).toBe("minimized");
    });
  });

  it("maximizes and restores the window", async () => {
    render(<WindowWrapper windowId="win-1">Content</WindowWrapper>);

    fireEvent.click(screen.getByRole("button", { name: /maximize/i }));

    await waitFor(() => {
      expect(useWindowManager.getState().windows[DESKTOP_ID]?.[0]?.state).toBe("maximized");
    });

    fireEvent.click(screen.getByRole("button", { name: /restore/i }));

    await waitFor(() => {
      const restored = useWindowManager.getState().windows[DESKTOP_ID]?.[0];
      expect(restored?.state).toBe("normal");
    });
  });

  it("updates the rendered position when the store position changes", async () => {
    render(<WindowWrapper windowId="win-1">Content</WindowWrapper>);

    act(() => {
      useWindowManager
        .getState()
        .moveWindow(DESKTOP_ID, "win-1", { x: 250, y: 180, width: 400, height: 300 });
    });

    await waitFor(() => {
      const state = useWindowManager.getState();
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
      const moved = useWindowManager.getState().windows[DESKTOP_ID]?.find((w) => w.id === "win-1");
      expect(moved?.x).not.toBe(100);
      expect(moved?.y).not.toBe(100);
    });
  });

  it("renders the default error fallback when a child throws", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    function ThrowingChild(): ReactNode {
      throw new Error("boom");
    }

    render(
      <WindowWrapper windowId="win-1">
        <ThrowingChild />
      </WindowWrapper>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();

    consoleError.mockRestore();
  });

  describe("locked windows", () => {
    it("hides the close, minimize, and maximize controls", () => {
      render(<LockedWindowWrapper windowId="win-1">Content</LockedWindowWrapper>);

      expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /minimize/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /maximize/i })).not.toBeInTheDocument();
    });

    it("hides the toolbar", () => {
      render(<LockedWindowWrapper windowId="win-1">Content</LockedWindowWrapper>);

      expect(screen.queryByRole("button", { name: /back/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /search/i })).not.toBeInTheDocument();
    });

    it("does not update position when dragged", async () => {
      render(<LockedWindowWrapper windowId="win-1">Content</LockedWindowWrapper>);

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
        const moved = useWindowManager
          .getState()
          .windows[DESKTOP_ID]?.find((w) => w.id === "win-1");
        expect(moved?.x).toBe(100);
        expect(moved?.y).toBe(100);
      });
    });
  });
});
