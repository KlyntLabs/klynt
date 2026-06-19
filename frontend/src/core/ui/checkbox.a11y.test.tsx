import { screen } from "@testing-library/react";
import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { Checkbox } from "./checkbox";
import { Label } from "./label";

describe("Checkbox accessibility", () => {
  it("has no accessibility violations when labelled", async () => {
    const { container } = render(
      <div className="flex items-center space-x-2">
        <Checkbox id="terms" />
        <Label htmlFor="terms">Accept terms and conditions</Label>
      </div>
    );
    expect(await screen.findByRole("checkbox")).toBeInTheDocument();
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });
});
