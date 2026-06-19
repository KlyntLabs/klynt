import { screen } from "@testing-library/react";
import { run } from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import { Label } from "./label";
import { Slider } from "./slider";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("Slider accessibility", () => {
  it("has no accessibility violations when labelled", async () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    const { container } = render(
      <>
        <Label htmlFor="volume">Volume</Label>
        <Slider id="volume" defaultValue={[50]} max={100} step={1} thumbLabel="Volume" />
      </>
    );

    expect(await screen.findByRole("slider", { name: "Volume" })).toBeInTheDocument();

    const results = await run(container);
    expect(results.violations).toHaveLength(0);

    vi.unstubAllGlobals();
  });
});
