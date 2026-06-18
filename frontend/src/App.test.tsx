import { AppRoutes } from "@/routes";
import { render, screen } from "@testing-library/react";

describe("App", () => {
  it("renders the home page", () => {
    render(<AppRoutes />);
    expect(screen.getByText("Welcome to Klynt")).toBeInTheDocument();
  });
});
