import { describe, expect, it } from "vitest";
import { tenantMenubar } from "./tenant-menubar";
import type { MenubarItem } from "./types";

type SubmenuItem = Extract<MenubarItem, { type: "submenu" }>;

describe("tenantMenubar", () => {
  it("has a Klynt brand label", () => {
    expect(tenantMenubar.brand.label).toBe("Klynt");
  });

  it("contains the expected top-level menus", () => {
    const labels = tenantMenubar.menus
      .filter((menu): menu is SubmenuItem => menu.type === "submenu")
      .map((menu) => menu.label);

    expect(labels).toEqual([
      "desktop.menubar.file",
      "desktop.menubar.edit",
      "desktop.menubar.view",
      "tenant:menubar.tenant",
      "desktop.menubar.window",
      "desktop.menubar.help",
    ]);
  });

  it("includes tenant app open actions", () => {
    const tenantMenu = tenantMenubar.menus.find(
      (menu): menu is SubmenuItem =>
        menu.type === "submenu" && menu.label === "tenant:menubar.tenant"
    );

    const actions = tenantMenu?.items.filter((item) => item.type === "action");
    expect(actions?.length).toBe(3);
    expect(actions?.map((item) => (item.type === "action" ? item.action : null))).toEqual([
      { type: "open-app", appId: "tenant-members" },
      { type: "open-app", appId: "tenant-roles" },
      { type: "open-app", appId: "tenant-settings" },
    ]);
  });

  it("includes a window-list menu", () => {
    const windowMenu = tenantMenubar.menus.find(
      (menu): menu is SubmenuItem =>
        menu.type === "submenu" && menu.label === "desktop.menubar.window"
    );

    const hasWindowList = windowMenu?.items.some((item) => item.type === "window-list");
    expect(hasWindowList).toBe(true);
  });
});
