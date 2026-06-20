import { composeStories } from "@storybook/react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import * as stories from "./HomePage.stories";

const { Default } = composeStories(stories);

describe("HomePage interactions", () => {
  it("copies the install command and shows a success checkmark", async () => {
    const user = userEvent.setup();
    render(<Default />);

    const copyButton = screen.getByTitle("Copy to clipboard");
    expect(copyButton.querySelector(".lucide-copy")).toBeInTheDocument();

    await user.click(copyButton);

    await waitFor(() => {
      expect(copyButton.querySelector(".lucide-check")).toBeInTheDocument();
    });
  });

  it("switches content tabs", async () => {
    const user = userEvent.setup();
    render(<Default />);

    await user.click(screen.getByRole("button", { name: "One place for product data" }));
    expect(screen.getByText("Build better products with better data")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Debug & fix issues" }));
    expect(screen.getByText("Debug & fix issues faster")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Test & roll out changes" }));
    expect(screen.getByText("Ship features safely & get feedback")).toBeInTheDocument();
  });

  it("shuffles customer logos", async () => {
    const user = userEvent.setup();
    render(<Default />);

    const shuffleButton = screen.getByRole("button", { name: "Shuffle companies" });
    await user.click(shuffleButton);
    expect(screen.getByText("Who's using PostHog?")).toBeInTheDocument();
  });

  it("clicks hero action links without crashing", async () => {
    const user = userEvent.setup();
    render(<Default />);

    await user.click(screen.getByRole("button", { name: "Get started - free" }));
    await user.click(screen.getByRole("button", { name: "Install with AI" }));
    await user.click(screen.getByRole("button", { name: "MCP" }));
    expect(screen.getByText("The new way to build products")).toBeInTheDocument();
  });
});
