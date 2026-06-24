import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import type { WindowState } from "@/features/desktop/store/use-desktop-store";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import { render } from "@/test/render";
import { createTestApp, createTestConfig } from "../test-helpers";
import WindowManager from "./WindowManager";

const DESKTOP_ID = "test-wm";

const homeWindow: WindowState = {
  id: "win-home",
  appId: "home",
  x: 100,
  y: 100,
  width: 400,
  height: 300,
  zIndex: 100,
  state: "normal",
};

const pricingWindow: WindowState = {
  id: "win-pricing",
  appId: "pricing",
  x: 150,
  y: 150,
  width: 400,
  height: 300,
  zIndex: 101,
  state: "normal",
};

const config = createTestConfig({
  id: DESKTOP_ID,
  apps: [
    createTestApp({ id: "home", title: "home.mdx", component: () => <div>home content</div> }),
    createTestApp({ id: "pricing", title: "Pricing", component: () => <div>pricing content</div> }),
    createTestApp({ id: "docs", title: "Docs", component: () => <div>docs content</div> }),
    createTestApp({ id: "trash", title: "Trash", component: () => <div>trash content</div> }),
  ],
});

function resetStore() {
  useDesktopStore.setState({
    viewMode: "desktop",
    windows: {},
    activeWindowId: {},
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
      windows: { [DESKTOP_ID]: [homeWindow, pricingWindow] },
      activeWindowId: { [DESKTOP_ID]: pricingWindow.id },
      nextZIndex: 102,
    });

    render(<WindowManager config={config} />);

    expect(screen.getByText("home.mdx")).toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();

    const homeTitle = screen.getByText("home.mdx");
    await user.click(homeTitle);

    await waitFor(() => {
      const state = useDesktopStore.getState();
      expect(state.activeWindowId[DESKTOP_ID]).toBe(homeWindow.id);
      const focused = state.windows[DESKTOP_ID]?.find((w) => w.id === homeWindow.id);
      expect(focused?.zIndex).toBeGreaterThan(pricingWindow.zIndex);
    });
  });

  it("reflects minimized state by hiding the window", async () => {
    useDesktopStore.setState({
      windows: { [DESKTOP_ID]: [{ ...pricingWindow, state: "minimized" }] },
      activeWindowId: { [DESKTOP_ID]: null },
      nextZIndex: 101,
    });

    render(<WindowManager config={config} />);

    expect(screen.queryByText("Pricing")).not.toBeInTheDocument();
  });

  it("reflects closed windows by removing them from view", async () => {
    useDesktopStore.setState({
      windows: { [DESKTOP_ID]: [homeWindow, pricingWindow] },
      activeWindowId: { [DESKTOP_ID]: pricingWindow.id },
      nextZIndex: 102,
    });

    render(<WindowManager config={config} />);
    expect(screen.getByText("Pricing")).toBeInTheDocument();

    act(() => {
      useDesktopStore.getState().closeWindow(DESKTOP_ID, pricingWindow.id);
    });

    await waitFor(() => {
      expect(screen.queryByText("Pricing")).not.toBeInTheDocument();
      const state = useDesktopStore.getState();
      expect(state.windows[DESKTOP_ID]).toHaveLength(1);
      expect(state.activeWindowId[DESKTOP_ID]).toBe(homeWindow.id);
    });
  });

  it("reflects maximized state by expanding the window", async () => {
    useDesktopStore.setState({
      windows: { [DESKTOP_ID]: [homeWindow] },
      activeWindowId: { [DESKTOP_ID]: homeWindow.id },
      nextZIndex: 101,
    });

    render(<WindowManager config={config} />);

    const windowEl = screen.getByText("home.mdx").closest("div[class*='rounded-lg']");
    expect(windowEl).toBeTruthy();
    expect((windowEl as HTMLElement).style.width).toBe("400px");

    act(() => {
      useDesktopStore.getState().maximizeWindow(DESKTOP_ID, homeWindow.id);
    });

    await waitFor(() => {
      const maximized = screen.getByText("home.mdx").closest("div[class*='rounded-lg']");
      expect((maximized as HTMLElement).style.width).toBe("calc(100vw - 0px)");
    });
  });

  it("renders windows for different routes", async () => {
    useDesktopStore.setState({
      windows: {
        [DESKTOP_ID]: [
          homeWindow,
          {
            id: "win-docs",
            appId: "docs",
            x: 200,
            y: 120,
            width: 400,
            height: 300,
            zIndex: 101,
            state: "normal",
          },
          {
            id: "win-trash",
            appId: "trash",
            x: 250,
            y: 170,
            width: 400,
            height: 300,
            zIndex: 102,
            state: "normal",
          },
        ],
      },
      activeWindowId: { [DESKTOP_ID]: homeWindow.id },
      nextZIndex: 103,
    });

    render(<WindowManager config={config} />);

    expect(screen.getAllByText("home.mdx").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Docs").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Trash").length).toBeGreaterThanOrEqual(1);
  });
});
