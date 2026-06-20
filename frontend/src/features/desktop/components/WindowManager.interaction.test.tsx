import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import type { WindowState } from "@/features/desktop/store/use-desktop-store";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import { render } from "@/test/render";
import WindowManager from "./WindowManager";

const homeWindow: WindowState = {
  id: "win-home",
  route: "/",
  title: "home.mdx",
  position: { x: 100, y: 100 },
  size: { width: 400, height: 300 },
  zIndex: 100,
  isMinimized: false,
  isMaximized: false,
  isActive: false,
};

const pricingWindow: WindowState = {
  id: "win-pricing",
  route: "/pricing",
  title: "Pricing",
  position: { x: 150, y: 150 },
  size: { width: 400, height: 300 },
  zIndex: 101,
  isMinimized: false,
  isMaximized: false,
  isActive: true,
};

function resetStore() {
  useDesktopStore.setState({
    viewMode: "desktop",
    windows: [],
    activeWindowId: null,
    cookieDismissed: true,
    nextZIndex: 100,
  });
}

describe("WindowManager interactions", () => {
  beforeEach(() => {
    resetStore();
  });

  it("renders multiple windows and switches focus between them", async () => {
    const user = userEvent.setup();
    useDesktopStore.setState({
      windows: [homeWindow, pricingWindow],
      activeWindowId: pricingWindow.id,
      nextZIndex: 101,
    });

    render(<WindowManager />);

    expect(screen.getByText("home.mdx")).toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();

    const homeTitle = screen.getByText("home.mdx");
    await user.click(homeTitle);

    await waitFor(() => {
      const state = useDesktopStore.getState();
      expect(state.activeWindowId).toBe(homeWindow.id);
      const focused = state.windows.find((w) => w.id === homeWindow.id);
      expect(focused?.isActive).toBe(true);
      expect(focused?.zIndex).toBeGreaterThan(pricingWindow.zIndex);
    });
  });

  it("reflects minimized state by hiding the window", async () => {
    useDesktopStore.setState({
      windows: [{ ...pricingWindow, isMinimized: true }],
      activeWindowId: null,
      nextZIndex: 101,
    });

    render(<WindowManager />);

    expect(screen.queryByText("Pricing")).not.toBeInTheDocument();
  });

  it("reflects closed windows by removing them from view", async () => {
    useDesktopStore.setState({
      windows: [homeWindow, pricingWindow],
      activeWindowId: pricingWindow.id,
      nextZIndex: 101,
    });

    render(<WindowManager />);
    expect(screen.getByText("Pricing")).toBeInTheDocument();

    act(() => {
      useDesktopStore.getState().closeWindow(pricingWindow.id);
    });

    await waitFor(() => {
      expect(screen.queryByText("Pricing")).not.toBeInTheDocument();
      const state = useDesktopStore.getState();
      expect(state.windows).toHaveLength(1);
      expect(state.activeWindowId).toBe(homeWindow.id);
      expect(state.windows[0]?.isActive).toBe(true);
    });
  });

  it("reflects maximized state by expanding the window", async () => {
    useDesktopStore.setState({
      windows: [homeWindow],
      activeWindowId: homeWindow.id,
      nextZIndex: 100,
    });

    render(<WindowManager />);

    const windowEl = screen.getByText("home.mdx").closest("div[class*='rounded-lg']");
    expect(windowEl).toBeTruthy();
    expect((windowEl as HTMLElement).style.width).toBe("400px");

    act(() => {
      useDesktopStore.getState().maximizeWindow(homeWindow.id);
    });

    await waitFor(() => {
      const maximized = screen.getByText("home.mdx").closest("div[class*='rounded-lg']");
      expect((maximized as HTMLElement).style.width).toBe("calc(100vw - 0px)");
    });
  });

  it("renders windows for different routes", async () => {
    useDesktopStore.setState({
      windows: [
        homeWindow,
        {
          id: "win-docs",
          route: "/docs",
          title: "Docs",
          position: { x: 200, y: 120 },
          size: { width: 400, height: 300 },
          zIndex: 101,
          isMinimized: false,
          isMaximized: false,
          isActive: false,
        },
        {
          id: "win-trash",
          route: "/trash",
          title: "Trash",
          position: { x: 250, y: 170 },
          size: { width: 400, height: 300 },
          zIndex: 102,
          isMinimized: false,
          isMaximized: false,
          isActive: false,
        },
      ],
      activeWindowId: homeWindow.id,
      nextZIndex: 102,
    });

    render(<WindowManager />);

    expect(screen.getAllByText("home.mdx").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Docs").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Trash").length).toBeGreaterThanOrEqual(1);
  });
});
