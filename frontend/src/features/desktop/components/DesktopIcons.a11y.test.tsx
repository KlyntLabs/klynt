import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { marketingDesktopConfig } from "@/features/desktop/factory/marketing-config";
import { render } from "@/test/render";
import DesktopIcons from "./DesktopIcons";

describe("DesktopIcons accessibility", () => {
  it("has no accessibility violations", async () => {
    const { baseElement } = render(<DesktopIcons config={marketingDesktopConfig} />);
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
