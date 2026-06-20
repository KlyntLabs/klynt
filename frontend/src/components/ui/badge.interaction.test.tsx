import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";

describe("Badge interactions", () => {
  it.each([
    "default",
    "secondary",
    "destructive",
    "outline",
  ] as const)("renders %s badge", (variant) => {
    render(<Badge variant={variant}>{variant}</Badge>);
    expect(screen.getByText(variant)).toBeInTheDocument();
  });

  it("renders badge as child", () => {
    render(
      <Badge asChild>
        <a href="/">Link badge</a>
      </Badge>
    );
    expect(screen.getByText("Link badge")).toBeInTheDocument();
  });
});
