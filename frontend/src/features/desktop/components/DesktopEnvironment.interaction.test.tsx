import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import { render } from "@/test/render";
import DesktopEnvironment from "./DesktopEnvironment";

function resetStore() {
  useDesktopStore.setState({
    viewMode: "desktop",
    windows: [],
    activeWindowId: null,
    cookieDismissed: true,
    nextZIndex: 100,
  });
}

describe("DesktopEnvironment interactions", () => {
  beforeEach(() => {
    resetStore();
  });

  it("renders the menubar, desktop icons, and window manager", async () => {
    render(<DesktopEnvironment />);

    // Menubar
    expect(screen.getByRole("button", { name: /posthog logo/i })).toBeInTheDocument();
    expect(screen.getAllByText(/^Product OS$/i).length).toBeGreaterThanOrEqual(1);

    // Desktop icons
    expect(screen.getByRole("button", { name: /^home\.mdx$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /switch to website/i })).toBeInTheDocument();

    // Window manager opens the default home window
    await waitFor(() => {
      expect(screen.getAllByText("home.mdx").length).toBeGreaterThanOrEqual(1);
    });

    const state = useDesktopStore.getState();
    expect(state.windows).toHaveLength(1);
    expect(state.windows[0]?.route).toBe("/");
  });
});
