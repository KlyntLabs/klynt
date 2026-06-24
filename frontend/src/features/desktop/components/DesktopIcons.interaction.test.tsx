import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { marketingDesktopConfig } from "@/features/desktop/factory/marketing-config";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import {
  createTestApp,
  createTestConfig,
  resetDesktopStore,
} from "@/features/desktop/test-helpers";
import { render } from "@/test/render";
import DesktopIcons from "./DesktopIcons";

describe("DesktopIcons interactions", () => {
  beforeEach(() => {
    resetDesktopStore();
  });

  it("opens a window when an icon is clicked", async () => {
    const user = userEvent.setup();
    render(<DesktopIcons config={marketingDesktopConfig} />);

    await user.click(screen.getByRole("button", { name: /^pricing$/i }));

    await waitFor(() => {
      expect(useDesktopStore.getState().windows.marketing).toHaveLength(1);
    });

    const windowState = useDesktopStore.getState().windows.marketing?.[0];
    expect(windowState?.appId).toBe("pricing");
    expect(useDesktopStore.getState().activeWindowId.marketing).toBe(windowState?.id);
  });

  it("focuses an existing window when clicked", async () => {
    const user = userEvent.setup();
    const config = createTestConfig({
      id: "test-dock",
      apps: [
        createTestApp({ id: "pricing", title: "Pricing", dock: { position: "left", order: 1 } }),
      ],
    });
    useDesktopStore.setState({
      windows: {
        "test-dock": [
          {
            id: "win-pricing",
            appId: "pricing",
            x: 100,
            y: 100,
            width: 400,
            height: 300,
            zIndex: 101,
            state: "normal",
          },
        ],
      },
      activeWindowId: { "test-dock": null },
      nextZIndex: 102,
    });

    render(<DesktopIcons config={config} />);

    await user.click(screen.getByRole("button", { name: /^pricing$/i }));

    await waitFor(() => {
      const state = useDesktopStore.getState();
      expect(state.activeWindowId["test-dock"]).toBe("win-pricing");
      const focused = state.windows["test-dock"]?.find((w) => w.id === "win-pricing");
      expect(focused?.zIndex).toBeGreaterThan(101);
    });
  });
});
