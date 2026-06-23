import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import { server } from "@/test/msw/server";
import { render } from "@/test/render";
import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  it("validates required fields", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: /log in/i }));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });

  it("submits valid credentials", async () => {
    const user = userEvent.setup();
    useAuthStore.getState().reset();
    server.use(
      http.post("/api/v1/auth/login", () =>
        HttpResponse.json({
          data: {
            user: {
              id: "u-1",
              email: "ada@example.com",
              full_name: "Ada Lovelace",
              role: "student",
              status: "active",
              created_at: "2024-01-01T00:00:00Z",
            },
          },
        })
      )
    );

    render(<LoginForm />);
    await user.type(screen.getByLabelText(/email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/password/i), "Str0ng!pass");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  it("shows root error on bad request", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/v1/auth/login", () =>
        HttpResponse.json(
          { success: false, code: "bad_request", error: "invalid credentials" },
          { status: 400 }
        )
      )
    );

    render(<LoginForm />);
    await user.type(screen.getByLabelText(/email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/password/i), "Str0ng!pass");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid credentials/i);
  });
});
