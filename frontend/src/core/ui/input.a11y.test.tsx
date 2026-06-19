import { screen } from "@testing-library/react";
import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { Input } from "./input";
import { Label } from "./label";

describe("Input accessibility", () => {
  it("has no accessibility violations when labelled", async () => {
    const { container } = render(
      <>
        <Label htmlFor="email">Email</Label>
        <Input id="email" hasError />
      </>
    );
    expect(await screen.findByLabelText("Email")).toBeInTheDocument();
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });
});
