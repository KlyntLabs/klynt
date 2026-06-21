import { run } from "axe-core";
import { beforeEach, describe, expect, it } from "vitest";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import { render } from "@/test/render";
import DesktopEnvironment from "./DesktopEnvironment";

describe("DesktopEnvironment accessibility", () => {
  beforeEach(() => {
    useDesktopStore.setState({ windows: [], activeWindowId: null, cookieDismissed: true });
  });

  it("has no accessibility violations", async () => {
    const { baseElement } = render(<DesktopEnvironment />);
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
