import { composeStories } from "@storybook/react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import * as stories from "./ProductAnalyticsPage.stories";

const { Default } = composeStories(stories);

describe("ProductAnalyticsPage interactions", () => {
  it("navigates slides with next, prev, and thumbnail dots", async () => {
    const user = userEvent.setup();
    render(<Default />);

    expect(screen.getByText("Press → to start")).toBeInTheDocument();
    expect(screen.getByText("1 / 8")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("2 / 8")).toBeInTheDocument();
    });
    expect(screen.getByText("Track everything that matters")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Prev" }));
    await waitFor(() => {
      expect(screen.getByText("1 / 8")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /6 Pricing/ }));
    await waitFor(() => {
      expect(screen.getByText("6 / 8")).toBeInTheDocument();
    });
    expect(screen.getByText("Simple, usage-based pricing")).toBeInTheDocument();
  });

  it("navigates to the CTA slide and clicks the copy button", async () => {
    const user = userEvent.setup();
    render(<Default />);

    await user.click(screen.getByRole("button", { name: /8 Get Started/ }));
    await waitFor(() => {
      expect(screen.getByText("8 / 8")).toBeInTheDocument();
    });

    expect(screen.getByText("npm install posthog-js")).toBeInTheDocument();
    const copyButton = screen.getAllByTitle("Copy")[0];
    await user.click(copyButton);
    expect(copyButton).toBeInTheDocument();
  });

  it("clicks toolbar buttons", async () => {
    const user = userEvent.setup();
    render(<Default />);

    await user.click(screen.getByRole("button", { name: "Export PDF" }));
    await user.click(screen.getByRole("button", { name: "Present" }));
    await user.click(screen.getByRole("button", { name: "Get started — free" }));
    expect(screen.getByText("1 / 8")).toBeInTheDocument();
  });
});
