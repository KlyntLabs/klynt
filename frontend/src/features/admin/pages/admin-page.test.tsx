import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import { render } from "@/test/render";
import AdminPage from "./admin-page";

const mockUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "admin@example.com",
  username: "admin",
  name: "Admin User",
  role: "admin" as const,
  status: "active" as const,
  createdAt: "2024-01-01T00:00:00Z",
};

describe("AdminPage", () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it("renders the admin desktop", () => {
    useAuthStore.getState().setSession(mockUser);
    render(<AdminPage />);

    expect(screen.getByText("User Management")).toBeInTheDocument();
  });
});
