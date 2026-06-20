import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import CookieBanner from "./CookieBanner";

describe("CookieBanner accessibility", () => {
  it("has no accessibility violations", async () => {
    const { baseElement } = render(<CookieBanner />);
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
