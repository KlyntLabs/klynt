import { composeStories } from "@storybook/react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import * as stories from "./AboutPage.stories";

const { Default } = composeStories(stories);

describe("AboutPage interactions", () => {
  it("renders the about tab by default", () => {
    render(<Default />);
    expect(screen.getByText("James Hawkins")).toBeInTheDocument();
    expect(
      screen.getByText("We're here to help product engineers build successful products")
    ).toBeInTheDocument();
  });

  it("switches tabs and shows coming soon placeholders", async () => {
    const user = userEvent.setup();
    render(<Default />);

    await user.click(screen.getByRole("tab", { name: "Roadmap" }));
    expect(
      screen.getByText("Coming soon — this section is under construction")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Careers" }));
    expect(
      screen.getByText("Coming soon — this section is under construction")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "About" }));
    await waitFor(() => {
      expect(screen.getByText("James Hawkins")).toBeInTheDocument();
    });
  });
});
