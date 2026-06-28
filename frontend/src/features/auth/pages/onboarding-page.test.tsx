import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { navigateExternal } from "@/core/auth/external-redirect";
import { render } from "@/test/render";
import OnboardingPage from "./onboarding-page";

vi.mock("@/core/auth/external-redirect", () => ({
  navigateExternal: vi.fn(),
  isExternalUrl: vi.fn(() => true),
  ExternalNavigate: ({ to }: { to: string }) => <div>{to}</div>,
}));

function OnboardingRoutes() {
  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
    </Routes>
  );
}

describe("OnboardingPage", () => {
  it("renders create and join tabs", () => {
    render(<OnboardingRoutes />, { initialEntries: ["/onboarding"] });

    expect(screen.getByText(/welcome to klynt/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /create workspace/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /join workspace/i })).toBeInTheDocument();
  });

  it("navigates to admin dashboard after creating a tenant", async () => {
    const user = userEvent.setup();
    render(<OnboardingRoutes />, { initialEntries: ["/onboarding"] });

    await user.type(screen.getByLabelText(/tenant name/i), "Acme School");
    await user.type(screen.getByLabelText(/tenant slug/i), "acme-school");
    await user.click(screen.getByRole("button", { name: /create tenant/i }));

    await vi.waitFor(() =>
      expect(navigateExternal).toHaveBeenCalledWith(
        expect.stringMatching(/^http:\/\/admin\.localhost(:\d+)?\/$/)
      )
    );
  });

  it("navigates to admin dashboard after joining with an invite code", async () => {
    const user = userEvent.setup();
    render(<OnboardingRoutes />, { initialEntries: ["/onboarding"] });

    await user.click(screen.getByRole("tab", { name: /join workspace/i }));

    await user.type(screen.getByLabelText(/invite code/i), "invite-123");
    await user.click(screen.getByRole("button", { name: /join workspace/i }));

    await vi.waitFor(() =>
      expect(navigateExternal).toHaveBeenCalledWith(
        expect.stringMatching(/^http:\/\/admin\.localhost(:\d+)?\/$/)
      )
    );
  });

  it("shows an error for an invalid invite code", async () => {
    const user = userEvent.setup();
    render(<OnboardingRoutes />, { initialEntries: ["/onboarding"] });

    await user.click(screen.getByRole("tab", { name: /join workspace/i }));

    await user.type(screen.getByLabelText(/invite code/i), "invalid");
    await user.click(screen.getByRole("button", { name: /join workspace/i }));

    expect(await screen.findByText(/invalid or expired invite/i)).toBeInTheDocument();
  });
});
