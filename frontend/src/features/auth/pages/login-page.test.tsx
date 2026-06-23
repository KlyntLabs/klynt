import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import LoginPage from "./login-page";

describe("LoginPage", () => {
  it("renders login form", () => {
    render(<LoginPage />);
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });
});
