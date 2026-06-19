import { screen } from "@testing-library/react";
import HomePage from "@/core/routing/home-page";
import { render } from "@/test/render";

describe("App", () => {
  it("renders the home page", () => {
    render(<HomePage />);
    expect(screen.getByText("Klynt")).toBeInTheDocument();
  });
});
