import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import HomePage from "./home-page";

describe("HomePage accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(<HomePage />);
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });
});
