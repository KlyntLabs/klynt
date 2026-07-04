import { act, fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSummary } from "@/features/desktop/api/desktop-apps-api";
import { useIconTreeStore } from "@/features/desktop/desktop-manager/icon-tree-module";
import { useWindowManager } from "@/features/desktop/window-manager/window-module";
import { render } from "@/test/render";
import { DesktopIconGrid } from "./DesktopIconGrid";

const DESKTOP_ID = "d1";
const TENANT_SLUG = "acme";

function createAppSummary(overrides: Partial<AppSummary> = {}): AppSummary {
  return {
    id: "app-1",
    type: "notes",
    title: "Test Note",
    ownerId: null,
    locked: false,
    etag: "etag-1",
    ...overrides,
  };
}

describe("DesktopIconGrid interactions", () => {
  beforeEach(() => {
    act(() => {
      useIconTreeStore.getState().reset();
      useWindowManager.getState().reset();
    });
    vi.restoreAllMocks();
  });

  it("selects an app when clicked", () => {
    const onSelectAppId = vi.fn();
    act(() => useIconTreeStore.getState().setTree(DESKTOP_ID, [{ appId: "app-1", x: 0, y: 0 }]));

    render(
      <DesktopIconGrid
        desktopId={DESKTOP_ID}
        tenantSlug={TENANT_SLUG}
        apps={[createAppSummary()]}
        onOpenContextMenu={vi.fn()}
        selectedAppId={null}
        onSelectAppId={onSelectAppId}
      />
    );

    fireEvent.click(screen.getByTestId("desktop-icon-app-1"));
    expect(onSelectAppId).toHaveBeenCalledWith("app-1");
  });

  it("opens a folder when its icon is double-clicked", () => {
    act(() =>
      useIconTreeStore.getState().setTree(DESKTOP_ID, [
        { appId: "folder-1", x: 0, y: 0, children: [] },
        { appId: "app-1", x: 1, y: 1 },
      ])
    );

    render(
      <DesktopIconGrid
        desktopId={DESKTOP_ID}
        tenantSlug={TENANT_SLUG}
        apps={[
          createAppSummary({ id: "folder-1", type: "folder", title: "Folder" }),
          createAppSummary(),
        ]}
        onOpenContextMenu={vi.fn()}
      />
    );

    fireEvent.doubleClick(screen.getByTestId("desktop-icon-folder-1"));
    expect(useIconTreeStore.getState().openFolderPaths[DESKTOP_ID]).toEqual(["folder-1"]);
  });

  it("opens an app window when its icon is double-clicked", () => {
    act(() => useIconTreeStore.getState().setTree(DESKTOP_ID, [{ appId: "app-1", x: 0, y: 0 }]));

    render(
      <DesktopIconGrid
        desktopId={DESKTOP_ID}
        tenantSlug={TENANT_SLUG}
        apps={[createAppSummary()]}
        onOpenContextMenu={vi.fn()}
      />
    );

    fireEvent.doubleClick(screen.getByTestId("desktop-icon-app-1"));
    const windows = useWindowManager.getState().windows[DESKTOP_ID] ?? [];
    expect(windows).toHaveLength(1);
    expect(windows[0].appId).toBe("app-1");
  });

  it("does not move a locked app into a folder", () => {
    act(() =>
      useIconTreeStore.getState().setTree(DESKTOP_ID, [
        { appId: "folder-1", x: 0, y: 0, children: [] },
        { appId: "locked-app", x: 1, y: 1 },
      ])
    );

    render(
      <DesktopIconGrid
        desktopId={DESKTOP_ID}
        tenantSlug={TENANT_SLUG}
        apps={[
          createAppSummary({ id: "folder-1", type: "folder", title: "Folder" }),
          createAppSummary({ id: "locked-app", title: "Locked", locked: true }),
        ]}
        onOpenContextMenu={vi.fn()}
      />
    );

    fireEvent.drop(screen.getByTestId("desktop-icon-folder-1"), {
      dataTransfer: { getData: () => "locked-app" },
    });

    const folder = useIconTreeStore
      .getState()
      .trees[DESKTOP_ID].find((node) => node.appId === "folder-1");
    expect(folder?.children?.some((child) => child.appId === "locked-app")).toBe(false);
  });
});
