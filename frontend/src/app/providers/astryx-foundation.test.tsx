import { Button } from "@astryxdesign/core/Button";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useThemeStore } from "@/core/theme/theme-store";
import { render } from "@/test/render";

/**
 * Foundation smoke test for the Astryx migration (docs/astryx-migration-plan.md, Phase 0).
 *
 * Guards the two things every migrated surface depends on: that Astryx components mount
 * inside AppProviders at all, and that <Theme> is driving color mode. If this fails, no
 * amount of per-surface migration will render correctly.
 */
describe("Astryx foundation", () => {
  it("renders an Astryx component inside the app providers", () => {
    render(<Button label="Save" />);

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("lets Theme own the document root so portalled content resolves tokens", () => {
    render(<Button label="Save" />);

    // The root <Theme> stamps the active theme onto <html>. Nothing else in the app may
    // drive color mode — a second dark-mode provider would desync from this.
    expect(document.documentElement).toHaveAttribute("data-astryx-theme");
  });

  /**
   * The mode was pinned to "light" for the whole migration, because the Tailwind layer had no
   * working dark mode. It is now driven by the theme store, defaulting to "system".
   *
   * Both modes are asserted here because `data-theme` on <html> is what portalled content —
   * dialogs, popovers, toasts, all rendered at <body>, outside the <Theme> wrapper — reads to
   * resolve its light-dark() tokens. If it stops landing, every portal silently follows the OS
   * instead of the app.
   *
   * Only the pinned modes are asserted. Under "system" Astryx resolves the mode through
   * matchMedia, which jsdom only stubs, so the attribute never lands in this environment. That
   * is a limit of the test environment, not of the app — the system path is verified in a real
   * browser, where matchMedia is real.
   */
  it.each(["light", "dark"] as const)("stamps a pinned %s mode onto <html>", (mode) => {
    useThemeStore.getState().setMode(mode);

    render(<Button label="Save" />);

    expect(document.documentElement).toHaveAttribute("data-theme", mode);

    useThemeStore.getState().reset();
  });
});
