import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { OsDesktop } from "./os-desktop";

describe("OsDesktop", () => {
  it("renders the top bar, desktop icons, and content", () => {
    render(
      <OsDesktop>
        <p>Hero content</p>
      </OsDesktop>
    );

    const desktopNav = screen.getByRole("navigation", { name: "Desktop apps" });
    expect(desktopNav).toBeInTheDocument();
    expect(within(desktopNav).getByRole("link", { name: "Register" })).toBeInTheDocument();
    expect(screen.getByText("Hero content")).toBeInTheDocument();
  });
});
