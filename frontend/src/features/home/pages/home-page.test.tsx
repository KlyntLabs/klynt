import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import HomePage from "./home-page";

describe("HomePage", () => {
  it("renders the OS simulator hero", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "Klynt" })).toBeInTheDocument();
    expect(
      screen.getByText("The foundation-phase education platform, built like an OS.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get started free" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register" })).toBeInTheDocument();
  });
});
