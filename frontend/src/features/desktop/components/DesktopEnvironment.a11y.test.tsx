import { run } from "axe-core";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestConfig, resetDesktopStore } from "@/features/desktop/test-helpers";
import { render } from "@/test/render";
import DesktopEnvironment from "./DesktopEnvironment";

const config = createTestConfig();

describe("DesktopEnvironment accessibility", () => {
  beforeEach(() => {
    resetDesktopStore();
  });

  it("has no accessibility violations", async () => {
    const { baseElement } = render(<DesktopEnvironment config={config} />);
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
