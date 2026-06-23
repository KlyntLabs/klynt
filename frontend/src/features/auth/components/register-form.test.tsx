import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw/server";
import { render } from "@/test/render";
import { RegisterForm } from "./register-form";

describe("RegisterForm", () => {
  it("validates required fields", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it("submits valid registration", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/v1/auth/register", () =>
        HttpResponse.json({ data: "550e8400-e29b-41d4-a716-446655440000" }, { status: 201 })
      )
    );

    render(<RegisterForm />);
    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/password/i), "Str0ng!pass");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /create account/i })).not.toBeDisabled();
    });
  });

  it("shows inline error for duplicate email", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/v1/auth/register", () =>
        HttpResponse.json(
          { success: false, code: "conflict", error: "email already registered" },
          { status: 409 }
        )
      )
    );

    render(<RegisterForm />);
    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/email/i), "duplicate@example.com");
    await user.type(screen.getByLabelText(/password/i), "Str0ng!pass");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/email already registered/i, {}, { timeout: 5000 })
    ).toBeInTheDocument();
  });

  it("shows a root error for invalid request responses", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/v1/auth/register", () =>
        HttpResponse.json(
          { success: false, code: "bad_request", error: "invalid input" },
          { status: 400 }
        )
      )
    );

    render(<RegisterForm />);
    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/email/i), "bad@example.com");
    await user.type(screen.getByLabelText(/password/i), "Str0ng!pass");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid input/i);
  });
});
