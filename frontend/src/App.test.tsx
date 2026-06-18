import HomePage from "@/core/routing/home-page";
import { render } from "@/test/render";
import { screen } from "@testing-library/react";

describe("App", () => {
  it("renders the home page", () => {
    render(<HomePage />);
    expect(screen.getByText("Klynt")).toBeInTheDocument();
  });
});
