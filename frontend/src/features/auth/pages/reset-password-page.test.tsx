import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import ResetPasswordPage from "./reset-password-page";

function ResetPasswordRoutes() {
  return (
    <Routes>
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
    </Routes>
  );
}

describe("ResetPasswordPage", () => {
  it("renders the reset password app inside the kiosk desktop", () => {
    render(<ResetPasswordRoutes />, {
      initialEntries: ["/reset-password/abc123"],
    });
    expect(screen.getByRole("button", { name: /reset password/i })).toBeInTheDocument();
  });

  it("shows invalid token message when token is missing", () => {
    render(
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      </Routes>,
      { initialEntries: ["/reset-password"] }
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/invalid or has expired/i);
  });
});
