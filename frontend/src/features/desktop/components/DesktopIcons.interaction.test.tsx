import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import { render } from "@/test/render";
import DesktopIcons from "./DesktopIcons";

function resetStore() {
  useDesktopStore.setState({
    viewMode: "desktop",
    windows: [],
    activeWindowId: null,
    cookieDismissed: true,
    nextZIndex: 100,
  });
}

describe("DesktopIcons interactions", () => {
  beforeEach(() => {
    resetStore();
  });

  it("opens a window when an icon is clicked", async () => {
    const user = userEvent.setup();
    render(<DesktopIcons />);

    await user.click(screen.getByRole("button", { name: /^pricing$/i }));

    await waitFor(() => {
      expect(useDesktopStore.getState().windows).toHaveLength(1);
    });

    const windowState = useDesktopStore.getState().windows[0];
    expect(windowState?.title).toBe("Pricing");
    expect(windowState?.route).toBe("/pricing");
    expect(windowState?.isActive).toBe(true);
  });

  it("focuses an existing window when double-clicked", async () => {
    const user = userEvent.setup();
    useDesktopStore.setState({
      windows: [
        {
          id: "win-pricing",
          route: "/pricing",
          title: "Pricing",
          position: { x: 100, y: 100 },
          size: { width: 400, height: 300 },
          zIndex: 101,
          isMinimized: false,
          isMaximized: false,
          isActive: false,
        },
      ],
      activeWindowId: null,
      nextZIndex: 101,
    });

    render(<DesktopIcons />);

    await user.dblClick(screen.getByRole("button", { name: /^pricing$/i }));

    await waitFor(() => {
      const state = useDesktopStore.getState();
      expect(state.activeWindowId).toBe("win-pricing");
      const focused = state.windows.find((w) => w.id === "win-pricing");
      expect(focused?.isActive).toBe(true);
      expect(focused?.zIndex).toBeGreaterThan(101);
    });
  });
});
