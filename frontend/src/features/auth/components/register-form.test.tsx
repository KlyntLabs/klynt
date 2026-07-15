import { screen, waitFor, within } from "@testing-library/react";
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
    expect(await screen.findByText(/username is required/i)).toBeInTheDocument();
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
    await user.type(screen.getByLabelText(/username/i), "ada_lovelace");
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

    const { container } = render(<RegisterForm />);
    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/username/i), "ada_lovelace");
    await user.type(screen.getByLabelText(/email/i), "duplicate@example.com");
    await user.type(screen.getByLabelText(/password/i), "Str0ng!pass");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    // A conflict puts the API's message in two places: inline on the form (here) and, from
    // `useRegister`'s own `onError`, in a toast. It always has — the toast used to be a store
    // plus a fixed container, now it is Astryx's viewport — but the toast used to win the race
    // and satisfy a document-wide `findByText` on its own. This test is about the *inline*
    // error, so it now looks only inside the form.
    const form = within(container.querySelector("form") as HTMLElement);
    expect(
      await form.findByText(/email already registered/i, {}, { timeout: 5000 })
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
    await user.type(screen.getByLabelText(/username/i), "ada_lovelace");
    await user.type(screen.getByLabelText(/email/i), "bad@example.com");
    await user.type(screen.getByLabelText(/password/i), "Str0ng!pass");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    // Two alerts, both correct: the inline Banner on the form and the error Toast (which only
    // became an `alert` once it moved onto Astryx — the hand-rolled toast was a polite
    // <output>). Assert the message is announced, not that exactly one thing announces it.
    const alerts = await screen.findAllByRole("alert");

    expect(alerts.some((alert) => /invalid input/i.test(alert.textContent ?? ""))).toBe(true);
  });
});
