import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import { UserMenu } from "./user-menu";

const mockUseAuthModule = vi.fn();

vi.mock("@/core/auth/auth-module", () => ({
  useAuthModule: () => mockUseAuthModule(),
}));

describe("UserMenu", () => {
  beforeEach(() => {
    mockUseAuthModule.mockReset();
  });

  it("renders Sign In when unauthenticated and not loading", () => {
    mockUseAuthModule.mockReturnValue({
      user: null,
      isLoading: false,
      logout: vi.fn(),
    });

    render(<UserMenu />);

    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("does not render Sign In while auth state is loading", () => {
    mockUseAuthModule.mockReturnValue({
      user: null,
      isLoading: true,
      logout: vi.fn(),
    });

    render(<UserMenu />);

    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument();
  });

  it("renders avatar and name when authenticated", () => {
    mockUseAuthModule.mockReturnValue({
      user: {
        id: "u-1",
        name: "Jayden Nguyen",
        email: "jayden@example.com",
        role: "student",
      },
      isLoading: false,
      logout: vi.fn(),
    });

    render(<UserMenu />);

    expect(screen.getByText("JN")).toBeInTheDocument();
    expect(screen.getByText("Jayden Nguyen")).toBeInTheDocument();
  });
});
