import { screen } from "@testing-library/react";
import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { Switch } from "./switch";

describe("Switch accessibility", () => {
  it("has no accessibility violations when labelled", async () => {
    const { container } = render(
      <>
        <label htmlFor="story-switch">Airplane mode</label>
        <Switch id="story-switch" />
      </>
    );
    expect(await screen.findByRole("switch", { name: "Airplane mode" })).toBeInTheDocument();
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });
});
