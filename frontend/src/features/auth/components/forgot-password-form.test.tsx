import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw/server";
import { render } from "@/test/render";
import { ForgotPasswordForm } from "./forgot-password-form";

describe("ForgotPasswordForm", () => {
  it("validates email", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });

  it("shows success toast after submit", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/v1/auth/request-password-reset", () =>
        HttpResponse.json({ message: "If the email exists, a reset link has been sent" })
      )
    );

    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/email/i), "ada@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    // Astryx has no `success` type, so the confirmation is an `info` toast (`role="status"`).
    // The message is unchanged; the toast is simply no longer green.
    const body = await screen.findByText("If an account exists, a reset link has been sent.");
    expect(body.closest('[role="status"]')).not.toBeNull();
  });
});
