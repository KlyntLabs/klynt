import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { OsTopBar } from "./os-top-bar";

describe("OsTopBar", () => {
  it("renders the logo menu, nav menus, and action buttons", () => {
    render(<OsTopBar />);

    expect(screen.getByRole("button", { name: "Klynt" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Docs" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Community" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Courses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Teachers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get started" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chat" })).toBeInTheDocument();
  });
});
