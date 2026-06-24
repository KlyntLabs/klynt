import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import WindowComponent from "./Window";

const sampleWindow = {
  id: "win-1",
  appId: "home",
  x: 100,
  y: 100,
  width: 400,
  height: 300,
  zIndex: 1,
  state: "normal" as const,
};

describe("Window accessibility", () => {
  it("has no accessibility violations", async () => {
    const { baseElement } = render(
      <WindowComponent desktopId="test" window={sampleWindow} title="Home">
        Window content
      </WindowComponent>
    );
    const results = await run(baseElement, {
      rules: {
        "color-contrast": { enabled: false },
        region: { enabled: false },
        "landmark-one-main": { enabled: false },
        "landmark-unique": { enabled: false },
        "page-has-heading-one": { enabled: false },
      },
    });
    expect(results.violations).toHaveLength(0);
  });
});
