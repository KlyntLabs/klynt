import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import WindowComponent from "./Window";

const sampleWindow = {
  id: "win-1",
  route: "/",
  title: "Home",
  position: { x: 100, y: 100 },
  size: { width: 400, height: 300 },
  zIndex: 1,
  isMinimized: false,
  isMaximized: false,
  isActive: true,
};

describe("Window accessibility", () => {
  it("has no accessibility violations", async () => {
    const { baseElement } = render(
      <WindowComponent window={sampleWindow}>Window content</WindowComponent>
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
