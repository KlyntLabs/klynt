import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import * as stories from "./CommunityPage.stories";

const { Default } = composeStories(stories);

describe("CommunityPage interactions", () => {
  it("types an email into the newsletter form", async () => {
    const user = userEvent.setup();
    render(<Default />);

    const emailInput = screen.getByPlaceholderText("you@example.com");
    await user.type(emailInput, "test@example.com");
    expect(emailInput).toHaveValue("test@example.com");

    await user.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(emailInput).toHaveValue("test@example.com");
  });

  it("clicks community action buttons", async () => {
    const user = userEvent.setup();
    render(<Default />);

    await user.click(screen.getByRole("button", { name: "Join Slack community" }));
    expect(screen.getByText("Join our Slack")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Vote on the roadmap" }));
    expect(screen.getByText("Latest feature requests")).toBeInTheDocument();
  });
});
