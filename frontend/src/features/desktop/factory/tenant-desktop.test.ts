import { describe, expect, it } from "vitest";
import type { AppRegistry } from "@/features/desktop/apps/types";
import { buildTenantDesktop } from "./tenant-desktop";
import type { DesktopConfig } from "./types";

describe("buildTenantDesktop", () => {
  it("returns a valid DesktopConfig", () => {
    const config = buildTenantDesktop("acme", "member", null);

    expect(config.id).toBe("tenant:acme");
    expect(config.title).toBe("Tenant Desktop");
    expect(config.menubar.menus.length).toBeGreaterThan(0);
  });

  it("includes three tenant apps in the registry", () => {
    const config = buildTenantDesktop("acme", "member", null);
    const apps = config.apps as AppRegistry;

    expect(apps).toHaveLength(3);
    expect(apps.map((app) => app.id)).toEqual([
      "tenant-members",
      "tenant-roles",
      "tenant-settings",
    ]);
  });

  it("grants edit permission to owners", () => {
    const config = buildTenantDesktop("acme", "owner", null);
    expect(config.persistence.canEdit()).toBe(true);
  });

  it("grants edit permission to admins", () => {
    const config = buildTenantDesktop("acme", "admin", null);
    expect(config.persistence.canEdit()).toBe(true);
  });

  it("denies edit permission to members", () => {
    const config = buildTenantDesktop("acme", "member", null);
    expect(config.persistence.canEdit()).toBe(false);
  });

  it("exposes the expected config shape", () => {
    const config = buildTenantDesktop("acme", "member", null);

    const desktopConfig = config as DesktopConfig;
    expect(desktopConfig.context.tenantSlug).toBe("acme");
    expect(desktopConfig.context.tenantRole).toBe("member");
    expect(desktopConfig.background.presetId).toBe("fabric");
    expect(desktopConfig.persistence).toBeDefined();
  });
});
