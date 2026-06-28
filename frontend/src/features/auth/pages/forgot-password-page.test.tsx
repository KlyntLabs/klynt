import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import ForgotPasswordPage from "./forgot-password-page";

describe("ForgotPasswordPage", () => {
  it("renders the forgot password app inside the kiosk desktop", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to login/i })).toBeInTheDocument();
  });
});
