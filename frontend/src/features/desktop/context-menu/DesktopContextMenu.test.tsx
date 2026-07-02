import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as actionRegistry from "./action-registry";
import { DesktopContextMenu } from "./DesktopContextMenu";
import type { ContextMenuState } from "./use-desktop-context-menu";

const actionContext = {
  target: { kind: "desktop", desktopId: "desktop-1" } as const,
  tenantSlug: "tenant-1",
};

function renderMenu(state: ContextMenuState, onClose = vi.fn()) {
  return render(
    <DesktopContextMenu state={state} actionContext={actionContext} onClose={onClose} />
  );
}

describe("DesktopContextMenu", () => {
  it("returns null when state is closed", () => {
    renderMenu({ open: false });

    expect(screen.queryByTestId("desktop-context-menu")).not.toBeInTheDocument();
    expect(screen.queryByTestId("context-menu-renderer")).not.toBeInTheDocument();
  });

  it("renders the desktop background menu for desktop target", () => {
    const state: ContextMenuState = {
      open: true,
      x: 100,
      y: 200,
      target: { kind: "desktop", desktopId: "desktop-1" },
    };

    renderMenu(state);

    expect(screen.getByText("Change Background")).toBeVisible();
    expect(screen.getByText("New Folder")).toBeVisible();
    expect(screen.getByTestId("desktop-context-menu")).toHaveStyle({
      left: "100px",
      top: "200px",
    });
  });

  it("renders the desktop icon menu for icon target", () => {
    const state: ContextMenuState = {
      open: true,
      x: 50,
      y: 75,
      target: { kind: "icon", appId: "app-1", desktopId: "desktop-1" },
    };

    renderMenu(state);

    expect(screen.getByText("Open")).toBeVisible();
    expect(screen.getByText("Rename")).toBeVisible();
  });

  it("merges an app content menu when provided", () => {
    const state: ContextMenuState = {
      open: true,
      x: 10,
      y: 20,
      target: { kind: "icon", appId: "app-1", desktopId: "desktop-1" },
      appContentMenu: {
        id: "app-content",
        root: [
          {
            type: "item",
            id: "share",
            label: "Share",
            action: "custom:share",
          },
        ],
      },
    };

    renderMenu(state);

    expect(screen.getByText("Share")).toBeVisible();
  });

  it("calls executeContextMenuAction and onClose when an item is clicked", async () => {
    const executeSpy = vi
      .spyOn(actionRegistry, "executeContextMenuAction")
      .mockResolvedValue(undefined);
    const onClose = vi.fn();

    const state: ContextMenuState = {
      open: true,
      x: 0,
      y: 0,
      target: { kind: "desktop", desktopId: "desktop-1" },
    };

    renderMenu(state, onClose);

    fireEvent.click(screen.getByText("Change Background"));

    await vi.waitFor(() => {
      expect(executeSpy).toHaveBeenCalledWith("desktop:change-background", actionContext);
    });
    expect(onClose).toHaveBeenCalled();

    executeSpy.mockRestore();
  });
});
