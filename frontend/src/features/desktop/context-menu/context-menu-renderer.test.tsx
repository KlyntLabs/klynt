import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as actionRegistry from "./action-registry";
import { ContextMenuRenderer } from "./context-menu-renderer";
import type { ContextMenuSchema } from "./menu-schema";

function createSchema(): ContextMenuSchema {
  return {
    id: "test-menu",
    root: [
      { type: "item", id: "open", label: "Open", action: "app:open" },
      { type: "separator" },
      {
        type: "item",
        id: "delete",
        label: "Delete",
        action: "app:delete",
        disabled: true,
      },
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
            shortcut: "Ctrl+Shift+N",
          },
        ],
      },
    ],
  };
}

const actionContext = {
  target: { kind: "icon", appId: "app-1", desktopId: "desktop-1" } as const,
  tenantSlug: "tenant-1",
};

describe("ContextMenuRenderer", () => {
  it("renders items and separators", () => {
    render(
      <ContextMenuRenderer
        schema={createSchema()}
        actionContext={actionContext}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Open")).toBeVisible();
    expect(screen.getByText("Delete")).toBeVisible();
    expect(screen.getByText("New")).toBeVisible();
    expect(screen.getByText("New Folder")).toBeVisible();
  });

  it("calls executeContextMenuAction and onClose when an item is clicked", async () => {
    const executeSpy = vi
      .spyOn(actionRegistry, "executeContextMenuAction")
      .mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <ContextMenuRenderer
        schema={createSchema()}
        actionContext={actionContext}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText("Open"));

    await vi.waitFor(() => {
      expect(executeSpy).toHaveBeenCalledWith("app:open", actionContext);
    });
    expect(onClose).toHaveBeenCalled();

    executeSpy.mockRestore();
  });

  it("does not call executeContextMenuAction when a disabled item is clicked", () => {
    const executeSpy = vi
      .spyOn(actionRegistry, "executeContextMenuAction")
      .mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <ContextMenuRenderer
        schema={createSchema()}
        actionContext={actionContext}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText("Delete"));

    expect(executeSpy).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    executeSpy.mockRestore();
  });

  it("renders group label and children", () => {
    render(
      <ContextMenuRenderer
        schema={createSchema()}
        actionContext={actionContext}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId("context-menu-group-new")).toBeVisible();
    expect(screen.getByText("New")).toBeVisible();
    expect(screen.getByText("New Folder")).toBeVisible();
    expect(screen.getByText("Ctrl+Shift+N")).toBeVisible();
  });
});
