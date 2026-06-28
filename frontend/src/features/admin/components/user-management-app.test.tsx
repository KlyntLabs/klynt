import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import UserManagementApp from "./user-management-app";

describe("UserManagementApp", () => {
  it("renders the translated title and description", async () => {
    render(<UserManagementApp />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /user management/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/admin user management mini-app/i)).toBeInTheDocument();
  });
});
