import { describe, expect, it } from "vitest";
import {
  type ContextMenuEntry,
  type ContextMenuSchema,
  isContextMenuGroup,
  isContextMenuItem,
  isContextMenuSeparator,
} from "./menu-schema";

describe("desktop context menu schema type guards", () => {
  const item: ContextMenuEntry = {
    type: "item",
    id: "new-folder",
    label: "New Folder",
    action: "desktop:new-folder",
    icon: "Folder",
    shortcut: "Ctrl+Shift+N",
  };

  const separator: ContextMenuEntry = { type: "separator" };

  const group: ContextMenuEntry = {
    type: "group",
    id: "new-items",
    label: "New",
    children: [item, separator],
  };

  describe("isContextMenuItem", () => {
    it("returns true for a valid context menu item", () => {
      expect(isContextMenuItem(item)).toBe(true);
    });

    it("returns false for separators and groups", () => {
      expect(isContextMenuItem(separator)).toBe(false);
      expect(isContextMenuItem(group)).toBe(false);
    });

    it("returns false for non-menu inputs", () => {
      expect(isContextMenuItem(null as unknown as ContextMenuEntry)).toBe(false);
      expect(isContextMenuItem({ type: "unknown" } as unknown as ContextMenuEntry)).toBe(false);
    });
  });

  describe("isContextMenuSeparator", () => {
    it("returns true for a valid separator", () => {
      expect(isContextMenuSeparator(separator)).toBe(true);
    });

    it("returns false for items and groups", () => {
      expect(isContextMenuSeparator(item)).toBe(false);
      expect(isContextMenuSeparator(group)).toBe(false);
    });

    it("returns false for non-menu inputs", () => {
      expect(isContextMenuSeparator(null as unknown as ContextMenuEntry)).toBe(false);
      expect(isContextMenuSeparator({} as unknown as ContextMenuEntry)).toBe(false);
    });
  });

  describe("isContextMenuGroup", () => {
    it("returns true for a valid group", () => {
      expect(isContextMenuGroup(group)).toBe(true);
    });

    it("returns false for items and separators", () => {
      expect(isContextMenuGroup(item)).toBe(false);
      expect(isContextMenuGroup(separator)).toBe(false);
    });

    it("returns false for non-menu inputs", () => {
      expect(isContextMenuGroup(undefined as unknown as ContextMenuEntry)).toBe(false);
      expect(isContextMenuGroup({ type: "invalid" } as unknown as ContextMenuEntry)).toBe(false);
    });
  });
});

describe("desktop context menu schema", () => {
  it("type-checks a complete ContextMenuSchema object", () => {
    const schema: ContextMenuSchema = {
      id: "desktop-context-menu",
      root: [
        {
          type: "group",
          id: "new",
          label: "New",
          children: [
            {
              type: "item",
              id: "new-folder",
              label: "Folder",
              action: "desktop:new-folder",
              icon: "Folder",
              shortcut: "Ctrl+Shift+N",
            },
            {
              type: "item",
              id: "new-markdown",
              label: "Markdown Document",
              action: "desktop:new-markdown",
            },
            { type: "separator" },
            {
              type: "item",
              id: "new-video",
              label: "Video",
              action: "desktop:new-video",
              visible: { type: "role", role: "owner" },
            },
          ],
        },
        { type: "separator" },
        {
          type: "item",
          id: "paste",
          label: "Paste",
          action: "desktop:paste",
          disabled: false,
          visible: { type: "selectionEmpty", value: true },
        },
        {
          type: "item",
          id: "refresh",
          label: "Refresh",
          action: "desktop:refresh",
          shortcut: "F5",
        },
        { type: "separator" },
        {
          type: "item",
          id: "change-background",
          label: "Change Background",
          action: "desktop:change-background",
          visible: {
            type: "negation",
            condition: { type: "locked", value: true },
          },
        },
        {
          type: "group",
          id: "icon-actions",
          label: "Icon Actions",
          children: [
            {
              type: "item",
              id: "open",
              label: "Open",
              action: "app:open",
            },
            {
              type: "item",
              id: "rename",
              label: "Rename",
              action: "app:rename",
              shortcut: "F2",
            },
            {
              type: "item",
              id: "cut",
              label: "Cut",
              action: "app:cut",
              shortcut: "Ctrl+X",
            },
            {
              type: "item",
              id: "copy",
              label: "Copy",
              action: "app:copy",
              shortcut: "Ctrl+C",
              visible: { type: "isFolder", value: false },
            },
            {
              type: "item",
              id: "delete",
              label: "Delete",
              action: "app:delete",
              shortcut: "Delete",
              metadata: { confirm: true },
            },
          ],
        },
        {
          type: "item",
          id: "custom-action",
          label: "Custom",
          action: "custom:my-extension",
        },
      ],
    };

    expect(schema.id).toBe("desktop-context-menu");
    expect(schema.root).toHaveLength(8);
  });
});
