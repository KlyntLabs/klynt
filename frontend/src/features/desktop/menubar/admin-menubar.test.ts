import { describe, expect, it } from "vitest";
import { adminMenubar } from "./admin-menubar";
import type { MenubarItem } from "./types";

type SubmenuItem = Extract<MenubarItem, { type: "submenu" }>;

describe("adminMenubar", () => {
  it("has a Klynt brand label", () => {
    expect(adminMenubar.brand.label).toBe("Klynt");
  });

  it("contains the expected top-level menus", () => {
    const labels = adminMenubar.menus
      .filter((menu): menu is SubmenuItem => menu.type === "submenu")
      .map((menu) => menu.label);

    expect(labels).toEqual([
      "desktop.menubar.file",
      "desktop.menubar.edit",
      "desktop.menubar.view",
      "desktop.menubar.window",
      "desktop.menubar.settings",
      "desktop.menubar.help",
    ]);
  });

  it("has file menu actions for window management", () => {
    const fileMenu = adminMenubar.menus.find(
      (menu): menu is SubmenuItem =>
        menu.type === "submenu" && menu.label === "desktop.menubar.file"
    );

    expect(fileMenu).toBeDefined();
    expect(fileMenu?.items.length).toBe(3);
  });

  it("includes a window-list menu", () => {
    const windowMenu = adminMenubar.menus.find(
      (menu): menu is SubmenuItem =>
        menu.type === "submenu" && menu.label === "desktop.menubar.window"
    );

    const hasWindowList = windowMenu?.items.some((item) => item.type === "window-list");
    expect(hasWindowList).toBe(true);
  });
});
