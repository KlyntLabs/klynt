import { Button } from "@astryxdesign/core/Button";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

  it("pins light mode while the legacy layer has no dark mode", () => {
    render(<Button label="Save" />);

    // The shadcn layer never applies `.dark`, so the app is light-only. Until a real theme
    // control exists, Theme must not follow the OS — on a dark-mode machine, mode="system"
    // would render Astryx components dark inside a light app.
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });
});
