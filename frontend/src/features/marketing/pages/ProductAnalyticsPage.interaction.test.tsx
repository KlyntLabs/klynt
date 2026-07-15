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

    expect(screen.getByText("bun add @klynt/js")).toBeInTheDocument();
    // Astryx exposes IconButton's `label` as the accessible name (aria-label), not a title attr.
    const copyButton = screen.getByRole("button", { name: "Copy" });
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

  it("visits every slide to render all slide components", async () => {
    const user = userEvent.setup();
    render(<Default />);

    const slideExpectations = [
      "Press → to start",
      "Track everything that matters",
      "Everything you need",
      "Autocapture — data without the setup",
      "Your data, your rules",
      "Simple, usage-based pricing",
      "Works with your stack",
      "Ready to understand your users?",
    ];

    for (let i = 0; i < slideExpectations.length; i++) {
      if (i > 0) {
        await user.click(screen.getByRole("button", { name: "Next" }));
      }
      await waitFor(() => {
        expect(screen.getByText(`${i + 1} / 8`)).toBeInTheDocument();
      });
      expect(screen.getByText(slideExpectations[i])).toBeInTheDocument();
    }
  });

  it("navigates slides with keyboard shortcuts", async () => {
    const user = userEvent.setup();
    render(<Default />);

    expect(screen.getByText("1 / 8")).toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    await waitFor(() => {
      expect(screen.getByText("2 / 8")).toBeInTheDocument();
    });

    await user.keyboard("{End}");
    await waitFor(() => {
      expect(screen.getByText("8 / 8")).toBeInTheDocument();
    });

    await user.keyboard("{Home}");
    await waitFor(() => {
      expect(screen.getByText("1 / 8")).toBeInTheDocument();
    });

    await user.keyboard("{ArrowLeft}");
    await waitFor(() => {
      expect(screen.getByText("1 / 8")).toBeInTheDocument();
    });
  });
});
