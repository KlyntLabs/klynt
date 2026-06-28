import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { useToastStore } from "@/core/notifications/toast-store";
import { server } from "@/test/msw/server";
import { render } from "@/test/render";
import { ResetPasswordForm } from "./reset-password-form";

describe("ResetPasswordForm", () => {
  it("validates password requirements", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm token="token-123" />);
    await user.type(screen.getByLabelText(/^new password/i), "short");
    await user.type(screen.getByLabelText(/confirm new password/i), "short");
    await user.click(screen.getByRole("button", { name: /reset password/i }));
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it("shows success toast after reset", async () => {
    const user = userEvent.setup();
    useToastStore.getState().reset();
    server.use(
      http.post("/api/v1/auth/reset-password", () =>
        HttpResponse.json({ message: "Password reset successfully" })
      )
    );

    render(<ResetPasswordForm token="token-123" />);
    await user.type(screen.getByLabelText(/^new password/i), "Str0ng!pass");
    await user.type(screen.getByLabelText(/confirm new password/i), "Str0ng!pass");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(useToastStore.getState().toasts).toHaveLength(1);
    });
    expect(useToastStore.getState().toasts[0].type).toBe("success");
  });
});
