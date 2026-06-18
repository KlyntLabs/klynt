import { AppRouter } from "@/core/routing/app-router";
import { render, screen } from "@testing-library/react";

describe("App", () => {
  it("renders the home page", () => {
    render(<AppRouter />);
    expect(screen.getByText("Welcome to Klynt")).toBeInTheDocument();
  });
});
