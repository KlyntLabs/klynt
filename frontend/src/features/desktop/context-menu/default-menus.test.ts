import { describe, expect, it } from "vitest";
import { desktopBackgroundMenu, desktopFolderMenu, desktopIconMenu } from "./default-menus";
import {
  type ContextMenuGroup,
  type ContextMenuItem,
  isContextMenuGroup,
  isContextMenuItem,
} from "./menu-schema";

function findItemByAction(
  root: (ContextMenuItem | ContextMenuGroup)[],
  action: string
): ContextMenuItem | undefined {
  for (const entry of root) {
    if (isContextMenuItem(entry) && entry.action === action) {
      return entry;
    }
    if (isContextMenuGroup(entry)) {
      const found = findItemByAction(
        entry.children.filter(
          (child): child is ContextMenuItem | ContextMenuGroup =>
            isContextMenuItem(child) || isContextMenuGroup(child)
        ),
        action
      );
      if (found) return found;
    }
  }
  return undefined;
}

describe("default desktop context menus", () => {
  it("desktopBackgroundMenu has the expected id and non-empty root", () => {
    expect(desktopBackgroundMenu.id).toBe("desktop-background-menu");
    expect(desktopBackgroundMenu.root.length).toBeGreaterThan(0);
  });

  it("desktopIconMenu has the expected id and non-empty root", () => {
    expect(desktopIconMenu.id).toBe("desktop-icon-menu");
    expect(desktopIconMenu.root.length).toBeGreaterThan(0);
  });

  it("desktopFolderMenu has the expected id and non-empty root", () => {
    expect(desktopFolderMenu.id).toBe("desktop-folder-menu");
    expect(desktopFolderMenu.root.length).toBeGreaterThan(0);
  });

  it("desktopBackgroundMenu contains the New Folder action", () => {
    const item = findItemByAction(
      desktopBackgroundMenu.root.filter(
        (entry): entry is ContextMenuItem | ContextMenuGroup =>
          isContextMenuItem(entry) || isContextMenuGroup(entry)
      ),
      "desktop:new-folder"
    );
    expect(item).toBeDefined();
    expect(item?.label).toBe("New Folder");
  });

  it("desktopIconMenu contains app:delete with a locked visibility condition", () => {
    const item = findItemByAction(
      desktopIconMenu.root.filter(
        (entry): entry is ContextMenuItem | ContextMenuGroup =>
          isContextMenuItem(entry) || isContextMenuGroup(entry)
      ),
      "app:delete"
    );
    expect(item).toBeDefined();
    expect(item?.visible).toEqual({ type: "locked", value: false });
  });

  it("desktopFolderMenu contains both app:open and desktop:new-folder", () => {
    const openItem = findItemByAction(
      desktopFolderMenu.root.filter(
        (entry): entry is ContextMenuItem | ContextMenuGroup =>
          isContextMenuItem(entry) || isContextMenuGroup(entry)
      ),
      "app:open"
    );
    const newFolderItem = findItemByAction(
      desktopFolderMenu.root.filter(
        (entry): entry is ContextMenuItem | ContextMenuGroup =>
          isContextMenuItem(entry) || isContextMenuGroup(entry)
      ),
      "desktop:new-folder"
    );
    expect(openItem).toBeDefined();
    expect(newFolderItem).toBeDefined();
  });
});
