import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { marketingDesktopConfig } from "@/features/desktop/factory/marketing-config";
import {
  createTestApp,
  createTestConfig,
  resetDesktopStore,
} from "@/features/desktop/test-helpers";
import { useWindowManager } from "@/features/desktop/window-manager/window-module";
import { render } from "@/test/render";
import DesktopIcons from "./DesktopIcons";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("DesktopIcons interactions", () => {
  beforeEach(() => {
    resetDesktopStore();
  });

  it("opens a window when an icon is clicked", async () => {
    const user = userEvent.setup();
    render(<DesktopIcons config={marketingDesktopConfig} />);

    await user.click(screen.getByRole("button", { name: /^pricing$/i }));

    await waitFor(() => {
      expect(useWindowManager.getState().windows.marketing).toHaveLength(1);
    });

    const windowState = useWindowManager.getState().windows.marketing?.[0];
    expect(windowState?.appId).toBe("pricing");
    expect(useWindowManager.getState().activeWindowId.marketing).toBe(windowState?.id);
  });

  it("focuses an existing window when clicked", async () => {
    const user = userEvent.setup();
    const config = createTestConfig({
      id: "test-dock",
      apps: [
        createTestApp({ id: "pricing", title: "Pricing", dock: { position: "left", order: 1 } }),
      ],
    });
    useWindowManager.setState({
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
      const state = useWindowManager.getState();
      expect(state.activeWindowId["test-dock"]).toBe("win-pricing");
      const focused = state.windows["test-dock"]?.find((w) => w.id === "win-pricing");
      expect(focused?.zIndex).toBeGreaterThan(101);
    });
  });

  it("navigates to register when the sign-up icon is clicked", async () => {
    const user = userEvent.setup();
    render(<DesktopIcons config={marketingDesktopConfig} />);

    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/register");
    });
  });

  it("switches to website view when the switch icon is clicked", async () => {
    const user = userEvent.setup();
    render(<DesktopIcons config={marketingDesktopConfig} />);

    await user.click(screen.getByRole("button", { name: /switch to website/i }));

    await waitFor(() => {
      expect(useWindowManager.getState().viewMode).toBe("website");
    });
  });
});
