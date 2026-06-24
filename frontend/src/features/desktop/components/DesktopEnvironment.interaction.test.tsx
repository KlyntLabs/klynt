import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { marketingDesktopConfig } from "@/features/desktop/factory/marketing-config";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import { resetDesktopStore } from "@/features/desktop/test-helpers";
import { render } from "@/test/render";
import DesktopEnvironment from "./DesktopEnvironment";

describe("DesktopEnvironment interactions", () => {
  beforeEach(() => {
    resetDesktopStore();
  });

  it("renders the menubar, desktop icons, and window manager", async () => {
    render(<DesktopEnvironment config={marketingDesktopConfig} />);

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
    expect(state.windows.marketing).toHaveLength(1);
    expect(state.windows.marketing?.[0]?.appId).toBe("home");
  });
});
