import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "./item";

describe("Item interactions", () => {
  it("renders item with all sub-components", () => {
    render(
      <ItemGroup>
        <Item>
          <ItemMedia variant="icon">I</ItemMedia>
          <ItemContent>
            <ItemHeader>
              <ItemTitle>Title</ItemTitle>
              <ItemActions>Actions</ItemActions>
            </ItemHeader>
            <ItemDescription>Description</ItemDescription>
            <ItemFooter>Footer</ItemFooter>
          </ItemContent>
        </Item>
        <ItemSeparator />
      </ItemGroup>
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("renders item variants and sizes", () => {
    render(
      <ItemGroup>
        <Item variant="outline" size="sm" data-testid="outline-sm">
          Outline sm
        </Item>
        <Item variant="muted" data-testid="muted">
          Muted
        </Item>
      </ItemGroup>
    );
    expect(screen.getByTestId("outline-sm")).toHaveTextContent("Outline sm");
    expect(screen.getByTestId("muted")).toHaveTextContent("Muted");
  });

  it("renders item with asChild", () => {
    render(
      <Item asChild>
        <a href="/">Link item</a>
      </Item>
    );
    expect(screen.getByText("Link item")).toBeInTheDocument();
  });

  it("renders media variants", () => {
    render(
      <ItemGroup>
        <Item>
          <ItemMedia variant="image">
            <img src="" alt="Avatar" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Image</ItemTitle>
          </ItemContent>
        </Item>
      </ItemGroup>
    );
    expect(screen.getByAltText("Avatar")).toBeInTheDocument();
    expect(screen.getByText("Image")).toBeInTheDocument();
  });
});
