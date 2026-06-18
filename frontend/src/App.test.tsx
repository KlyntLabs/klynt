import { render, screen } from "@testing-library/react";
import { AppRoutes } from "@/routes";

describe("App", () => {
  it("renders the home page", () => {
    render(<AppRoutes />);
    expect(screen.getByText("Welcome to Klynt")).toBeInTheDocument();
  });
});
