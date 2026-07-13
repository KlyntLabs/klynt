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

    // Astryx's TabList does NOT implement the ARIA tabs pattern: no role="tab"/"tablist".
    // It exposes tabs as buttons with aria-current="page" and a roving tabindex — its source
    // notes the tab roles would trip an axe aria-allowed-attr violation. There is no
    // alternative component, so query by button. Accessible names carry a duplicated label
    // (Astryx renders a hidden bold copy to reserve width), hence the regex.
    await user.click(screen.getByRole("button", { name: /^Roadmap/ }));
    expect(
      screen.getByText("Coming soon — this section is under construction")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Careers/ }));
    expect(
      screen.getByText("Coming soon — this section is under construction")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^About/ }));
    await waitFor(() => {
      expect(screen.getByText("James Hawkins")).toBeInTheDocument();
    });
  });
});
