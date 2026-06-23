import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import ForgotPasswordPage from "./forgot-password-page";

describe("ForgotPasswordPage", () => {
  it("renders forgot password form", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText(/reset password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });
});
