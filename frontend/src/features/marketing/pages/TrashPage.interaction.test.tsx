import { composeStories } from "@storybook/react";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import * as stories from "./TrashPage.stories";

const { Default } = composeStories(stories);

describe("TrashPage interactions", () => {
  it("opens and closes the item detail dialog", async () => {
    const user = userEvent.setup();
    render(<Default />);

    // The tile is an Astryx ClickableCard: a real button whose accessible name is the filename,
    // so the click target is queryable by role+name instead of by walking up from the text node.
    await user.click(screen.getByRole("button", { name: "bad-logo-1.svg" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Our first logo attempt/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("shows redacted content in the dialog", async () => {
    const user = userEvent.setup();
    render(<Default />);

    await user.click(screen.getByRole("button", { name: "ceo-browser-history.csv" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    await waitFor(() => {
      expect(within(dialog).getByText("Nice try!")).toBeInTheDocument();
    });
  });
});
