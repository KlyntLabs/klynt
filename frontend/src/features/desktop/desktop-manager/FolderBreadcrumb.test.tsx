import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { FolderBreadcrumb } from "./FolderBreadcrumb";
import { type IconTreeNode, useIconTreeStore } from "./icon-tree-module";

const n = (appId: string, overrides: Partial<IconTreeNode> = {}): IconTreeNode => ({
  appId,
  x: 0,
  y: 0,
  ...overrides,
});

describe("FolderBreadcrumb", () => {
  beforeEach(() => {
    act(() => useIconTreeStore.getState().reset());
  });

  afterEach(() => {
    act(() => useIconTreeStore.getState().reset());
  });

  it("shows Home only when the folder path is empty", () => {
    render(<FolderBreadcrumb desktopId="d1" />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.queryByText("Folder")).not.toBeInTheDocument();
  });

  it("renders Home and each folder in the path", () => {
    act(() => {
      useIconTreeStore
        .getState()
        .setTree("d1", [n("f1", { children: [n("f2", { children: [] })] })]);
      useIconTreeStore.getState().openFolder("d1", "f1");
      useIconTreeStore.getState().openFolder("d1", "f2");
    });

    render(<FolderBreadcrumb desktopId="d1" titleMap={{ f1: "Folder A", f2: "Folder B" }} />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Folder A")).toBeInTheDocument();
    expect(screen.getByText("Folder B")).toBeInTheDocument();
  });

  it("navigates to root when Home is clicked", async () => {
    const user = userEvent.setup();
    act(() => {
      useIconTreeStore.getState().setTree("d1", [n("f1", { children: [] })]);
      useIconTreeStore.getState().openFolder("d1", "f1");
    });

    render(<FolderBreadcrumb desktopId="d1" titleMap={{ f1: "Folder A" }} />);

    await user.click(screen.getByRole("button", { name: "Home" }));

    expect(useIconTreeStore.getState().openFolderPaths.d1).toEqual([]);
  });

  it("truncates the path to the clicked folder index", async () => {
    const user = userEvent.setup();
    act(() => {
      useIconTreeStore
        .getState()
        .setTree("d1", [
          n("f1", { children: [n("f2", { children: [n("f3", { children: [] })] })] }),
        ]);
      useIconTreeStore.getState().openFolder("d1", "f1");
      useIconTreeStore.getState().openFolder("d1", "f2");
      useIconTreeStore.getState().openFolder("d1", "f3");
    });

    render(
      <FolderBreadcrumb
        desktopId="d1"
        titleMap={{ f1: "Folder A", f2: "Folder B", f3: "Folder C" }}
      />
    );

    await user.click(screen.getByRole("button", { name: "Folder B" }));

    expect(useIconTreeStore.getState().openFolderPaths.d1).toEqual(["f1", "f2"]);
  });

  it("falls back to Folder when a title is missing from the map", () => {
    act(() => {
      useIconTreeStore.getState().setTree("d1", [n("f1", { children: [] })]);
      useIconTreeStore.getState().openFolder("d1", "f1");
    });

    render(<FolderBreadcrumb desktopId="d1" titleMap={{}} />);

    expect(screen.getByText("Folder")).toBeInTheDocument();
  });
});
