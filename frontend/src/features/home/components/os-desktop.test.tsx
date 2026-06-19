import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { OsDesktop } from "./os-desktop";

describe("OsDesktop", () => {
  it("renders the top bar, desktop icons, and content", () => {
    render(
      <OsDesktop windowTitle="klynt-browser.mdx">
        <p>Hero content</p>
      </OsDesktop>
    );

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register" })).toBeInTheDocument();
    expect(screen.getByText("Hero content")).toBeInTheDocument();
  });
});
