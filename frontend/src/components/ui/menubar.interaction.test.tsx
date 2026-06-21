import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "./menubar";

describe("Menubar interactions", () => {
  it("renders the open state", () => {
    render(
      <Menubar defaultValue="file">
        <MenubarMenu value="file">
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>New Tab</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    );
    expect(screen.getByText("New Tab")).toBeInTheDocument();
  });

  it("renders all sub-components and variants", async () => {
    const user = userEvent.setup();
    render(
      <Menubar defaultValue="file">
        <MenubarMenu value="file">
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal>
            <MenubarContent>
              <MenubarLabel inset>Label</MenubarLabel>
              <MenubarGroup>
                <MenubarItem inset>Item</MenubarItem>
                <MenubarItem variant="destructive">Delete</MenubarItem>
              </MenubarGroup>
              <MenubarSeparator />
              <MenubarCheckboxItem checked>Checkbox</MenubarCheckboxItem>
              <MenubarRadioGroup value="one">
                <MenubarRadioItem value="one">One</MenubarRadioItem>
              </MenubarRadioGroup>
              <MenubarSub>
                <MenubarSubTrigger>Sub</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>Sub item</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
              <MenubarItem>
                Shortcut <MenubarShortcut>⌘T</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>
    );
    expect(screen.getByText("Label")).toBeInTheDocument();
    expect(screen.getByText("Item")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Checkbox")).toBeInTheDocument();
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Sub")).toBeInTheDocument();
    expect(screen.getByText("Shortcut")).toBeInTheDocument();
    await user.hover(screen.getByText("Sub"));
    expect(await screen.findByText("Sub item")).toBeInTheDocument();
  });
});
