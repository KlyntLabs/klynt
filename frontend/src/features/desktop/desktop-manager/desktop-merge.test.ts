import { describe, expect, it } from "vitest";
import { type MergedNode, mergeDesktop } from "./desktop-merge";
import type { IconTreeNode } from "./icon-tree-module";

const n = (appId: string, overrides: Partial<IconTreeNode> = {}): IconTreeNode => ({
  appId,
  x: 0,
  y: 0,
  ...overrides,
});

function findNode(tree: MergedNode[], appId: string): MergedNode | undefined {
  for (const node of tree) {
    if (node.appId === appId) {
      return node;
    }
    if (node.children) {
      const found = findNode(node.children as MergedNode[], appId);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

describe("mergeDesktop", () => {
  it("preserves shared-only tree with shared source and locked when canEditShared is false", () => {
    const result = mergeDesktop({
      shared: [n("app1"), n("app2")],
      overlay: [],
      knownAppIds: new Set(["app1", "app2"]),
      canEditShared: false,
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      appId: "app1",
      source: "shared",
      locked: true,
      editable: false,
    });
    expect(result[1]).toMatchObject({
      appId: "app2",
      source: "shared",
      locked: true,
      editable: false,
    });
  });

  it("marks shared nodes editable when canEditShared is true", () => {
    const result = mergeDesktop({
      shared: [n("app1")],
      overlay: [],
      knownAppIds: new Set(["app1"]),
      canEditShared: true,
    });

    expect(result[0]).toMatchObject({
      source: "shared",
      locked: false,
      editable: true,
    });
  });

  it("includes overlay-only nodes with overlay source and editable", () => {
    const result = mergeDesktop({
      shared: [n("app1")],
      overlay: [n("app2", { x: 10, y: 10 })],
      knownAppIds: new Set(["app1", "app2"]),
    });

    expect(findNode(result, "app2")).toMatchObject({
      appId: "app2",
      x: 10,
      y: 10,
      source: "overlay",
      locked: false,
      editable: true,
    });
  });

  it("overlay wins for position and children when app exists in both", () => {
    const result = mergeDesktop({
      shared: [
        n("folder", {
          x: 0,
          y: 0,
          children: [n("app1", { x: 0, y: 0 })],
        }),
      ],
      overlay: [
        n("folder", {
          x: 99,
          y: 99,
          children: [n("app1", { x: 88, y: 88, parentIdSnapshot: "folder" })],
        }),
      ],
      knownAppIds: new Set(["folder", "app1"]),
    });

    const folder = findNode(result, "folder");
    expect(folder).toMatchObject({
      x: 99,
      y: 99,
      source: "overlay",
      locked: false,
      editable: true,
    });
    expect(folder?.children).toHaveLength(1);
    expect(folder?.children?.[0]).toMatchObject({
      appId: "app1",
      x: 88,
      y: 88,
      source: "overlay",
    });
  });

  it("skips orphan nodes not in knownAppIds", () => {
    const result = mergeDesktop({
      shared: [n("known"), n("unknown")],
      overlay: [],
      knownAppIds: new Set(["known"]),
    });

    expect(result).toHaveLength(1);
    expect(findNode(result, "unknown")).toBeUndefined();
  });

  it("filters shared children that are not known", () => {
    const result = mergeDesktop({
      shared: [
        n("folder", {
          children: [n("known"), n("unknown")],
        }),
      ],
      overlay: [],
      knownAppIds: new Set(["folder", "known"]),
    });

    const folder = findNode(result, "folder");
    expect(folder?.children).toHaveLength(1);
    expect(folder?.children?.[0].appId).toBe("known");
  });

  it("detects stale override when overlay parentIdSnapshot differs from shared parent", () => {
    const result = mergeDesktop({
      shared: [n("folder1", { children: [n("app1")] }), n("folder2")],
      overlay: [n("app1", { parentIdSnapshot: "folder2" })],
      knownAppIds: new Set(["folder1", "folder2", "app1"]),
      folderAppIds: new Set(["folder1", "folder2"]),
    });

    const app1 = findNode(result, "app1");
    expect(app1?.stale).toBe(true);

    const folder2 = findNode(result, "folder2");
    expect(folder2?.children?.some((child) => child.appId === "app1")).toBe(true);
  });

  it("promotes self-referencing parent to root", () => {
    const result = mergeDesktop({
      shared: [],
      overlay: [n("app1", { parentIdSnapshot: "app1" })],
      knownAppIds: new Set(["app1"]),
    });

    expect(result).toHaveLength(1);
    expect(result[0].appId).toBe("app1");
    expect(result[0].children).toBeUndefined();
  });

  it("breaks mutual parent cycles and keeps all nodes", () => {
    const result = mergeDesktop({
      shared: [n("app1"), n("app2")],
      overlay: [n("app1", { parentIdSnapshot: "app2" }), n("app2", { parentIdSnapshot: "app1" })],
      knownAppIds: new Set(["app1", "app2"]),
    });

    expect(result).toHaveLength(1);
    expect(findNode(result, "app1")).toBeDefined();
    expect(findNode(result, "app2")).toBeDefined();
  });

  it("merges mixed root and nested overlay nodes", () => {
    const result = mergeDesktop({
      shared: [
        n("app1"),
        n("folder", {
          children: [n("app2")],
        }),
      ],
      overlay: [n("app3", { parentIdSnapshot: "folder" })],
      knownAppIds: new Set(["app1", "folder", "app2", "app3"]),
      folderAppIds: new Set(["folder"]),
    });

    expect(result).toHaveLength(2);

    const folder = findNode(result, "folder");
    expect(folder?.children).toHaveLength(2);
    expect(folder?.children?.map((child) => child.appId)).toContain("app2");
    expect(folder?.children?.map((child) => child.appId)).toContain("app3");

    expect(findNode(result, "app3")).toMatchObject({
      source: "overlay",
      locked: false,
      editable: true,
    });
  });

  it("falls back to root when effective parent is not a folder", () => {
    const result = mergeDesktop({
      shared: [n("app1"), n("app2", { children: [n("app3")] })],
      overlay: [n("app1", { parentIdSnapshot: "app2" })],
      knownAppIds: new Set(["app1", "app2", "app3"]),
      folderAppIds: new Set([]),
    });

    expect(result).toHaveLength(3);
    expect(findNode(result, "app1")).toBeDefined();
  });
});
