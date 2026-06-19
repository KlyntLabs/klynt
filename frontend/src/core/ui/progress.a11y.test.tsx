import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { Progress } from "./progress";

describe("Progress accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(<Progress value={45} aria-label="Course completion" />);
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });
});
