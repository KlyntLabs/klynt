import { describe, expect, it } from "vitest";
import type { AppRegistry } from "@/features/desktop/apps/types";
import { buildAdminDesktop } from "./admin-desktop";
import type { DesktopConfig } from "./types";

describe("buildAdminDesktop", () => {
  it("returns a valid DesktopConfig", () => {
    const config = buildAdminDesktop({ user: null });

    expect(config.id).toBe("admin");
    expect(config.title).toBe("Admin Desktop");
    expect(config.menubar.menus.length).toBeGreaterThan(0);
  });

  it("includes three admin apps in the registry", () => {
    const config = buildAdminDesktop({ user: null });
    const apps = config.apps as AppRegistry;

    expect(apps).toHaveLength(3);
    expect(apps.map((app) => app.id)).toEqual(["user-management", "tenant-management", "reports"]);
  });

  it("exposes the expected config shape", () => {
    const config = buildAdminDesktop({ user: null });

    const desktopConfig = config as DesktopConfig;
    expect(desktopConfig.context.user).toBeNull();
    expect(desktopConfig.background.presetId).toBe("fabric");
    expect(desktopConfig.persistence).toBeDefined();
  });
});
