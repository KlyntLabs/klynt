import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { OsTopBar } from "./os-top-bar";

describe("OsTopBar", () => {
  it("renders the logo menu and nav links", () => {
    render(<OsTopBar />);

    expect(screen.getByRole("button", { name: "Klynt" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Docs" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: "Get started" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chat" })).toBeInTheDocument();
  });
});
