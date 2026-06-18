import { render } from "@/test/render";
import { screen } from "@testing-library/react";
import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { Input } from "./input";
import { Label } from "./label";

describe("Label accessibility", () => {
  it("has no accessibility violations and associates with input", async () => {
    const { container } = render(
      <>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" />
      </>
    );
    expect(await screen.findByLabelText("Full name")).toBeInTheDocument();
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });
});
