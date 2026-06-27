import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { marketingDesktopConfig } from "@/features/desktop/factory/marketing-config";
import { resetDesktopStore } from "@/features/desktop/test-helpers";
import { useWindowManager } from "@/features/desktop/window-manager/window-module";
import { render } from "@/test/render";
import Menubar from "./Menubar";

describe("Menubar interactions", () => {
  beforeEach(() => {
    resetDesktopStore();
  });

  it("opens a menu and clicking an item opens a window", async () => {
    const user = userEvent.setup();
    render(<Menubar config={marketingDesktopConfig} />);

    await user.click(screen.getByRole("button", { name: /^pricing$/i }));

    const menu = screen.getByRole("menu");
    const item = within(menu).getByRole("button", { name: /^pricing$/i });
    expect(item).toBeInTheDocument();

    await user.click(item);

    await waitFor(() => {
      const state = useWindowManager.getState();
      expect(state.windows.marketing).toHaveLength(1);
      expect(state.windows.marketing?.[0]?.appId).toBe("pricing");
      expect(state.activeWindowId.marketing).toBe(state.windows.marketing?.[0]?.id);
    });
  });

  it("closes an open menu when clicking outside", async () => {
    const user = userEvent.setup();
    render(<Menubar config={marketingDesktopConfig} />);

    await user.click(screen.getByRole("button", { name: /^docs$/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(document.body);

    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("opens the home window when the logo is clicked", async () => {
    const user = userEvent.setup();
    render(<Menubar config={marketingDesktopConfig} />);

    await user.click(screen.getByRole("button", { name: /klynt logo/i }));

    await waitFor(() => {
      const state = useWindowManager.getState();
      expect(state.windows.marketing).toHaveLength(1);
      expect(state.windows.marketing?.[0]?.appId).toBe("home");
    });
  });
});
