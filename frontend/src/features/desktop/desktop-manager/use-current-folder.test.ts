import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type IconTreeNode, useIconTreeStore } from "./icon-tree-module";
import { useCurrentFolderContents } from "./use-current-folder";

const n = (appId: string, overrides: Partial<IconTreeNode> = {}): IconTreeNode => ({
  appId,
  x: 0,
  y: 0,
  ...overrides,
});

describe("useCurrentFolderContents", () => {
  beforeEach(() => {
    act(() => useIconTreeStore.getState().reset());
  });

  afterEach(() => {
    act(() => useIconTreeStore.getState().reset());
  });

  it("returns root nodes when the folder path is empty", () => {
    const tree = [n("a1"), n("f1", { children: [n("a2")] })];
    act(() => useIconTreeStore.getState().setTree("d1", tree));

    const { result } = renderHook(() => useCurrentFolderContents("d1"));

    expect(result.current.path).toEqual([]);
    expect(result.current.currentNodes).toEqual(tree);
  });

  it("returns the children of the folder at the end of the path", () => {
    const tree = [n("f1", { children: [n("f2", { children: [n("a1")] }), n("a2")] })];
    act(() => useIconTreeStore.getState().setTree("d1", tree));
    act(() => {
      useIconTreeStore.getState().openFolder("d1", "f1");
      useIconTreeStore.getState().openFolder("d1", "f2");
    });

    const { result } = renderHook(() => useCurrentFolderContents("d1"));

    expect(result.current.path).toEqual(["f1", "f2"]);
    expect(result.current.currentNodes).toEqual([n("a1")]);
  });

  it("falls back to the root nodes when a path segment is missing", () => {
    const tree = [n("f1", { children: [n("a1")] })];
    act(() => useIconTreeStore.getState().setTree("d1", tree));
    act(() => {
      useIconTreeStore.getState().openFolder("d1", "f1");
      useIconTreeStore.getState().openFolder("d1", "missing");
    });

    const { result } = renderHook(() => useCurrentFolderContents("d1"));

    expect(result.current.path).toEqual(["f1", "missing"]);
    expect(result.current.currentNodes).toEqual(tree);
  });

  it("exposes navigation callbacks bound to the desktop id", () => {
    const tree = [n("f1", { children: [n("f2", { children: [] })] })];
    act(() => useIconTreeStore.getState().setTree("d1", tree));

    const { result } = renderHook(() => useCurrentFolderContents("d1"));

    act(() => result.current.openFolder("f1"));
    expect(useIconTreeStore.getState().openFolderPaths.d1).toEqual(["f1"]);

    act(() => result.current.openFolder("f2"));
    expect(useIconTreeStore.getState().openFolderPaths.d1).toEqual(["f1", "f2"]);

    act(() => result.current.closeFolder());
    expect(useIconTreeStore.getState().openFolderPaths.d1).toEqual(["f1"]);

    act(() => result.current.navigateToIndex(0));
    expect(useIconTreeStore.getState().openFolderPaths.d1).toEqual(["f1"]);

    act(() => result.current.navigateToRoot());
    expect(useIconTreeStore.getState().openFolderPaths.d1).toEqual([]);
  });
});
