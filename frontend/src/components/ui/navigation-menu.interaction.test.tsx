import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./navigation-menu";

describe("NavigationMenu interactions", () => {
  it("renders the open state", () => {
    render(
      <NavigationMenu defaultValue="getting-started">
        <NavigationMenuList>
          <NavigationMenuItem value="getting-started">
            <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink>Introduction</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    );
    expect(screen.getByText("Introduction")).toBeInTheDocument();
  });

  it("renders without viewport and with indicator", () => {
    render(
      <NavigationMenu defaultValue="item" viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem value="item">
            <NavigationMenuTrigger>Item</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink>Link</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
        <NavigationMenuIndicator />
      </NavigationMenu>
    );
    expect(screen.getByText("Link")).toBeInTheDocument();
  });
});
