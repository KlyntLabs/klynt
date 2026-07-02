import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type IconTreeNode, isDescendant, useIconTreeStore } from "./icon-tree-module";

const n = (appId: string, overrides: Partial<IconTreeNode> = {}): IconTreeNode => ({
  appId,
  x: 0,
  y: 0,
  ...overrides,
});

describe("useIconTreeStore", () => {
  beforeEach(() => {
    act(() => useIconTreeStore.getState().reset());
  });

  afterEach(() => {
    act(() => useIconTreeStore.getState().reset());
  });

  it("sets trees scoped by desktop id", () => {
    const { result } = renderHook(() => useIconTreeStore());

    act(() => {
      result.current.setTree("d1", [n("a1")]);
      result.current.setTree("d2", [n("a2")]);
    });

    expect(result.current.trees.d1?.[0]?.appId).toBe("a1");
    expect(result.current.trees.d2?.[0]?.appId).toBe("a2");
  });

  it("adds nodes to the root tree and nested parents", () => {
    const { result } = renderHook(() => useIconTreeStore());

    act(() => result.current.addNode("d1", n("a1")));
    expect(result.current.trees.d1?.[0]?.appId).toBe("a1");
    expect(result.current.trees.d1?.[0]?.parentIdSnapshot).toBeNull();

    act(() => {
      result.current.setTree("d1", [n("f1", { children: [] })]);
      result.current.addNode("d1", n("a2"), "f1");
    });
    expect(result.current.trees.d1?.[0]?.children?.[0]?.appId).toBe("a2");
    expect(result.current.trees.d1?.[0]?.children?.[0]?.parentIdSnapshot).toBe("f1");

    let added = true;
    act(() => {
      added = result.current.addNode("d1", n("a3"), "missing");
    });
    expect(added).toBe(false);
  });

  it("removes a node and its descendants", () => {
    const { result } = renderHook(() => useIconTreeStore());

    act(() => {
      result.current.setTree("d1", [n("f1", { children: [n("a1")] }), n("a2")]);
    });

    let removed = false;
    act(() => {
      removed = result.current.removeNode("d1", "f1");
    });
    expect(removed).toBe(true);
    expect(result.current.trees.d1).toHaveLength(1);
    expect(result.current.trees.d1?.[0]?.appId).toBe("a2");

    act(() => {
      removed = result.current.removeNode("d1", "missing");
    });
    expect(removed).toBe(false);
  });

  it("moves nodes, reparents to root or nested folders, and rejects cycles", () => {
    const { result } = renderHook(() => useIconTreeStore());

    act(() => {
      result.current.setTree("d1", [n("f1", { children: [n("a1")] }), n("f2", { children: [] })]);
    });

    let moved = true;
    act(() => {
      moved = result.current.moveNode("d1", "f1", "a1");
    });
    expect(moved).toBe(false);

    act(() => {
      moved = result.current.moveNode("d1", "f2", "f2");
    });
    expect(moved).toBe(false);

    act(() => {
      moved = result.current.moveNode("d1", "a1", null);
    });
    expect(moved).toBe(true);
    expect(result.current.trees.d1).toHaveLength(3);
    expect(
      result.current.trees.d1?.find((node) => node.appId === "a1")?.parentIdSnapshot
    ).toBeNull();

    act(() => {
      moved = result.current.moveNode("d1", "a1", "f2");
    });
    expect(moved).toBe(true);
    expect(result.current.trees.d1?.find((node) => node.appId === "f2")?.children?.[0]?.appId).toBe(
      "a1"
    );

    act(() => {
      moved = result.current.moveNode("d1", "missing", "f2");
    });
    expect(moved).toBe(false);
    act(() => {
      moved = result.current.moveNode("d1", "f2", "missing");
    });
    expect(moved).toBe(false);
  });

  it("renames a node", () => {
    const { result } = renderHook(() => useIconTreeStore());

    act(() => result.current.setTree("d1", [n("a1")]));

    let renamed = false;
    act(() => {
      renamed = result.current.renameNode("d1", "a1", "My App");
    });
    expect(renamed).toBe(true);
    expect(result.current.trees.d1?.[0]?.title).toBe("My App");

    act(() => {
      renamed = result.current.renameNode("d1", "missing", "X");
    });
    expect(renamed).toBe(false);
  });

  it("opens, closes, and navigates folders", () => {
    const { result } = renderHook(() => useIconTreeStore());

    act(() => {
      result.current.openFolder("d1", "f1");
      result.current.openFolder("d1", "f2");
      result.current.openFolder("d1", "f3");
    });
    expect(result.current.openFolderPaths.d1).toEqual(["f1", "f2", "f3"]);

    act(() => result.current.closeFolder("d1"));
    expect(result.current.openFolderPaths.d1).toEqual(["f1", "f2"]);

    act(() => result.current.navigateToIndex("d1", 0));
    expect(result.current.openFolderPaths.d1).toEqual(["f1"]);

    act(() => result.current.navigateToIndex("d1", -1));
    expect(result.current.openFolderPaths.d1).toEqual([]);

    act(() => {
      result.current.openFolder("d1", "f1");
      result.current.navigateToRoot("d1");
    });
    expect(result.current.openFolderPaths.d1).toEqual([]);
  });

  it("resets state", () => {
    const { result } = renderHook(() => useIconTreeStore());

    act(() => {
      result.current.setTree("d1", [n("a1")]);
      result.current.openFolder("d1", "f1");
      result.current.addNode("d2", n("a2"));
      result.current.setBundleEtag("d1", "etag-1");
    });

    act(() => result.current.reset());

    expect(result.current.trees).toEqual({});
    expect(result.current.openFolderPaths).toEqual({});
    expect(result.current.bundleEtags).toEqual({});
  });

  it("stores bundle ETags per desktop", () => {
    const { result } = renderHook(() => useIconTreeStore());

    act(() => {
      result.current.setBundleEtag("d1", "etag-1");
      result.current.setBundleEtag("d2", "etag-2");
    });

    expect(result.current.bundleEtags).toEqual({ d1: "etag-1", d2: "etag-2" });
  });
});

describe("isDescendant", () => {
  it("detects the ancestor itself and descendants", () => {
    const tree = [n("f1", { children: [n("f2", { children: [n("a1")] })] })];
    expect(isDescendant(tree, "f1", "f1")).toBe(true);
    expect(isDescendant(tree, "f1", "a1")).toBe(true);
    expect(isDescendant(tree, "f2", "a1")).toBe(true);
  });

  it("returns false for unrelated or missing targets", () => {
    const tree = [n("f1", { children: [n("a1")] }), n("a2")];
    expect(isDescendant(tree, "f1", "a2")).toBe(false);
    expect(isDescendant(tree, "f1", "missing")).toBe(false);
    expect(isDescendant(tree, "f1", null)).toBe(false);
    expect(isDescendant(tree, "f1", undefined)).toBe(false);
  });
});
