import { screen } from "@testing-library/react";
import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { Label } from "./label";
import { Textarea } from "./textarea";

describe("Textarea accessibility", () => {
  it("has no accessibility violations when labelled", async () => {
    const { container } = render(
      <>
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" hasError />
      </>
    );
    expect(await screen.findByLabelText("Message")).toBeInTheDocument();
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });
});
