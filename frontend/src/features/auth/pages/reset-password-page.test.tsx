import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import ResetPasswordPage from "./reset-password-page";

describe("ResetPasswordPage", () => {
  it("renders reset password form with token", () => {
    render(<ResetPasswordPage />, { initialEntries: ["/?token=abc123"] });
    expect(screen.getByText(/set new password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset password/i })).toBeInTheDocument();
  });

  it("shows invalid token message when token is missing", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByRole("alert")).toHaveTextContent(/invalid or has expired/i);
  });
});
