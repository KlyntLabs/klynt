import { describe, expect, it } from "vitest";
import type { ContentMenuSchema } from "../apps/menu-schema";
import { findEntryById, mergeContextMenu, mergeEntries } from "./menu-merger";
import type { ContextMenuSchema } from "./menu-schema";

const baseMenu: ContextMenuSchema = {
  id: "desktop-background-menu",
  root: [
    {
      type: "group",
      id: "new",
      label: "New",
      children: [
        {
          type: "item",
          id: "new-folder",
          label: "New Folder",
          action: "desktop:new-folder",
        },
        {
          type: "item",
          id: "new-markdown",
          label: "New Markdown",
          action: "desktop:new-markdown",
        },
      ],
    },
    { type: "separator" },
    {
      type: "item",
      id: "paste",
      label: "Paste",
      action: "desktop:paste",
    },
    {
      type: "item",
      id: "refresh",
      label: "Refresh",
      action: "desktop:refresh",
    },
  ],
};

describe("menu-merger helpers", () => {
  describe("findEntryById", () => {
    it("finds a top-level entry by id", () => {
      const found = findEntryById(baseMenu.root, "paste");
      expect(found).toBeDefined();
      expect(found?.type).toBe("item");
      if (found?.type === "item") {
        expect(found.label).toBe("Paste");
      }
    });

    it("finds a nested entry by id", () => {
      const found = findEntryById(baseMenu.root, "new-folder");
      expect(found).toBeDefined();
      expect(found?.type).toBe("item");
      if (found?.type === "item") {
        expect(found.action).toBe("desktop:new-folder");
      }
    });

    it("returns undefined for unknown ids", () => {
      expect(findEntryById(baseMenu.root, "unknown")).toBeUndefined();
    });
  });

  describe("mergeEntries", () => {
    it("returns a shallow copy of the base array when overrides are empty", () => {
      const merged = mergeEntries(baseMenu.root, []);
      expect(merged).toEqual(baseMenu.root);
      expect(merged).not.toBe(baseMenu.root);
    });
  });
});

describe("mergeContextMenu", () => {
  it("returns base unchanged except id when no overrides are provided", () => {
    const merged = mergeContextMenu(baseMenu);

    expect(merged.id).toBe("desktop-background-menu-merged");
    expect(merged.root).toEqual(baseMenu.root);
    expect(merged.root).not.toBe(baseMenu.root);
    expect(merged.root[0]).not.toBe(baseMenu.root[0]);
  });

  it("overrides an item label and action", () => {
    const merged = mergeContextMenu(baseMenu, {
      root: [
        {
          type: "item",
          id: "paste",
          label: "Paste Here",
          action: "desktop:paste",
        },
      ],
    });

    const paste = findEntryById(merged.root, "paste");
    expect(paste).toBeDefined();
    expect(paste?.type).toBe("item");
    if (paste?.type === "item") {
      expect(paste.label).toBe("Paste Here");
      expect(paste.action).toBe("desktop:paste");
    }
  });

  it("appends a new item from overrides", () => {
    const merged = mergeContextMenu(baseMenu, {
      root: [
        {
          type: "item",
          id: "share",
          label: "Share",
          action: "custom:share",
        },
      ],
    });

    const share = findEntryById(merged.root, "share");
    expect(share).toBeDefined();
    expect(share?.type).toBe("item");
    if (share?.type === "item") {
      expect(share.label).toBe("Share");
    }
    expect(merged.root[merged.root.length - 1]).toEqual(expect.objectContaining({ id: "share" }));
  });

  it("recursively merges group children", () => {
    const merged = mergeContextMenu(baseMenu, {
      root: [
        {
          type: "group",
          id: "new",
          label: "Create New",
          children: [
            {
              type: "item",
              id: "new-folder",
              label: "Create Folder",
              action: "desktop:new-folder",
            },
            {
              type: "item",
              id: "new-video",
              label: "New Video",
              action: "desktop:new-video",
            },
          ],
        },
      ],
    });

    const group = findEntryById(merged.root, "new");
    expect(group).toBeDefined();
    expect(group?.type).toBe("group");
    if (group?.type !== "group") return;

    expect(group.label).toBe("Create New");
    expect(group.children).toHaveLength(3);

    const folder = findEntryById(group.children, "new-folder");
    expect(folder?.type).toBe("item");
    if (folder?.type === "item") {
      expect(folder.label).toBe("Create Folder");
    }

    const video = findEntryById(group.children, "new-video");
    expect(video?.type).toBe("item");
    if (video?.type === "item") {
      expect(video.label).toBe("New Video");
    }

    const markdown = findEntryById(group.children, "new-markdown");
    expect(markdown?.type).toBe("item");
    if (markdown?.type === "item") {
      expect(markdown.label).toBe("New Markdown");
    }
  });

  it("appends app content menu as a group when overrides.root is absent", () => {
    const appContentMenu: ContentMenuSchema = {
      id: "note-app-menu",
      root: [
        {
          type: "item",
          id: "rename",
          label: "Rename Note",
          action: "app:rename",
        },
        { type: "separator" },
        {
          type: "item",
          id: "duplicate",
          label: "Duplicate",
          action: "app:duplicate" as const,
        },
      ],
    };

    const merged = mergeContextMenu(baseMenu, undefined, appContentMenu);

    expect(merged.root).toHaveLength(baseMenu.root.length + 1);
    const appGroup = merged.root[merged.root.length - 1];
    expect(appGroup?.type).toBe("group");
    if (appGroup?.type !== "group") return;

    expect(appGroup.id).toBe("app-content");
    expect(appGroup.children).toHaveLength(3);

    const rename = findEntryById(appGroup.children, "rename");
    expect(rename?.type).toBe("item");
    if (rename?.type === "item") {
      expect(rename.label).toBe("Rename Note");
    }
  });
});
