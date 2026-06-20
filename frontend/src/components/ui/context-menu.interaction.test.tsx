import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./context-menu";

describe("ContextMenu interactions", () => {
  it("renders the open state with basic items", () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Right click</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Copy</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
    fireEvent.contextMenu(screen.getByText("Right click"));
    expect(screen.getByText("Copy")).toBeInTheDocument();
  });

  it("renders all sub-components and variants", () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Right click</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuLabel inset>Label</ContextMenuLabel>
            <ContextMenuGroup>
              <ContextMenuItem inset>Item</ContextMenuItem>
              <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
            </ContextMenuGroup>
            <ContextMenuSeparator />
            <ContextMenuCheckboxItem checked>Checkbox</ContextMenuCheckboxItem>
            <ContextMenuRadioGroup value="one">
              <ContextMenuRadioItem value="one">One</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
            <ContextMenuSub open>
              <ContextMenuSubTrigger>Sub</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Sub item</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuItem>
              Shortcut <ContextMenuShortcut>⌘C</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>
    );
    fireEvent.contextMenu(screen.getByText("Right click"));
    expect(screen.getByText("Label")).toBeInTheDocument();
    expect(screen.getByText("Item")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Checkbox")).toBeInTheDocument();
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Sub")).toBeInTheDocument();
    expect(screen.getByText("Sub item")).toBeInTheDocument();
    expect(screen.getByText("Shortcut")).toBeInTheDocument();
  });
});
