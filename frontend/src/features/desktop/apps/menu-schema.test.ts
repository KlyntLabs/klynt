import { describe, expect, it } from "vitest";
import { isMenuGroup, isMenuItem, isMenuSeparator, type MenuEntry } from "./menu-schema";

describe("menu-schema type guards", () => {
  const item: MenuEntry = {
    type: "item",
    id: "rename",
    label: "Rename",
    action: "app:rename",
  };

  const separator: MenuEntry = { type: "separator" };

  const group: MenuEntry = {
    type: "group",
    id: "file-actions",
    label: "File",
    children: [item, separator],
  };

  describe("isMenuItem", () => {
    it("returns true for a valid menu item", () => {
      expect(isMenuItem(item)).toBe(true);
    });

    it("returns false for separators and groups", () => {
      expect(isMenuItem(separator)).toBe(false);
      expect(isMenuItem(group)).toBe(false);
    });

    it("returns false for non-menu inputs", () => {
      expect(isMenuItem(null as unknown as MenuEntry)).toBe(false);
      expect(isMenuItem({ type: "unknown" } as unknown as MenuEntry)).toBe(false);
    });
  });

  describe("isMenuSeparator", () => {
    it("returns true for a valid separator", () => {
      expect(isMenuSeparator(separator)).toBe(true);
    });

    it("returns false for items and groups", () => {
      expect(isMenuSeparator(item)).toBe(false);
      expect(isMenuSeparator(group)).toBe(false);
    });

    it("returns false for non-menu inputs", () => {
      expect(isMenuSeparator(null as unknown as MenuEntry)).toBe(false);
      expect(isMenuSeparator({} as unknown as MenuEntry)).toBe(false);
    });
  });

  describe("isMenuGroup", () => {
    it("returns true for a valid group", () => {
      expect(isMenuGroup(group)).toBe(true);
    });

    it("returns false for items and separators", () => {
      expect(isMenuGroup(item)).toBe(false);
      expect(isMenuGroup(separator)).toBe(false);
    });

    it("returns false for non-menu inputs", () => {
      expect(isMenuGroup(undefined as unknown as MenuEntry)).toBe(false);
      expect(isMenuGroup({ type: "invalid" } as unknown as MenuEntry)).toBe(false);
    });
  });
});
