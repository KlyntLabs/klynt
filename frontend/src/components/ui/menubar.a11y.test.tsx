import { composeStories } from "@storybook/react";
import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import * as stories from "./menubar.stories";

const composed = composeStories(stories);

describe("Menubar accessibility", () => {
  for (const [storyName, Story] of Object.entries(composed) as [string, React.FC][]) {
    it(`has no accessibility violations (${storyName})`, async () => {
      const { baseElement } = render(<Story />);
      const results = await run(baseElement, {
        rules: {
          // jsdom color-contrast checks are unreliable; contrast is verified in Storybook visually.
          "color-contrast": { enabled: false },
          region: { enabled: false },
          "landmark-one-main": { enabled: false },
          "landmark-unique": { enabled: false },
          "page-has-heading-one": { enabled: false },
        },
      });
      expect(results.violations).toHaveLength(0);
    });
  }
});
