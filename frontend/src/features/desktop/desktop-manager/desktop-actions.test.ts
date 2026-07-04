import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type DesktopApp, desktopAppsApi } from "../api/desktop-apps-api";
import type { PersistenceAdapter } from "../persistence/types";
import {
  createDesktopApp,
  deleteDesktopApp,
  moveDesktopApp,
  useDebouncedLayoutSave,
} from "./desktop-actions";
import { useIconTreeStore } from "./icon-tree-module";

const desktopId = "desktop-1";

function mockDesktopApp(overrides: Partial<DesktopApp> = {}): DesktopApp {
  return {
    id: "app-real-1",
    type: "markdown",
    title: "My App",
    content: {},
    menuConfig: {},
    ownerId: null,
    locked: false,
    etag: "v1",
    ...overrides,
  };
}

/** Recursively search a tree for a node by appId. */
function findInTree(
  tree: { appId: string; children?: unknown[] }[] | undefined,
  appId: string
): boolean {
  if (!tree) return false;
  for (const node of tree) {
    if (node.appId === appId) return true;
    if (node.children && findInTree(node.children as never, appId)) return true;
  }
  return false;
}

describe("createDesktopApp", () => {
  beforeEach(() => {
    useIconTreeStore.getState().reset();
  });

  it("adds temp node, calls API, then replaces with real node", async () => {
    const app = mockDesktopApp();
    const createSpy = vi.spyOn(desktopAppsApi, "create").mockResolvedValue({
      data: { data: app },
    } as never);

    await createDesktopApp({
      desktopId,
      slug: "acme",
      type: "markdown",
      title: "My App",
    });

    const tree = useIconTreeStore.getState().trees[desktopId] ?? [];
    expect(findInTree(tree, "app-real-1")).toBe(true);
    expect(findInTree(tree, "temp-")).toBe(false);

    createSpy.mockRestore();
  });

  it("rolls back temp node on API error", async () => {
    const createSpy = vi.spyOn(desktopAppsApi, "create").mockRejectedValue(new Error("network"));

    await expect(
      createDesktopApp({
        desktopId,
        slug: "acme",
        type: "markdown",
        title: "My App",
      })
    ).rejects.toThrow("network");

    const tree = useIconTreeStore.getState().trees[desktopId] ?? [];
    expect(tree).toHaveLength(0);

    createSpy.mockRestore();
  });
});

describe("moveDesktopApp", () => {
  beforeEach(() => {
    useIconTreeStore.getState().reset();
  });

  it("rejects a locked app", async () => {
    await expect(
      moveDesktopApp({
        desktopId,
        appId: "app-1",
        newParentId: null,
        isLocked: true,
      })
    ).rejects.toThrow("Cannot move a locked app");
  });

  it("rejects cycles (moving an ancestor into its own descendant)", async () => {
    // Build a tree: root(parent) → child
    useIconTreeStore.getState().setTree(desktopId, [
      {
        appId: "parent",
        x: 0,
        y: 0,
        title: "Parent",
        children: [{ appId: "child", x: 0, y: 0, title: "Child" }],
      },
    ]);

    // Moving "parent" into "child" should fail (cycle)
    await expect(
      moveDesktopApp({
        desktopId,
        appId: "parent",
        newParentId: "child",
      })
    ).rejects.toThrow("Cannot move app into its own descendant");
  });

  it("updates the store on a valid move", async () => {
    useIconTreeStore.getState().setTree(desktopId, [
      { appId: "app-a", x: 0, y: 0, title: "A" },
      {
        appId: "folder-b",
        x: 0,
        y: 0,
        title: "B",
        children: [],
      },
    ]);

    await moveDesktopApp({
      desktopId,
      appId: "app-a",
      newParentId: "folder-b",
    });

    const tree = useIconTreeStore.getState().trees[desktopId] ?? [];
    // app-a should no longer be at root level
    expect(tree.find((n) => n.appId === "app-a")).toBeUndefined();
    // app-a should now be inside folder-b
    const folderB = tree.find((n) => n.appId === "folder-b");
    expect(folderB?.children?.find((c) => c.appId === "app-a")).toBeDefined();
  });
});

describe("deleteDesktopApp", () => {
  beforeEach(() => {
    useIconTreeStore.getState().reset();
  });

  it("rejects a locked app", async () => {
    await expect(
      deleteDesktopApp({
        desktopId,
        slug: "acme",
        appId: "app-1",
        isLocked: true,
      })
    ).rejects.toThrow("Cannot delete a locked app");
  });

  it("removes the node from the store and calls API delete", async () => {
    useIconTreeStore.getState().setTree(desktopId, [{ appId: "app-1", x: 0, y: 0, title: "A" }]);

    const deleteSpy = vi.spyOn(desktopAppsApi, "delete").mockResolvedValue({} as never);

    await deleteDesktopApp({
      desktopId,
      slug: "acme",
      appId: "app-1",
    });

    const tree = useIconTreeStore.getState().trees[desktopId] ?? [];
    expect(findInTree(tree, "app-1")).toBe(false);
    expect(deleteSpy).toHaveBeenCalledWith("acme", "app-1");

    deleteSpy.mockRestore();
  });

  it("propagates API delete errors to the caller", async () => {
    useIconTreeStore.getState().setTree(desktopId, [{ appId: "app-1", x: 0, y: 0, title: "A" }]);

    const deleteSpy = vi.spyOn(desktopAppsApi, "delete").mockRejectedValue(new Error("network"));

    await expect(
      deleteDesktopApp({
        desktopId,
        slug: "acme",
        appId: "app-1",
      })
    ).rejects.toThrow("network");

    // Node is still optimistically removed from the store
    const tree = useIconTreeStore.getState().trees[desktopId] ?? [];
    expect(findInTree(tree, "app-1")).toBe(false);

    deleteSpy.mockRestore();
  });
});

describe("useDebouncedLayoutSave", () => {
  beforeEach(() => {
    useIconTreeStore.getState().reset();
  });

  it("calls persistence.save after the debounce delay", async () => {
    vi.useFakeTimers();

    const persistence: PersistenceAdapter = {
      load: vi.fn().mockResolvedValue({ ok: true, layout: null }),
      save: vi.fn().mockResolvedValue({ ok: true }),
      canEdit: vi.fn().mockReturnValue(true),
    };

    // Seed a tree so the save has something to persist
    useIconTreeStore.getState().setTree(desktopId, [{ appId: "app-1", x: 10, y: 20, title: "A" }]);

    const { result } = renderHook(() => useDebouncedLayoutSave(desktopId, persistence, 1000));

    act(() => {
      result.current.save();
    });

    // Not called immediately
    expect(persistence.save).not.toHaveBeenCalled();

    // Advance past the debounce
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(persistence.save).toHaveBeenCalledTimes(1);
    expect(persistence.save).toHaveBeenCalledWith(
      desktopId,
      expect.objectContaining({
        version: 1,
        iconTree: expect.arrayContaining([expect.objectContaining({ appId: "app-1" })]),
      })
    );

    vi.useRealTimers();
  });
});
