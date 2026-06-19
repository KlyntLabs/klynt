import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import HomePage from "./home-page";

function CurrentPath() {
  const location = useLocation();
  return <div data-testid="current-path">{location.pathname}</div>;
}

describe("HomePage", () => {
  it("renders the OS simulator hero", () => {
    render(
      <>
        <HomePage />
        <CurrentPath />
      </>
    );

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("navigates to register when the CTA is clicked", async () => {
    const user = userEvent.setup();
    render(
      <>
        <HomePage />
        <CurrentPath />
      </>
    );

    await user.click(screen.getByRole("button", { name: /get started/i }));

    expect(screen.getByTestId("current-path")).toHaveTextContent("/register");
  });
});
