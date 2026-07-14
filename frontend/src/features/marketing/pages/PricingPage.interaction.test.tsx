import { composeStories } from "@storybook/react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import * as stories from "./PricingPage.stories";

const { Default } = composeStories(stories);

describe("PricingPage interactions", () => {
  it("toggles between free and scale plan tabs", async () => {
    const user = userEvent.setup();
    render(<Default />);

    expect(screen.getByText("Free tier on all plans")).toBeInTheDocument();

    // The plan toggle is an Astryx SegmentedControl: a single-select input, so its segments are
    // radios in a radiogroup rather than the plain buttons the old markup used.
    await user.click(screen.getByRole("radio", { name: "Scale" }));
    expect(screen.getByText("Scale plan")).toBeInTheDocument();
    expect(screen.getByText("$199")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Free" }));
    expect(screen.getByText("Free tier on all plans")).toBeInTheDocument();
  });

  it("updates calculator cost via number inputs", async () => {
    const user = userEvent.setup();
    render(<Default />);

    const usageInputs = screen.getAllByLabelText("Usage amount");
    const productAnalyticsInput = usageInputs[0];

    await user.clear(productAnalyticsInput);
    await user.type(productAnalyticsInput, "2000000");

    await waitFor(() => {
      expect(productAnalyticsInput).toHaveValue("2.0M");
    });
    expect(screen.getAllByText("$50.00").length).toBeGreaterThanOrEqual(1);
  });

  it("adjusts usage with the slider", async () => {
    const user = userEvent.setup();
    render(<Default />);

    const productAnalyticsThumb = screen.getByLabelText("Product Analytics");
    productAnalyticsThumb.focus();
    await user.keyboard("{ArrowRight}");

    await waitFor(() => {
      const productAnalyticsInput = screen.getAllByLabelText("Usage amount")[0];
      expect(productAnalyticsInput).toHaveValue("600K");
    });
  });

  it("expands FAQ accordion items", async () => {
    const user = userEvent.setup();
    render(<Default />);

    await user.click(
      screen.getByRole("button", { name: "What happens when I exceed my free tier?" })
    );
    await waitFor(() => {
      expect(screen.getByText(/You only pay for usage beyond the free tier/)).toBeInTheDocument();
    });
  });
});
