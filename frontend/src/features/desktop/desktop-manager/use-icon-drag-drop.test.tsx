import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type IconTreeNode, useIconTreeStore } from "./icon-tree-module";
import { type UseIconDragDropResult, useIconDragDrop } from "./use-icon-drag-drop";

class DataTransferStub implements DataTransfer {
  _store: Record<string, string> = {};

  dropEffect: DataTransfer["dropEffect"] = "none";
  effectAllowed: DataTransfer["effectAllowed"] = "uninitialized";

  get types(): string[] {
    return Object.keys(this._store);
  }

  get files(): FileList {
    return [] as unknown as FileList;
  }

  get items(): DataTransferItemList {
    return [] as unknown as DataTransferItemList;
  }

  clearData(format?: string): void {
    if (format === undefined) {
      this._store = {};
      return;
    }
    delete this._store[format];
  }

  getData(format: string): string {
    return this._store[format] ?? "";
  }

  setData(format: string, data: string): void {
    this._store[format] = data;
  }

  setDragImage(): void {}
}

(globalThis as Record<string, unknown>).DataTransfer = DataTransferStub;

function buildTree(): IconTreeNode[] {
  return [
    { appId: "app-1", x: 0, y: 0 },
    { appId: "folder-1", x: 10, y: 10, children: [] },
  ];
}

function renderDragSource(result: UseIconDragDropResult, appId: string) {
  const props = result.bindDrag(appId);
  render(<div data-testid="icon" {...props} />);
  return { props, element: screen.getByTestId("icon") };
}

function renderDropZone(result: UseIconDragDropResult, zoneId: "desktop" | string) {
  const zone: Parameters<UseIconDragDropResult["bindDrop"]>[0] =
    zoneId === "desktop" ? "desktop" : { folderId: zoneId };
  const props = result.bindDrop(zone);
  render(<div data-testid={`zone-${zoneId}`} {...props} />);
  return { props, element: screen.getByTestId(`zone-${zoneId}`) };
}

function createDataTransfer(appId?: string): DataTransfer {
  const dataTransfer = new DataTransfer();
  if (appId) {
    dataTransfer.setData("text/plain", appId);
  }
  return dataTransfer;
}

describe("useIconDragDrop", () => {
  beforeEach(() => {
    act(() => useIconTreeStore.getState().reset());
  });

  afterEach(() => {
    cleanup();
    act(() => useIconTreeStore.getState().reset());
  });

  it("returns draggable bindings and tracks draggingId on drag start", () => {
    const onMove = vi.fn();
    const { result } = renderHook(() => useIconDragDrop({ desktopId: "d1", onMove }));

    const { props, element } = renderDragSource(result.current, "app-1");

    expect(props.draggable).toBe(true);
    expect(result.current.draggingId).toBeNull();

    const dataTransfer = createDataTransfer();
    fireEvent.dragStart(element, { dataTransfer });

    expect(result.current.draggingId).toBe("app-1");
    expect(dataTransfer.getData("text/plain")).toBe("app-1");
  });

  it("clears draggingId on drag end", () => {
    const { result } = renderHook(() => useIconDragDrop({ desktopId: "d1" }));
    const { element } = renderDragSource(result.current, "app-1");

    fireEvent.dragStart(element, { dataTransfer: createDataTransfer() });
    expect(result.current.draggingId).toBe("app-1");

    fireEvent.dragEnd(element);
    expect(result.current.draggingId).toBeNull();
  });

  it("calls onMove with null parent when dropping on the desktop zone", () => {
    const onMove = vi.fn();
    const { result } = renderHook(() => useIconDragDrop({ desktopId: "d1", onMove }));
    const { element: icon } = renderDragSource(result.current, "app-1");
    const { element: desktopZone } = renderDropZone(result.current, "desktop");

    fireEvent.dragStart(icon, { dataTransfer: createDataTransfer() });
    fireEvent.dragOver(desktopZone);

    const dataTransfer = createDataTransfer("app-1");
    fireEvent.drop(desktopZone, { dataTransfer });

    expect(onMove).toHaveBeenCalledWith("app-1", null);
    expect(result.current.dropTargetId).toBeNull();
    expect(result.current.draggingId).toBeNull();
  });

  it("calls onMove with folderId when dropping on a folder zone", () => {
    const onMove = vi.fn();
    const { result } = renderHook(() => useIconDragDrop({ desktopId: "d1", onMove }));
    const { element: icon } = renderDragSource(result.current, "app-1");
    const { element: folderZone } = renderDropZone(result.current, "folder-1");

    fireEvent.dragStart(icon, { dataTransfer: createDataTransfer() });
    fireEvent.dragOver(folderZone);

    const dataTransfer = createDataTransfer("app-1");
    fireEvent.drop(folderZone, { dataTransfer });

    expect(onMove).toHaveBeenCalledWith("app-1", "folder-1");
    expect(result.current.dropTargetId).toBeNull();
    expect(result.current.draggingId).toBeNull();
  });

  it("tracks dropTargetId through drag over and drag leave", () => {
    const { result } = renderHook(() => useIconDragDrop({ desktopId: "d1" }));
    const { element: desktopZone } = renderDropZone(result.current, "desktop");
    const { element: folderZone } = renderDropZone(result.current, "folder-1");

    expect(result.current.dropTargetId).toBeNull();

    fireEvent.dragOver(desktopZone);
    expect(result.current.dropTargetId).toBe("desktop");

    fireEvent.dragLeave(desktopZone);
    expect(result.current.dropTargetId).toBeNull();

    fireEvent.dragOver(folderZone);
    expect(result.current.dropTargetId).toBe("folder-1");

    fireEvent.dragLeave(folderZone);
    expect(result.current.dropTargetId).toBeNull();
  });

  it("clears target state when dropping without an app id", () => {
    const onMove = vi.fn();
    const { result } = renderHook(() => useIconDragDrop({ desktopId: "d1", onMove }));
    const { element: icon } = renderDragSource(result.current, "app-1");
    const { element: desktopZone } = renderDropZone(result.current, "desktop");

    fireEvent.dragStart(icon, { dataTransfer: createDataTransfer() });
    fireEvent.dragOver(desktopZone);
    expect(result.current.dropTargetId).toBe("desktop");

    fireEvent.drop(desktopZone, { dataTransfer: createDataTransfer() });

    expect(onMove).not.toHaveBeenCalled();
    expect(result.current.dropTargetId).toBeNull();
  });

  it("clears state when async onMove rejects", async () => {
    const onMove = vi.fn().mockRejectedValue(new Error("move failed"));
    const { result } = renderHook(() => useIconDragDrop({ desktopId: "d1", onMove }));
    const { element: icon } = renderDragSource(result.current, "app-1");
    const { element: desktopZone } = renderDropZone(result.current, "desktop");

    fireEvent.dragStart(icon, { dataTransfer: createDataTransfer() });
    fireEvent.drop(desktopZone, { dataTransfer: createDataTransfer("app-1") });

    await vi.waitFor(() => {
      expect(result.current.draggingId).toBeNull();
      expect(result.current.dropTargetId).toBeNull();
    });
  });

  it("falls back to the icon tree store when onMove is omitted", () => {
    act(() => useIconTreeStore.getState().setTree("d1", buildTree()));

    const { result } = renderHook(() => useIconDragDrop({ desktopId: "d1" }));
    renderDragSource(result.current, "app-1");
    const { element: folderZone } = renderDropZone(result.current, "folder-1");

    const dataTransfer = createDataTransfer("app-1");
    fireEvent.drop(folderZone, { dataTransfer });

    const tree = useIconTreeStore.getState().trees.d1;
    const folder = tree.find((node) => node.appId === "folder-1");
    expect(folder?.children?.some((child) => child.appId === "app-1")).toBe(true);
    expect(tree.some((node) => node.appId === "app-1")).toBe(false);
    expect(result.current.draggingId).toBeNull();
    expect(result.current.dropTargetId).toBeNull();
  });
});
