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

    await user.click(screen.getByText("bad-logo-1.svg").parentElement as HTMLElement);
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

    await user.click(screen.getByText("ceo-browser-history.csv").parentElement as HTMLElement);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    await waitFor(() => {
      expect(within(dialog).getByText("Nice try!")).toBeInTheDocument();
    });
  });
});
