import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterForm } from "./register-form";
import { render } from "@/test/render";

describe("RegisterForm", () => {
  it("validates required fields", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(await screen.findByText(/at least 12 characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/must accept the terms/i)).toBeInTheDocument();
  });

  it("submits valid student registration", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/password/i), "str0ng!passphrase");
    await user.click(screen.getByLabelText(/i agree/i));
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /create account/i })).not.toBeDisabled();
    });
  });

  it("shows inline error for duplicate email", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/email/i), "duplicate@example.com");
    await user.type(screen.getByLabelText(/password/i), "str0ng!passphrase");
    await user.click(screen.getByLabelText(/i agree/i));
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
  });
});
