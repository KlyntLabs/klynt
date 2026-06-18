import * as registerApi from "@/features/auth/api/register";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RegisterForm } from "./register-form";

vi.mock("@/features/auth/api/register", () => ({
  register: vi.fn(),
}));

describe("RegisterForm", () => {
  it("submits valid data and displays the response", async () => {
    const mockRegister = vi.mocked(registerApi.register).mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Ada Lovelace",
      email: "ada@example.com",
      role: "student",
      status: "pending_verification",
      createdAt: "2026-06-18T04:24:34Z",
    });

    render(<RegisterForm />);

    await userEvent.type(screen.getByLabelText(/name/i), "Ada Lovelace");
    await userEvent.type(screen.getByLabelText(/email/i), "ada@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "str0ng!passphrase");
    await userEvent.click(screen.getByLabelText(/terms/i));
    await userEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "str0ng!passphrase",
        role: "student",
        termsAccepted: true,
        termsVersion: "2026-06-18",
      });
    });

    expect(await screen.findByText(/550e8400/)).toBeInTheDocument();
  });
});
