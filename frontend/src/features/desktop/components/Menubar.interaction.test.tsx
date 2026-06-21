import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import { render } from "@/test/render";
import Menubar from "./Menubar";

function resetStore() {
  useDesktopStore.setState({
    viewMode: "desktop",
    windows: [],
    activeWindowId: null,
    cookieDismissed: true,
    nextZIndex: 100,
  });
}

describe("Menubar interactions", () => {
  beforeEach(() => {
    resetStore();
  });

  it("opens a menu and clicking an item opens a window", async () => {
    const user = userEvent.setup();
    render(<Menubar />);

    await user.click(screen.getByRole("button", { name: /^pricing$/i }));

    const menu = screen.getByRole("menu");
    const item = within(menu).getByRole("button", { name: /^pricing$/i });
    expect(item).toBeInTheDocument();

    await user.click(item);

    await waitFor(() => {
      const state = useDesktopStore.getState();
      expect(state.windows).toHaveLength(1);
      expect(state.windows[0]?.route).toBe("/pricing");
      expect(state.activeWindowId).toBe(state.windows[0]?.id);
    });
  });

  it("closes an open menu when clicking outside", async () => {
    const user = userEvent.setup();
    render(<Menubar />);

    await user.click(screen.getByRole("button", { name: /^docs$/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(document.body);

    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("opens the home window when the logo is clicked", async () => {
    const user = userEvent.setup();
    render(<Menubar />);

    await user.click(screen.getByRole("button", { name: /posthog logo/i }));

    await waitFor(() => {
      const state = useDesktopStore.getState();
      expect(state.windows).toHaveLength(1);
      expect(state.windows[0]?.route).toBe("/");
      expect(state.windows[0]?.title).toBe("home.mdx");
    });
  });
});
