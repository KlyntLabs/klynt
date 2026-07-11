import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";

vi.mock("@/features/desktop/apps", () => ({
  marketingRegistry: {
    apps: [{ route: "/known", component: () => <div>Known marketing app</div> }],
  },
}));

// Imported after the mock so the shell reads the stubbed registry.
import { MarketingShell } from "./MarketingShell";

describe("MarketingShell", () => {
  it("renders the registered app component for a matching route", async () => {
    render(<MarketingShell route="/known" />);

    expect(await screen.findByText("Known marketing app")).toBeInTheDocument();
  });

  it("renders the not-found page when no app matches the route", async () => {
    render(<MarketingShell route="/no-such-route" />);

    expect(await screen.findByText(/Page not found/i)).toBeInTheDocument();
  });
});
