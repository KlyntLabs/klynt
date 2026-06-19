import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { OsWindow } from "./os-window";

describe("OsWindow", () => {
  it("renders the title bar and content", () => {
    render(<OsWindow title="klynt-browser.mdx">Hello Klynt</OsWindow>);

    expect(screen.getByText("klynt-browser.mdx")).toBeInTheDocument();
    expect(screen.getByText("Hello Klynt")).toBeInTheDocument();
  });
});
