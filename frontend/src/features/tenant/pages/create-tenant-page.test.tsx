import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import CreateTenantPage from "./create-tenant-page";

const navigateExternal = vi.fn();
vi.mock("@/core/auth/external-redirect", () => ({
  navigateExternal: (...args: string[]) => navigateExternal(...args),
}));

vi.mock("../components/CreateTenantForm", () => ({
  CreateTenantForm: ({ onSuccess }: { onSuccess: () => void }) => (
    <button data-testid="create-tenant-form" onClick={onSuccess} type="button">
      Form
    </button>
  ),
}));

describe("CreateTenantPage", () => {
  it("renders the create tenant card", () => {
    render(<CreateTenantPage />);
    expect(screen.getByTestId("create-tenant-form")).toBeInTheDocument();
  });

  it("navigates to admin url on success", () => {
    render(<CreateTenantPage />);
    fireEvent.click(screen.getByTestId("create-tenant-form"));
    expect(navigateExternal).toHaveBeenCalled();
  });
});
