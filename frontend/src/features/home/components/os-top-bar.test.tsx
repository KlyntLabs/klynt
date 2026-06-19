import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { routePaths } from "@/core/routing/route-paths";
import { render } from "@/test/render";
import { OsTopBar } from "./os-top-bar";

describe("OsTopBar", () => {
  it("renders the start link and window title", () => {
    render(<OsTopBar windowTitle="klynt-browser.mdx" />);

    expect(screen.getByRole("link", { name: "Klynt" })).toHaveAttribute("href", routePaths.home);
    expect(screen.getByText("klynt-browser.mdx")).toBeInTheDocument();
    expect(screen.getByText(/\d{1,2}:\d{2}/u)).toBeInTheDocument();
  });
});
