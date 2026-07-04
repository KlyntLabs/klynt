import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { IconTreeNode } from "@/features/desktop/desktop-manager/icon-tree-module";
import { render } from "@/test/render";
import { FolderRenderer } from "./folder-renderer";

const appChild: IconTreeNode = {
  appId: "app-1",
  x: 0,
  y: 0,
  title: "My App",
};

const folderChild: IconTreeNode = {
  appId: "folder-1",
  x: 1,
  y: 0,
  title: "My Folder",
  children: [
    {
      appId: "nested-app",
      x: 0,
      y: 0,
    },
  ],
};

const children: IconTreeNode[] = [appChild, folderChild];

describe("FolderRenderer", () => {
  it("renders labels for each child", () => {
    render(<FolderRenderer content={{}} items={children} />);

    expect(screen.getByTestId("folder-item-app-1")).toHaveTextContent("My App");
    expect(screen.getByTestId("folder-item-folder-1")).toHaveTextContent("My Folder");
  });

  it("falls back to appId when title is missing", () => {
    const childWithoutTitle: IconTreeNode = {
      appId: "no-title",
      x: 0,
      y: 0,
    };

    render(<FolderRenderer content={{}} items={[childWithoutTitle]} />);

    expect(screen.getByTestId("folder-item-no-title")).toHaveTextContent("no-title");
  });

  it("calls onOpenApp when an app child is clicked", async () => {
    const user = userEvent.setup();
    const onOpenApp = vi.fn();
    const onOpenFolder = vi.fn();

    render(
      <FolderRenderer
        content={{}}
        items={children}
        onOpenApp={onOpenApp}
        onOpenFolder={onOpenFolder}
      />
    );

    await user.click(screen.getByTestId("folder-item-app-1"));

    expect(onOpenApp).toHaveBeenCalledWith("app-1");
    expect(onOpenFolder).not.toHaveBeenCalled();
  });

  it("calls onOpenFolder when a folder child is clicked", async () => {
    const user = userEvent.setup();
    const onOpenApp = vi.fn();
    const onOpenFolder = vi.fn();

    render(
      <FolderRenderer
        content={{}}
        items={children}
        onOpenApp={onOpenApp}
        onOpenFolder={onOpenFolder}
      />
    );

    await user.click(screen.getByTestId("folder-item-folder-1"));

    expect(onOpenFolder).toHaveBeenCalledWith("folder-1");
    expect(onOpenApp).not.toHaveBeenCalled();
  });

  it("renders an empty state when items is empty", () => {
    render(<FolderRenderer content={{}} items={[]} />);

    expect(screen.getByTestId("folder-empty-state")).toHaveTextContent("This folder is empty");
  });

  it("does not call click handlers when readOnly is true", async () => {
    const user = userEvent.setup();
    const onOpenApp = vi.fn();
    const onOpenFolder = vi.fn();

    render(
      <FolderRenderer
        content={{}}
        items={children}
        readOnly
        onOpenApp={onOpenApp}
        onOpenFolder={onOpenFolder}
      />
    );

    await user.click(screen.getByTestId("folder-item-app-1"));
    await user.click(screen.getByTestId("folder-item-folder-1"));

    expect(onOpenApp).not.toHaveBeenCalled();
    expect(onOpenFolder).not.toHaveBeenCalled();
  });

  it("uses content.icon when provided", () => {
    render(<FolderRenderer content={{ icon: "🚀" }} items={[appChild]} />);

    expect(screen.getByTestId("folder-item-app-1")).toHaveTextContent("🚀");
  });
});
