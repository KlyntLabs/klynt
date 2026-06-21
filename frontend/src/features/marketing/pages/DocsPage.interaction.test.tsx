import { composeStories } from "@storybook/react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import * as stories from "./DocsPage.stories";

const { Default } = composeStories(stories);

describe("DocsPage interactions", () => {
  it("types into the search bar and clicks Ask AI", async () => {
    const user = userEvent.setup();
    render(<Default />);

    const searchInput = screen.getByPlaceholderText("Search the docs...");
    await user.type(searchInput, "autocapture");
    await waitFor(() => {
      expect(searchInput).toHaveValue("autocapture");
    });

    await user.click(screen.getByRole("button", { name: "Ask AI" }));
    expect(searchInput).toHaveValue("autocapture");
  });

  it("toggles doc accordion sections", async () => {
    const user = userEvent.setup();
    render(<Default />);

    expect(screen.getByText("Install and configure")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Integration" }));
    await waitFor(() => {
      expect(screen.queryByText("Install and configure")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Developer apps" }));
    await waitFor(() => {
      expect(screen.getByText("Product Analytics")).toBeInTheDocument();
    });
  });
});
