import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { buildAuthKioskDesktop } from "../factory/auth-kiosk-desktop";
import { useWindowManager } from "../window-manager/window-module";
import { AuthKioskDesktop } from "./AuthKioskDesktop";

describe("AuthKioskDesktop", () => {
  it("renders the desktop environment and opens the single app centered", () => {
    useWindowManager.setState({ windows: {}, activeWindowId: {} });
    const config = buildAuthKioskDesktop("login");

    render(<AuthKioskDesktop config={config} />);

    expect(screen.getByText("Klynt")).toBeInTheDocument();

    const windows = useWindowManager.getState().windows[config.id];
    expect(windows).toHaveLength(1);
    expect(windows?.[0]?.appId).toBe("login");
    expect(windows?.[0]?.width).toBe(config.apps[0]?.defaultSize.width);
    expect(windows?.[0]?.height).toBe(config.apps[0]?.defaultSize.height);
    expect(windows?.[0]?.x).toBe(
      Math.max(0, (window.innerWidth - (config.apps[0]?.defaultSize.width ?? 0)) / 2)
    );
    expect(windows?.[0]?.y).toBe(
      Math.max(40, (window.innerHeight - (config.apps[0]?.defaultSize.height ?? 0)) / 2)
    );
  });
});
