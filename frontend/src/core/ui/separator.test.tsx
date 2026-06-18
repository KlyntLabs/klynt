import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Separator } from "./separator";

describe("Separator", () => {
  it("renders as a decorative separator by default", () => {
    render(<Separator />);
    const separator = screen.getByRole("none");
    expect(separator).toHaveClass("h-[1px]", "w-full");
  });

  it("renders a vertical separator when orientation is vertical", () => {
    render(<Separator orientation="vertical" />);
    expect(screen.getByRole("none")).toHaveClass("h-full", "w-[1px]");
  });

  it("exposes the separator role when decorative is false", () => {
    render(<Separator decorative={false} orientation="vertical" />);
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");
  });
});
