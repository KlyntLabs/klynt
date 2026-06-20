import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button interactions", () => {
  it("renders button as child", () => {
    render(
      <Button asChild>
        <a href="/">Link button</a>
      </Button>
    );
    expect(screen.getByText("Link button")).toBeInTheDocument();
  });

  it.each(["sm", "lg", "icon", "icon-sm", "icon-lg"] as const)("renders %s button", (size) => {
    render(<Button size={size}>Size</Button>);
    expect(screen.getByText("Size")).toBeInTheDocument();
  });
});
