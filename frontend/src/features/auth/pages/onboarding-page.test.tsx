import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import OnboardingPage from "./onboarding-page";

describe("OnboardingPage", () => {
  it("renders create and join tabs", () => {
    render(<OnboardingPage />);

    expect(screen.getByText(/welcome to klynt/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /create workspace/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /join workspace/i })).toBeInTheDocument();
  });

  it("creates a tenant from the create tab", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    await user.type(screen.getByLabelText(/tenant name/i), "Acme School");
    await user.type(screen.getByLabelText(/tenant slug/i), "acme-school");
    await user.click(screen.getByRole("button", { name: /create tenant/i }));

    expect(await screen.findByText(/welcome to klynt/i)).toBeInTheDocument();
  });

  it("joins a tenant with an invite code", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    await user.click(screen.getByRole("tab", { name: /join workspace/i }));

    await user.type(screen.getByLabelText(/invite code/i), "invite-123");
    await user.click(screen.getByRole("button", { name: /join workspace/i }));

    expect(await screen.findByText(/welcome to klynt/i)).toBeInTheDocument();
  });

  it("shows an error for an invalid invite code", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    await user.click(screen.getByRole("tab", { name: /join workspace/i }));

    await user.type(screen.getByLabelText(/invite code/i), "invalid");
    await user.click(screen.getByRole("button", { name: /join workspace/i }));

    expect(await screen.findByText(/invalid or expired invite/i)).toBeInTheDocument();
  });
});
