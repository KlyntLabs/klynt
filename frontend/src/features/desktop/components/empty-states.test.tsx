import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FolderRenderer } from "@/features/desktop/apps/renderers/folder-renderer";
import { VideoRenderer } from "@/features/desktop/apps/renderers/video-renderer";
import { ContextMenuRenderer } from "@/features/desktop/context-menu/context-menu-renderer";
import { MenuEditor } from "@/features/desktop/context-menu/menu-editor";
import type { ContextMenuSchema } from "@/features/desktop/context-menu/menu-schema";
import { useIconTreeStore } from "@/features/desktop/desktop-manager/icon-tree-module";
import { render } from "@/test/render";
import { DesktopIconGrid } from "./DesktopIconGrid";

const DESKTOP_ID = "test-desktop";
const TENANT_SLUG = "test-tenant";

function createEmptyMenuSchema(): ContextMenuSchema {
  return {
    id: "empty-menu",
    root: [],
  };
}

describe("Desktop empty states", () => {
  it("DesktopIconGrid renders an empty state when the current folder has no icons", () => {
    useIconTreeStore.getState().reset();

    render(
      <DesktopIconGrid
        desktopId={DESKTOP_ID}
        tenantSlug={TENANT_SLUG}
        apps={[]}
        onOpenContextMenu={vi.fn()}
      />
    );

    expect(screen.getByTestId("desktop-empty-grid")).toHaveTextContent("No icons on this desktop.");
  });

  it("FolderRenderer renders an empty state when the folder has no children", () => {
    render(<FolderRenderer content={{}} items={[]} />);

    expect(screen.getByTestId("folder-empty-state")).toHaveTextContent("This folder is empty");
  });

  it("VideoRenderer renders an empty state when no valid URL is provided", () => {
    render(<VideoRenderer content={{}} readOnly />);

    expect(screen.getByTestId("video-empty-state")).toHaveTextContent("No valid video URL");
  });

  it("ContextMenuRenderer renders an empty state when the schema root is empty", () => {
    render(
      <ContextMenuRenderer
        schema={createEmptyMenuSchema()}
        actionContext={{
          target: { kind: "desktop", desktopId: DESKTOP_ID },
          tenantSlug: TENANT_SLUG,
        }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId("context-menu-empty-state")).toHaveTextContent("No menu items");
  });

  it("MenuEditor renders an empty state when the schema root is empty", () => {
    render(<MenuEditor schema={createEmptyMenuSchema()} onChange={vi.fn()} />);

    expect(screen.getByTestId("menu-editor-empty-state")).toHaveTextContent(
      "No menu items to edit"
    );
  });
});
