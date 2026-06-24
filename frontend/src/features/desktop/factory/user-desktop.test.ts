import { describe, expect, it } from "vitest";
import type { AppRegistry } from "@/features/desktop/apps/types";
import type { DesktopConfig } from "./types";
import { buildUserDesktop } from "./user-desktop";

describe("buildUserDesktop", () => {
  it("returns a valid DesktopConfig", () => {
    const config = buildUserDesktop({ user: null });

    expect(config.title).toBe("User Desktop");
    expect(config.menubar.menus.length).toBeGreaterThan(0);
  });

  it("includes two user apps in the registry", () => {
    const config = buildUserDesktop({ user: null });
    const apps = config.apps as AppRegistry;

    expect(apps).toHaveLength(2);
    expect(apps.map((app) => app.id)).toEqual(["profile", "my-courses"]);
  });

  it("uses the user id in the desktop id", () => {
    const config = buildUserDesktop({ user: { id: "u-123" } as DesktopConfig["context"]["user"] });

    expect(config.id).toBe("user:u-123");
  });

  it("exposes the expected config shape", () => {
    const config = buildUserDesktop({ user: null });

    const desktopConfig = config as DesktopConfig;
    expect(desktopConfig.context.user).toBeNull();
    expect(desktopConfig.background.presetId).toBe("fabric");
    expect(desktopConfig.persistence).toBeDefined();
  });
});
