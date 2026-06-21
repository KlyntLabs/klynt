import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./popover";

describe("Popover interactions", () => {
  it("renders the open state", () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Popover content</PopoverContent>
      </Popover>
    );
    expect(screen.getByText("Popover content")).toBeInTheDocument();
  });

  it("renders with anchor", () => {
    render(
      <Popover defaultOpen>
        <PopoverAnchor>Anchor</PopoverAnchor>
        <PopoverContent>Popover content</PopoverContent>
      </Popover>
    );
    expect(screen.getByText("Anchor")).toBeInTheDocument();
    expect(screen.getByText("Popover content")).toBeInTheDocument();
  });
});
